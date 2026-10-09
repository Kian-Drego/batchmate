import { toast } from 'sonner';
import { DatabaseZap, RefreshCw } from 'lucide-react';
import { useRunScrape, useScholarships, useScrapeRuns } from '../lib/queries';
import { relativeTime } from '../lib/format';
import { Alert, Badge, Button, EmptyState, ListSkeleton, PageHeader, Stat } from '../components/ui';

const STATUS_TONE = { success: 'mint', partial: 'warn', failed: 'danger', skipped: 'neutral' } as const;

export default function AdminPage() {
  const runs = useScrapeRuns(true);
  const scholarships = useScholarships();
  const scrape = useRunScrape();

  const lastRun = runs.data?.[0];

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Source audit"
        description="Every crawl writes an audit row per source. The nightly job runs at 00:00 IST."
        action={
          <Button
            onClick={() =>
              scrape.mutate(undefined, {
                onSuccess: (r) => toast.success(`${r.mode} crawl: ${r.totalUpserted} records upserted`),
                onError: (e) => toast.error(e.message),
              })
            }
            loading={scrape.isPending}
          >
            <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Run crawl</span>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Active scholarships" value={scholarships.data?.length ?? '—'} tone="accent" />
        <Stat label="Last crawl" value={lastRun ? relativeTime(lastRun.started_at) : '—'} hint={lastRun?.mode} />
      </div>

      {runs.error && <Alert>{(runs.error as Error).message}</Alert>}
      {runs.isLoading ? (
        <ListSkeleton rows={4} />
      ) : !runs.data?.length ? (
        <EmptyState icon={DatabaseZap} title="No crawl runs yet" description="Run a crawl to populate the audit trail." />
      ) : (
        <ul className="card divide-y divide-line">
          {runs.data.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.source_name}</div>
                  <div className="truncate text-[12px] text-fg-faint">
                    {relativeTime(r.started_at)} · {r.mode} · {r.duration_ms} ms
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  <div className="mt-1 font-mono text-[12px] tabular-nums text-fg-muted">
                    {r.records_upserted}/{r.records_found} rec
                  </div>
                </div>
              </div>
              {r.error && <p className="mt-1.5 text-[12px] text-warn">{r.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
