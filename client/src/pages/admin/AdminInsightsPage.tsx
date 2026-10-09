import { useInsights } from '../../lib/queries';
import { INCOME_LABELS } from '../../lib/constants';
import { Empty, ListSkeleton, Notice, PageTitle, Stat, Surface, cn } from '../../components/ui';

const BAR_TONES = ['bg-peach-ink', 'bg-sky-ink', 'bg-sage-ink', 'bg-lilac-ink'];

function Bars({ title, rows, labels, tone }: { title: string; rows: { key: string; total: number; awarded?: number }[]; labels?: Record<string, string>; tone: number }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Surface className="p-6">
      <h2 className="mb-5 text-[19px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[14px] text-ink-2">Not enough data yet.</p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="mb-1.5 flex justify-between gap-3 text-[14px]">
                <span className="truncate font-medium">{labels?.[r.key] ?? r.key}</span>
                <span className="num shrink-0 text-ink-2">
                  {r.total}
                  {r.awarded ? <span className="text-sage-ink"> · {r.awarded} won</span> : null}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-sunken shadow-well">
                <div className={cn('h-full origin-left rounded-full transition-transform duration-700 ease-out', BAR_TONES[tone % BAR_TONES.length])} style={{ transform: `scaleX(${r.total / max})` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

export default function AdminInsightsPage() {
  const { data, isLoading, error } = useInsights();

  return (
    <div>
      <PageTitle kicker="Admins only · anonymised aggregates" title="Insights" sub="Groups smaller than three people are folded into “Other” so no individual can be singled out." />
      {error && <Notice tone="rose">{(error as Error).message}</Notice>}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !data || data.totals.profiles === 0 ? (
        <Empty title="No data yet" description="Insights appear as students join." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Profiles" value={data.totals.profiles} />
            <Stat label="Applications" value={data.totals.applicationsStarted} />
            <Stat label="Submitted" value={data.totals.submitted} tone="lilac" />
            <Stat label="Awarded" value={data.totals.awarded} tone="sage" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
            <Bars title="By state" rows={data.byState} tone={0} />
            <Bars title="By family income" rows={data.byIncomeTier} labels={INCOME_LABELS} tone={1} />
            <Bars title="By level of study" rows={data.byDegree} tone={2} />
            <Bars title="Awards by type" rows={data.awardedByType.map((r) => ({ key: r.key, total: r.count }))} tone={3} />
          </div>
        </>
      )}
    </div>
  );
}
