import { BarChart3, ShieldCheck } from 'lucide-react';
import { useInsights } from '../lib/queries';
import { INCOME_LABELS } from '../lib/constants';
import { Alert, Card, EmptyState, ListSkeleton, PageHeader, Stat } from '../components/ui';

function BarList({ title, rows, labels }: { title: string; rows: { key: string; total: number; awarded?: number }[]; labels?: Record<string, string> }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[15px] font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted">Not enough data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate font-medium">{labels?.[r.key] ?? r.key}</span>
                <span className="shrink-0 font-mono tabular-nums text-fg-muted">
                  {r.total}
                  {r.awarded ? <span className="text-mint"> · {r.awarded} won</span> : null}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full origin-left rounded-full bg-accent transition-transform duration-700 ease-out" style={{ transform: `scaleX(${r.total / max})` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function InsightsPage() {
  const { data, isLoading, error } = useInsights();

  return (
    <div>
      <PageHeader eyebrow="Community" title="Insights" description="How students like you are doing. Fully anonymised — only group totals, never individuals." />
      <p className="mb-4 flex items-start gap-2 text-[12px] text-fg-faint">
        <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-mint" /> Groups with fewer than 3 people are merged into “Other”.
      </p>
      {error && <Alert>{(error as Error).message}</Alert>}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !data || data.totals.profiles === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Insights appear as more students join." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Students" value={data.totals.profiles} tone="accent" />
            <Stat label="Applications" value={data.totals.applicationsStarted} />
            <Stat label="Submitted" value={data.totals.submitted} tone="hot" />
            <Stat label="Awarded" value={data.totals.awarded} tone="mint" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <BarList title="By state" rows={data.byState} />
            <BarList title="By income" rows={data.byIncomeTier} labels={INCOME_LABELS} />
            <BarList title="By degree" rows={data.byDegree} />
            <BarList title="Awards by type" rows={data.awardedByType.map((r) => ({ key: r.key, total: r.count }))} />
          </div>
        </>
      )}
    </div>
  );
}
