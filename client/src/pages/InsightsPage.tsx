import { useEffect, useState } from 'react';
import { BarChart3, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import type { Insights } from '../lib/types';
import { Alert, Panel, Progress, SectionHeader, Spinner, Stat } from '../components/ui';

function BarList({
  title,
  rows,
  showAwarded,
}: {
  title: string;
  rows: { key: string; total: number; awarded?: number }[];
  showAwarded?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Panel className="p-5">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-faint">No data recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-ink-soft">
                <span className="truncate pr-2">{r.key}</span>
                <span className="data-value shrink-0">
                  {r.total}
                  {showAwarded && r.awarded ? ` · ${r.awarded} awarded` : ''}
                </span>
              </div>
              <Progress value={(r.total / max) * 100} tone="lavender" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Insights>('/analytics/insights')
      .then(setData)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Anonymised analytics"
        title="Demographic insights"
        description="Aggregated from the anonymised AnalyticsProfile collection. No name, email, phone or document link is present in this dataset."
      />

      <div className="mb-4">
        <Alert tone="info">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Buckets are keyed by state, income tier, target degree,
            category, gender and disability status only.
          </span>
        </Alert>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {data && (
        <>
          <Panel className="mb-6 grid grid-cols-2 gap-6 p-5 sm:grid-cols-5">
            <Stat label="Profiles" value={data.totals.profiles} />
            <Stat label="Started" value={data.totals.applicationsStarted} />
            <Stat label="Submitted" value={data.totals.submitted} />
            <Stat label="Awarded" value={data.totals.awarded} tone="eligible" />
            <Stat label="Rejected" value={data.totals.rejected} tone="caution" />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <BarList title="By state / domicile" rows={data.byState} showAwarded />
            <BarList title="By income tier" rows={data.byIncomeTier} />
            <BarList title="By target degree" rows={data.byDegree} />
            <BarList
              title="Awarded by scholarship category"
              rows={data.awardedByType.map((a) => ({ key: a.key, total: a.count }))}
            />
          </div>

          {data.totals.profiles === 0 && (
            <div className="mt-6 flex items-center gap-2 text-sm text-ink-faint">
              <BarChart3 className="h-4 w-4" /> Insights populate as passports are created and
              applications progress.
            </div>
          )}
        </>
      )}
    </div>
  );
}
