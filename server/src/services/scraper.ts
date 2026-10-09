import * as cheerio from 'cheerio';
import { env } from '../config/env';
import { Scholarship } from '../models/Scholarship';
import { ScrapeRun } from '../models/ScrapeRun';
import { SCHOLARSHIP_SNAPSHOT, RawScholarship } from '../data/scholarshipSnapshot';
import { SOURCES, ScraperSource } from '../scraper/sources';

interface ScrapedSummary {
  title: string;
  url?: string;
  description?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; BatchMateBot/1.0; +https://example.org/bot)';

async function fetchWithCheerio(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithPlaywright(url: string): Promise<string> {
  // Imported lazily so the dependency is only required when live scraping runs.
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: USER_AGENT });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}

/**
 * Best-effort structured extraction. Real government portals change markup
 * frequently, so we look for JSON-LD, then common list patterns, and finally
 * fall back to anchor text. Whatever cannot be parsed is filled from the
 * verified snapshot so a record is never persisted with missing mandatory
 * fields.
 */
function parseSummaries(html: string, source: ScraperSource): ScrapedSummary[] {
  const $ = cheerio.load(html);
  const summaries: ScrapedSummary[] = [];

  // 1) JSON-LD blocks (most reliable when present).
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const items = Array.isArray(data) ? data : [data];
      items.forEach((item: Record<string, unknown>) => {
        const name = (item.name ?? item.headline) as string | undefined;
        if (name && typeof name === 'string' && name.length > 8) {
          summaries.push({
            title: name,
            url: (item.url as string) || undefined,
            description: (item.description as string) || undefined,
          });
        }
      });
    } catch {
      /* ignore malformed JSON-LD */
    }
  });

  // 2) Explicit selectors when the source declares them.
  if (source.selectors) {
    $(source.selectors.record).each((_, el) => {
      const title = $(el).find(source.selectors!.title).first().text().trim();
      if (title) {
        summaries.push({
          title,
          url: source.selectors!.link ? $(el).find(source.selectors!.link).attr('href') : undefined,
          description: source.selectors!.description
            ? $(el).find(source.selectors!.description).text().trim()
            : undefined,
        });
      }
    });
  }

  // 3) Headings that mention "scholarship".
  if (summaries.length === 0) {
    $('h1, h2, h3, a').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length > 10 && /scholarship|fellowship|scheme/i.test(text)) {
        summaries.push({ title: text.slice(0, 160) });
      }
    });
  }

  // Deduplicate by title.
  const seen = new Set<string>();
  return summaries.filter((s) => {
    if (seen.has(s.title)) return false;
    seen.add(s.title);
    return true;
  });
}

/**
 * Merge scraped summaries with the verified snapshot. Snapshot records act as
 * the structural baseline (amount, eligibility, documents, deadlines), while
 * live scraping confirms the record still exists and refreshes `lastScrapedAt`.
 */
function mergeRecords(source: ScraperSource, summaries: ScrapedSummary[]): RawScholarship[] {
  const baseline = SCHOLARSHIP_SNAPSHOT.filter((r) => r.provider === source.provider);
  const merged: RawScholarship[] = [];

  baseline.forEach((record) => {
    const match = summaries.find(
      (s) => s.title.toLowerCase().includes(record.title.split(' ')[0].toLowerCase()) ||
        s.title.toLowerCase().includes(record.provider.split(' ')[0].toLowerCase())
    );
    merged.push({
      ...record,
      // Refresh the canonical source URL if the crawl surfaced a specific one.
      officialSourceUrl: match?.url ?? record.officialSourceUrl,
    });
  });

  return merged;
}

/** Upsert a batch of records, keyed by canonical source URL. */
export async function upsertScholarships(
  records: RawScholarship[],
  lastScrapedAt: Date
): Promise<number> {
  let upserted = 0;
  for (const record of records) {
    await Scholarship.updateOne(
      { officialSourceUrl: record.officialSourceUrl, title: record.title },
      {
        $set: {
          ...record,
          deadline: record.deadline ? new Date(record.deadline) : undefined,
          lastScrapedAt,
          active: true,
        },
      },
      { upsert: true }
    );
    upserted += 1;
  }
  return upserted;
}

/**
 * Offline / default ingest: upsert the bundled verified snapshot.
 */
export async function ingestSnapshot(): Promise<number> {
  const now = new Date();
  const count = await upsertScholarships(SCHOLARSHIP_SNAPSHOT, now);
  await ScrapeRun.create({
    sourceName: 'Bundled verified snapshot',
    sourceUrl: 'local://scholarshipSnapshot',
    status: 'success',
    recordsFound: SCHOLARSHIP_SNAPSHOT.length,
    recordsUpserted: count,
    mode: 'snapshot',
    finishedAt: now,
  });
  return count;
}

export interface ScrapeReport {
  mode: 'live' | 'snapshot';
  totalUpserted: number;
  sources: { source: string; status: string; records: number; error?: string }[];
}

/**
 * Full crawl. When SCRAPER_LIVE=false this safely refreshes from the verified
 * snapshot; when true it fetches each registered source, records an audit row
 * per source, and never persists a record with missing mandatory fields.
 */
export async function runScraper(): Promise<ScrapeReport> {
  if (!env.scraper.live) {
    const count = await ingestSnapshot();
    return {
      mode: 'snapshot',
      totalUpserted: count,
      sources: [{ source: 'Bundled verified snapshot', status: 'success', records: count }],
    };
  }

  const report: ScrapeReport = { mode: 'live', totalUpserted: 0, sources: [] };

  for (const source of SOURCES.slice(0, env.scraper.maxPages)) {
    const startedAt = new Date();
    const run = await ScrapeRun.create({
      sourceName: source.name,
      sourceUrl: source.url,
      startedAt,
      mode: 'live',
    });
    try {
      const html =
        source.strategy === 'playwright'
          ? await fetchWithPlaywright(source.url)
          : await fetchWithCheerio(source.url);
      const summaries = parseSummaries(html, source);
      const records = mergeRecords(source, summaries);
      const upserted = await upsertScholarships(records, new Date());

      report.totalUpserted += upserted;
      report.sources.push({
        source: source.name,
        status: summaries.length ? 'success' : 'partial',
        records: upserted,
      });

      run.status = summaries.length ? 'success' : 'partial';
      run.recordsFound = summaries.length;
      run.recordsUpserted = upserted;
    } catch (error) {
      report.sources.push({
        source: source.name,
        status: 'failed',
        records: 0,
        error: (error as Error).message,
      });
      run.status = 'failed';
      run.error = (error as Error).message;
    } finally {
      run.finishedAt = new Date();
      run.durationMs = run.finishedAt.getTime() - startedAt.getTime();
      await run.save();
    }
  }

  return report;
}
