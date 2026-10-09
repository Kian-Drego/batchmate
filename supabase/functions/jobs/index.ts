/**
 * Background jobs Edge Function.
 *   POST { task: 'scrape' }     -> refresh the scholarship catalogue
 *   POST { task: 'retention' }  -> remove documents past their retention window
 *
 * Callers: pg_cron (header `x-cron-secret: <CRON_SECRET>`) or a signed-in admin.
 *
 * Scrape modes (SCRAPER_LIVE):
 *   false (default) — ingest the bundled verified snapshot.
 *   true            — fetch static (cheerio) sources live to confirm records and
 *                     refresh source URLs; JS-rendered (playwright) portals are
 *                     recorded as `skipped` because Edge runtimes have no browser.
 */
import * as cheerio from 'npm:cheerio@1.0.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, handle, HttpError, json, requireUser, safeEqual } from '../_shared/http.ts';
import { ingestSnapshot, upsertScholarships } from '../_shared/catalogue.ts';
import { SCHOLARSHIP_SNAPSHOT, type RawScholarship } from '../_shared/snapshot.ts';
import { SOURCES, type ScraperSource } from '../_shared/sources.ts';

const USER_AGENT = 'Mozilla/5.0 (compatible; BatchMateBot/1.0; +https://batchmate.duckdns.org)';

async function authorize(req: Request, db: SupabaseClient): Promise<void> {
  const secret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('x-cron-secret');
  if (secret && provided && safeEqual(secret, provided)) return;
  const user = await requireUser(req, db);
  const { data } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (data?.role !== 'admin') throw new HttpError(403, 'Admin access required');
}

interface Summary {
  title: string;
  url?: string;
}

function parseSummaries(html: string, source: ScraperSource): Summary[] {
  const $ = cheerio.load(html);
  const out: Summary[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      for (const item of Array.isArray(data) ? data : [data]) {
        const name = item?.name ?? item?.headline;
        if (typeof name === 'string' && name.length > 8) out.push({ title: name, url: item.url || undefined });
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  });

  if (source.selectors) {
    const sel = source.selectors;
    $(sel.record).each((_, el) => {
      const title = $(el).find(sel.title).first().text().trim();
      if (title) out.push({ title, url: sel.link ? $(el).find(sel.link).attr('href') : undefined });
    });
  }

  if (out.length === 0) {
    $('h1, h2, h3, a').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length > 10 && /scholarship|fellowship|scheme/i.test(text)) {
        const href = $(el).attr('href');
        out.push({ title: text.slice(0, 160), url: href ? new URL(href, source.url).toString() : undefined });
      }
    });
  }

  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.title) ? false : (seen.add(s.title), true)));
}

function mergeRecords(source: ScraperSource, summaries: Summary[]): RawScholarship[] {
  return SCHOLARSHIP_SNAPSHOT.filter((r) => r.provider === source.provider).map((record) => {
    const firstWord = record.title.split(' ')[0].toLowerCase();
    const match = summaries.find((s) => s.title.toLowerCase().includes(firstWord));
    return { ...record, officialSourceUrl: match?.url?.startsWith('http') ? match.url : record.officialSourceUrl };
  });
}

async function scrape(db: SupabaseClient) {
  if (Deno.env.get('SCRAPER_LIVE') !== 'true') {
    const count = await ingestSnapshot(db);
    return { mode: 'snapshot', totalUpserted: count, sources: [{ source: 'Bundled verified snapshot', status: 'success', records: count }] };
  }

  const report = { mode: 'live', totalUpserted: 0, sources: [] as { source: string; status: string; records: number; error?: string }[] };
  for (const source of SOURCES) {
    const started = Date.now();
    const run: Record<string, unknown> = { source_name: source.name, source_url: source.url, mode: 'live' };
    try {
      if (source.strategy === 'playwright') {
        // No headless browser at the edge: keep snapshot data fresh instead.
        const upserted = await upsertScholarships(db, SCHOLARSHIP_SNAPSHOT.filter((r) => r.provider === source.provider));
        Object.assign(run, { status: 'skipped', records_upserted: upserted, error: 'JS-rendered portal; snapshot data refreshed' });
        report.totalUpserted += upserted;
        report.sources.push({ source: source.name, status: 'skipped', records: upserted });
        continue;
      }
      const res = await fetch(source.url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20000) });
      const summaries = parseSummaries(await res.text(), source);
      const upserted = await upsertScholarships(db, mergeRecords(source, summaries));
      const status = summaries.length ? 'success' : 'partial';
      Object.assign(run, { status, records_found: summaries.length, records_upserted: upserted });
      report.totalUpserted += upserted;
      report.sources.push({ source: source.name, status, records: upserted });
    } catch (err) {
      const message = (err as Error).message;
      Object.assign(run, { status: 'failed', error: message });
      report.sources.push({ source: source.name, status: 'failed', records: 0, error: message });
    } finally {
      run.finished_at = new Date().toISOString();
      run.duration_ms = Date.now() - started;
      await db.from('scrape_runs').insert(run);
    }
  }
  return report;
}

/**
 * Remove documents whose retention window has passed. Re-checks for active
 * applications so a document is never deleted while still in use.
 */
async function retention(db: SupabaseClient) {
  const { data: expired, error } = await db
    .from('passport_documents')
    .select('id, user_id, storage_key')
    .lte('retention_until', new Date().toISOString())
    .limit(500);
  if (error) throw error;

  let deleted = 0;
  const users = [...new Set((expired ?? []).map((d) => d.user_id))];
  for (const userId of users) {
    const { count } = await db
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'in', '("Awarded","Rejected")');
    if ((count ?? 0) > 0) continue;

    const docs = expired!.filter((d) => d.user_id === userId);
    await db.storage.from('documents').remove(docs.map((d) => d.storage_key));
    const { error: delError } = await db.from('passport_documents').delete().in('id', docs.map((d) => d.id));
    if (!delError) deleted += docs.length;
  }
  return { scanned: expired?.length ?? 0, deleted };
}

Deno.serve(
  handle(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const db = adminClient();
    await authorize(req, db);
    const { task } = await req.json().catch(() => ({}));
    if (task === 'scrape') return json(req, await scrape(db));
    if (task === 'retention') return json(req, await retention(db));
    throw new HttpError(400, 'Unknown task');
  })
);
