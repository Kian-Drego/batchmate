import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { useRunScrape, useScholarships, useScrapeRuns } from '../../lib/queries';
import { relativeTime } from '../../lib/format';
import { Button, Empty, ListSkeleton, Notice, PageTitle, Stat, Surface, Tag } from '../../components/ui';

const STATUS_TONE = { success: 'sage', partial: 'butter', failed: 'rose', skipped: 'neutral' } as const;

export default function AdminSourcesPage() {
  const runs = useScrapeRuns(true);
  const scholarships = useScholarships();
  const scrape = useRunScrape();
  const last = runs.data?.[0];

  return (
    <div>
      <PageTitle
        kicker="Catalogue refresh · nightly at 00:00 IST"
        title="Sources"
        action={
          <Button
            onClick={() =>
              scrape.mutate(undefined, {
                onSuccess: (r) => toast.success(`${r.mode} refresh: ${r.totalUpserted} records`),
                onError: (e) => toast.error(e.message),
              })
            }
            loading={scrape.isPending}
          >
            <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Refresh now</span>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Live scholarships" value={scholarships.data?.length ?? '–'} />
        <Stat label="Last refresh" value={last ? relativeTime(last.started_at) : '–'} hint={last?.mode} />
      </div>

      {runs.error && <Notice tone="rose">{(runs.error as Error).message}</Notice>}
      {runs.isLoading ? (
        <ListSkeleton rows={4} />
      ) : !runs.data?.length ? (
        <Empty title="No runs yet" description="Refresh once to start the audit trail." />
      ) : (
        <Surface className="divide-y divide-dashed divide-line overflow-hidden">
          {runs.data.map((r) => (
            <div key={r.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold">{r.source_name}</div>
                  <div className="truncate text-[12.5px] text-ink-3">
                    {relativeTime(r.started_at)} · {r.mode} · {r.duration_ms} ms
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag>
                  <div className="num mt-1 text-[12.5px] text-ink-3">{r.records_upserted} records</div>
                </div>
              </div>
              {r.error && <p className="mt-1.5 text-[12.5px] text-butter-ink">{r.error}</p>}
            </div>
          ))}
        </Surface>
      )}
    </div>
  );
}
