import { useEffect, useState } from 'react';
import { Play, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Alert, Badge, Button, EmptyState, Panel, SectionHeader, Spinner } from '../components/ui';
import { shortDate } from '../lib/format';

interface ScrapeRun {
  _id: string;
  sourceName: string;
  sourceUrl: string;
  startedAt: string;
  finishedAt?: string | null;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  recordsFound: number;
  recordsUpserted: number;
  durationMs: number;
  error?: string;
  mode: 'live' | 'snapshot';
}

export default function AdminPage() {
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const data = await api.get<{ runs: ScrapeRun[] }>('/scholarships/admin/scrape-runs');
    setRuns(data.runs);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const triggerScrape = async () => {
    setScraping(true);
    setError(null);
    setReport(null);
    try {
      const data = await api.post<{ mode: string; totalUpserted: number }>(
        '/scholarships/admin/scrape'
      );
      setReport(`Crawl (${data.mode}) upserted ${data.totalUpserted} records.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScraping(false);
    }
  };

  const statusTone = (status: ScrapeRun['status']) =>
    status === 'success' ? 'eligible' : status === 'failed' ? 'stop' : 'caution';

  return (
    <div>
      <SectionHeader
        eyebrow="Source audit trail"
        title="Scraper activity"
        description="Every source visited by the nightly crawl is logged with record counts, duration and errors. Default schedule: 00:00 IST (18:30 UTC)."
        action={
          <Button onClick={triggerScrape} loading={scraping}>
            <Play className="h-4 w-4" /> Run crawl now
          </Button>
        }
      />

      {report && (
        <div className="mb-4">
          <Alert tone="success">{report}</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No crawl runs recorded"
          description="Trigger a crawl to populate the audit trail."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  Source
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  Status
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  Mode
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  Found
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  Upserted
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  Duration
                </th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  Started
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run._id} className="border-b border-line-faint last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{run.sourceName}</div>
                    <div className="max-w-[260px] truncate text-xs text-ink-faint">
                      {run.sourceUrl}
                    </div>
                    {run.error && <div className="mt-0.5 text-xs text-stop">{run.error}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(run.status) as never}>{run.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={run.mode === 'live' ? 'lavender' : 'neutral'}>{run.mode}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right data-value">{run.recordsFound}</td>
                  <td className="px-4 py-3 text-right data-value">{run.recordsUpserted}</td>
                  <td className="px-4 py-3 text-right data-value">
                    {Math.round(run.durationMs / 100) / 10}s
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{shortDate(run.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
