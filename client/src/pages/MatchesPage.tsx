import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, GraduationCap, Search, Target } from 'lucide-react';
import { api } from '../lib/api';
import type { Match, MatchResponse } from '../lib/types';
import { deadlineLabel, inr } from '../lib/format';
import { MatchReasonList } from '../components/MatchReasons';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  Progress,
  SectionHeader,
  Spinner,
  TierBadge,
} from '../components/ui';

type FilterKey = 'all' | 'high' | 'possible' | 'info';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All matches' },
  { key: 'high', label: 'Highly eligible' },
  { key: 'possible', label: 'Possibly eligible' },
  { key: 'info', label: 'Needs information' },
];

export default function MatchesPage() {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .get<MatchResponse>('/passport/matches')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const list: Match[] = useMemo(() => {
    if (!data) return [];
    const base =
      filter === 'high'
        ? data.grouped.highlyEligible
        : filter === 'possible'
          ? data.grouped.possiblyEligible
          : filter === 'info'
            ? data.grouped.needsInfo
            : data.matches;
    const q = query.trim().toLowerCase();
    return q
      ? base.filter(
          (m) =>
            m.scholarship.title.toLowerCase().includes(q) ||
            m.scholarship.provider.toLowerCase().includes(q)
        )
      : base;
  }, [data, filter, query]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const counts: Record<FilterKey, number> = {
    all: data?.matches.length ?? 0,
    high: data?.grouped.highlyEligible.length ?? 0,
    possible: data?.grouped.possiblyEligible.length ?? 0,
    info: data?.grouped.needsInfo.length ?? 0,
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Hybrid matching engine"
        title="Matched scholarships"
        description="Hard eligibility filters applied first, then a weighted 0–100 fit score based on income closeness, academic standing and document readiness."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-card border px-3 py-2.5 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'border-line bg-inverse text-inverse-fg'
                  : 'border-line-faint bg-paper-raised text-ink-soft hover:bg-paper-sunken'
              }`}
            >
              <Filter className="h-3 w-3" aria-hidden />
              {f.label}
              <span className="data-value opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            className="input pl-9"
            placeholder="Search provider or scheme"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No scholarships in this view"
          description={
            filter === 'info'
              ? 'Great — no scheme is waiting on missing information.'
              : 'Adjust the filter, or complete your passport to unlock more matches.'
          }
          action={
            <Link to="/passport">
              <Button variant="secondary" size="sm">
                Open passport
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {list.map((m) => {
            const dl = deadlineLabel(m.scholarship.deadline);
            const tone = dl.tone === 'urgent' ? 'stop' : dl.tone === 'soon' ? 'caution' : 'neutral';
            return (
              <Panel key={m.scholarshipId} className="overflow-hidden">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                  {/* Score column */}
                  <div className="flex shrink-0 items-center gap-3 sm:w-40 sm:flex-col sm:items-start">
                    <div>
                      <div className="label-eyebrow">Fit score</div>
                      <div
                        className={`font-mono text-3xl font-semibold tabular-nums ${
                          m.fitScore >= 80 ? 'text-eligible' : 'text-caution'
                        }`}
                      >
                        {m.fitScore}
                        <span className="text-base text-ink-faint">/100</span>
                      </div>
                    </div>
                    <div className="w-full">
                      <Progress value={m.fitScore} tone={m.fitScore >= 80 ? 'eligible' : 'caution'} />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TierBadge tier={m.tier} />
                      {m.scholarship.aptitudeTestRequired && (
                        <Badge tone="lavender">
                          <GraduationCap className="h-3 w-3" /> Aptitude test
                        </Badge>
                      )}
                      <Badge tone={tone as never}>{dl.text}</Badge>
                    </div>
                    <Link
                      to={`/scholarships/${m.scholarshipId}`}
                      className="mt-2 block font-serif text-xl font-semibold text-ink hover:underline"
                    >
                      {m.scholarship.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                      <span>{m.scholarship.provider}</span>
                      <span className="data-value font-semibold text-ink">
                        {inr(m.scholarship.amount)}
                      </span>
                      <span className="text-ink-faint">{m.scholarship.type}</span>
                    </div>

                    <div className="mt-3 border-t border-line-faint pt-3">
                      <MatchReasonList reasons={m.reasons.slice(0, 4)} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-line-faint bg-paper-sunken/60 px-5 py-3">
                  <span className="text-xs text-ink-faint">
                    {m.reasons.length} match conditions evaluated
                  </span>
                  <Link to={`/scholarships/${m.scholarshipId}`}>
                    <Button size="sm">Review & apply</Button>
                  </Link>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
