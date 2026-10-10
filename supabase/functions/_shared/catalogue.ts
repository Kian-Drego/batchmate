import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { SCHOLARSHIP_SNAPSHOT, type RawScholarship } from './snapshot.ts';

/** Map a canonical scraper record onto a `scholarships` row. */
export function toRow(r: RawScholarship, lastScrapedAt: string) {
  return {
    provider: r.provider,
    title: r.title,
    type: r.type,
    amount: r.amount,
    amount_description: r.amountDescription ?? null,
    degree: r.degree,
    current_year_allowed: r.currentYearAllowed,
    income_limit: r.incomeLimit ?? null,
    marks_min: r.marksMin ?? null,
    category: r.category,
    state_domicile: r.stateDomicile,
    gender: r.gender,
    deadline: r.deadline ?? null,
    required_documents: r.requiredDocuments,
    selection_process: r.selectionProcess,
    aptitude_test_required: r.aptitudeTestRequired,
    disability_required: r.disabilityRequired ?? false,
    renewal_criteria: r.renewalCriteria ?? null,
    official_source_url: r.officialSourceUrl,
    last_scraped_at: lastScrapedAt,
    application_mode: r.applicationMode,
    external_portal_url: r.externalPortalUrl ?? null,
    application_steps: r.applicationSteps,
    description: r.description ?? null,
    exam_pattern: r.examPattern ?? null,
    tags: r.tags,
    active: true,
  };
}

/** Upsert records keyed by (provider, title). Returns the number written. */
export async function upsertScholarships(db: SupabaseClient, records: RawScholarship[]): Promise<number> {
  if (records.length === 0) return 0;
  const now = new Date().toISOString();
  const { error, count } = await db
    .from('scholarships')
    .upsert(records.map((r) => toRow(r, now)), { onConflict: 'provider,title', count: 'exact' });
  if (error) throw error;
  return count ?? records.length;
}

/** Offline/default ingest of the bundled verified snapshot, with an audit row. */
export async function ingestSnapshot(db: SupabaseClient): Promise<number> {
  const started = Date.now();
  const count = await upsertScholarships(db, SCHOLARSHIP_SNAPSHOT);
  await db.from('scrape_runs').insert({
    source_name: 'Bundled verified snapshot',
    source_url: 'local://scholarshipSnapshot',
    status: 'success',
    records_found: SCHOLARSHIP_SNAPSHOT.length,
    records_upserted: count,
    mode: 'snapshot',
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
  });
  return count;
}
