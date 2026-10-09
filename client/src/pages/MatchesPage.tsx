import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, Search, SlidersHorizontal, Wand2, X } from 'lucide-react';
import { SCHOLARSHIP_TYPES } from '../lib/constants';
import { useMatches, type Match } from '../lib/queries';
import ScholarshipCard from '../components/ScholarshipCard';
import { Alert, Button, ChipGroup, EmptyState, IconButton, Input, ListSkeleton, PageHeader, Segmented, Sheet, Toggle } from '../components/ui';

type TierKey = 'highly' | 'possibly' | 'needs';
type SortKey = 'fit' | 'deadline' | 'amount';

const SORTS: Record<SortKey, { label: string; fn: (a: Match, b: Match) => number }> = {
  fit: { label: 'Best fit', fn: (a, b) => b.fitScore - a.fitScore },
  deadline: {
    label: 'Deadline',
    fn: (a, b) =>
      (a.scholarship.deadline ? Date.parse(a.scholarship.deadline) : Infinity) -
      (b.scholarship.deadline ? Date.parse(b.scholarship.deadline) : Infinity),
  },
  amount: { label: 'Amount', fn: (a, b) => Number(b.scholarship.amount) - Number(a.scholarship.amount) },
};

export default function MatchesPage() {
  const { data, isLoading, error } = useMatches();
  const [params, setParams] = useSearchParams();
  const lists: Record<TierKey, Match[]> = {
    highly: data?.highlyEligible ?? [],
    possibly: data?.possiblyEligible ?? [],
    needs: data?.needsInfo ?? [],
  };
  // Default to the first tier that has results.
  const fallback: TierKey = lists.highly.length ? 'highly' : lists.possibly.length ? 'possibly' : lists.needs.length ? 'needs' : 'highly';
  const tier = (params.get('tier') as TierKey) || fallback;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('fit');
  const [type, setType] = useState<string | null>(null);
  const [testOnly, setTestOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lists[tier]
      .filter((m) => !q || `${m.scholarship.title} ${m.scholarship.provider} ${m.scholarship.tags.join(' ')}`.toLowerCase().includes(q))
      .filter((m) => !type || m.scholarship.type === type)
      .filter((m) => !testOnly || m.scholarship.aptitude_test_required)
      .sort(SORTS[sort].fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tier, query, sort, type, testOnly]);

  const activeFilters = Number(Boolean(type)) + Number(testOnly);

  return (
    <div>
      <PageHeader eyebrow="Matching engine" title="Your matches" description="Ranked by eligibility, academics, income fit and document readiness." />

      {error && <Alert>{(error as Error).message}</Alert>}

      <Segmented
        id="tiers"
        value={tier}
        onChange={(v) => setParams({ tier: v }, { replace: true })}
        options={[
          { value: 'highly', label: 'Strong', count: lists.highly.length },
          { value: 'possibly', label: 'Good', count: lists.possibly.length },
          { value: 'needs', label: 'Needs info', count: lists.needs.length },
        ]}
      />

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scholarships"
            className="pl-10"
            aria-label="Search scholarships"
          />
        </div>
        <IconButton
          label={`Sort: ${SORTS[sort].label}`}
          className="h-12 w-12 border border-line bg-surface-2"
          onClick={() => setSort((s) => (s === 'fit' ? 'deadline' : s === 'deadline' ? 'amount' : 'fit'))}
        >
          <ArrowDownUp className="h-5 w-5" />
        </IconButton>
        <IconButton label="Filters" className="relative h-12 w-12 border border-line bg-surface-2" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilters > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-pop-in items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
              {activeFilters}
            </span>
          )}
        </IconButton>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-fg-faint">
        <span>
          Sorted by <b className="text-fg-muted">{SORTS[sort].label}</b>
        </span>
        {type && (
          <button onClick={() => setType(null)} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
            {type} <X className="h-3 w-3" />
          </button>
        )}
        {testOnly && (
          <button onClick={() => setTestOnly(false)} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
            Has test <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {tier === 'needs' && lists.needs.length > 0 && (
        <div className="mt-4">
          <Alert tone="warn">
            You might qualify for these — we just need a bit more info.{' '}
            <Link to="/passport" className="font-bold underline underline-offset-2">
              Update passport
            </Link>
          </Alert>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Wand2}
            title={query || activeFilters ? 'Nothing matches those filters' : 'Nothing here yet'}
            description={
              query || activeFilters
                ? 'Try clearing your search or filters.'
                : 'Fill in more of your passport and new matches show up instantly.'
            }
            action={
              query || activeFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setType(null);
                    setTestOnly(false);
                  }}
                >
                  Clear all
                </Button>
              ) : (
                <Link to="/passport">
                  <Button>Update passport</Button>
                </Link>
              )
            }
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((m) => (
              <li key={m.scholarshipId}>
                <ScholarshipCard scholarship={m.scholarship} tier={m.tier} fitScore={m.fitScore} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setType(null);
                setTestOnly(false);
              }}
            >
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {visible.length} results
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <div className="mb-2.5 text-[13px] font-semibold text-fg-muted">Scholarship type</div>
            <ChipGroup label="Scholarship type" options={SCHOLARSHIP_TYPES} value={type} onChange={setType} />
          </div>
          <Toggle checked={testOnly} onChange={setTestOnly} label="Has an aptitude test" description="Only show scholarships you can prep for in Prep." />
        </div>
      </Sheet>
    </div>
  );
}
