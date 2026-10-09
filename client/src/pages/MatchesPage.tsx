import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, Search, SlidersHorizontal, X } from 'lucide-react';
import { SCHOLARSHIP_TYPES } from '../lib/constants';
import { useMatches, type Match } from '../lib/queries';
import ScholarshipCard from '../components/ScholarshipCard';
import { Button, ChipGroup, Empty, IconButton, Input, ListSkeleton, Notice, PageTitle, Sheet, Switch, Tabs } from '../components/ui';

type TierKey = 'highly' | 'possibly' | 'needs';
type SortKey = 'fit' | 'deadline' | 'amount';

const SORTS: Record<SortKey, { label: string; fn: (a: Match, b: Match) => number }> = {
  fit: { label: 'Best fit', fn: (a, b) => b.fitScore - a.fitScore },
  deadline: {
    label: 'Deadline',
    fn: (a, b) =>
      (a.scholarship.deadline ? Date.parse(a.scholarship.deadline) : Infinity) - (b.scholarship.deadline ? Date.parse(b.scholarship.deadline) : Infinity),
  },
  amount: { label: 'Amount', fn: (a, b) => Number(b.scholarship.amount) - Number(a.scholarship.amount) },
};

export default function MatchesPage() {
  const { data, isLoading, error } = useMatches();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('fit');
  const [type, setType] = useState<string | null>(null);
  const [testOnly, setTestOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const lists: Record<TierKey, Match[]> = {
    highly: data?.highlyEligible ?? [],
    possibly: data?.possiblyEligible ?? [],
    needs: data?.needsInfo ?? [],
  };
  const fallback: TierKey = lists.highly.length ? 'highly' : lists.possibly.length ? 'possibly' : lists.needs.length ? 'needs' : 'highly';
  const tier = (params.get('tier') as TierKey) || fallback;

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
  const clear = () => {
    setQuery('');
    setType(null);
    setTestOnly(false);
  };

  return (
    <div>
      <PageTitle kicker={`${data?.all.length ?? 0} scholarships you can apply for`} title="Matches" />

      {error && <Notice tone="rose">{(error as Error).message}</Notice>}

      <Tabs
        id="tiers"
        value={tier}
        onChange={(v) => setParams({ tier: v }, { replace: true })}
        options={[
          { value: 'highly', label: 'Strong fit', count: lists.highly.length },
          { value: 'possibly', label: 'Good fit', count: lists.possibly.length },
          { value: 'needs', label: 'Needs info', count: lists.needs.length },
        ]}
      />

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or provider" className="rounded-full pl-11" aria-label="Search scholarships" />
        </div>
        <IconButton
          label={`Sort: ${SORTS[sort].label}`}
          className="h-[52px] w-[52px] border border-line bg-card shadow-soft"
          onClick={() => setSort((s) => (s === 'fit' ? 'deadline' : s === 'deadline' ? 'amount' : 'fit'))}
        >
          <ArrowDownUp className="h-5 w-5" />
        </IconButton>
        <IconButton label="Filters" className="relative h-[52px] w-[52px] border border-line bg-card shadow-soft" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilters > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 animate-pop items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">{activeFilters}</span>
          )}
        </IconButton>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-[13px] text-ink-3">
        <span>
          Sorted by <b className="font-semibold text-ink-2">{SORTS[sort].label.toLowerCase()}</b>
        </span>
        {type && (
          <button onClick={() => setType(null)} className="press inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-semibold text-primary-fg">
            {type} <X className="h-3 w-3" />
          </button>
        )}
        {testOnly && (
          <button onClick={() => setTestOnly(false)} className="press inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-semibold text-primary-fg">
            Has a test <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {tier === 'needs' && lists.needs.length > 0 && (
        <Notice tone="butter" className="mt-4">
          You might qualify for these — we just need a little more about you.{' '}
          <Link to="/passport" className="font-semibold underline underline-offset-4">
            Update passport
          </Link>
        </Notice>
      )}

      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : visible.length === 0 ? (
          <Empty
            title={query || activeFilters ? 'No results for that' : 'Nothing here yet'}
            description={query || activeFilters ? 'Try a different search or clear your filters.' : 'Fill in more of your passport and new matches appear instantly.'}
            action={
              query || activeFilters ? (
                <Button variant="soft" onClick={clear}>
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
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visible.map((m, i) => (
              <li key={m.scholarshipId} className="min-w-0">
                <ScholarshipCard scholarship={m.scholarship} tier={m.tier} fitScore={m.fitScore} index={i} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter"
        footer={
          <div className="flex gap-2">
            <Button variant="soft" className="flex-1" onClick={() => { setType(null); setTestOnly(false); }}>
              Reset
            </Button>
            <Button className="flex-[2]" onClick={() => setFiltersOpen(false)}>
              Show {visible.length}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <div className="mb-3 pl-1 text-[13px] font-semibold text-ink-2">Scholarship type</div>
            <ChipGroup label="Scholarship type" options={SCHOLARSHIP_TYPES} value={type} onChange={setType} />
          </div>
          <Switch checked={testOnly} onChange={setTestOnly} label="Has an aptitude test" description="Ones you can practise for in Prep." />
        </div>
      </Sheet>
    </div>
  );
}
