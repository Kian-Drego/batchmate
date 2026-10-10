import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApplications } from '../lib/queries';
import { deadlineLabel, inr, relativeTime } from '../lib/format';
import ApplySheet from '../components/ApplySheet';
import { Button, Empty, ListSkeleton, Meter, Notice, PageTitle, StatusTag, Surface, Tabs, riseDelay } from '../components/ui';

type View = 'active' | 'done';

export default function ApplicationsPage() {
  const { data, isLoading, error } = useApplications();
  const [view, setView] = useState<View>('active');
  // Keep the last selection mounted so the sheet can animate out.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const all = data ?? [];
  const active = all.filter((a) => !['Awarded', 'Rejected'].includes(a.status));
  const done = all.filter((a) => ['Awarded', 'Rejected'].includes(a.status));
  const list = view === 'active' ? active : done;
  const selected = all.find((a) => a.id === selectedId);
  const awarded = done.filter((a) => a.status === 'Awarded');

  return (
    <div>
      <PageTitle kicker="Your tracker" title="Applications" />

      {awarded.length > 0 && (
        <Surface tone="sage" grain className="mb-4 p-6">
          <div className="text-[13.5px] font-semibold opacity-80">Won so far</div>
          <div className="num mt-1 text-[40px] font-semibold leading-none">{inr(awarded.reduce((s, a) => s + Number(a.scholarship?.amount || 0), 0))}</div>
          <div className="mt-1.5 text-[14px] opacity-80">
            across {awarded.length} scholarship{awarded.length === 1 ? '' : 's'}. Renewal rules live in Prep.
          </div>
        </Surface>
      )}

      <Tabs
        id="apps"
        value={view}
        onChange={setView}
        options={[
          { value: 'active', label: 'In motion', count: active.length },
          { value: 'done', label: 'Decided', count: done.length },
        ]}
      />

      <div className="mt-4">
        {error && <Notice tone="rose">{(error as Error).message}</Notice>}
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : list.length === 0 ? (
          <Empty
            title={view === 'active' ? 'Nothing in motion' : 'No decisions yet'}
            description={view === 'active' ? 'Open any match and tap “Start applying” to track it here.' : 'Awarded and declined applications land here.'}
            action={
              view === 'active' && (
                <Link to="/matches">
                  <Button>Browse matches</Button>
                </Link>
              )
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {list.map((a, i) => {
              const completed = a.checklist.filter((c) => c.done).length;
              const pct = a.checklist.length ? (completed / a.checklist.length) * 100 : 0;
              const dl = deadlineLabel(a.scholarship?.deadline);
              return (
                <li key={a.id} className="min-w-0">
                  <button
                    onClick={() => {
                      setSelectedId(a.id);
                      setSheetOpen(true);
                    }}
                    style={riseDelay(i)}
                    className="press block w-full animate-rise rounded-4xl border border-line/70 bg-card p-5 text-left shadow-soft hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <StatusTag status={a.status} />
                      <span className="pt-1 text-[12.5px] text-ink-3">{relativeTime(a.updated_at)}</span>
                    </div>
                    <div className="mt-3 line-clamp-2 font-display text-[19px] font-semibold leading-snug">{a.scholarship?.title ?? 'Scholarship unavailable'}</div>
                    <div className="mt-0.5 truncate text-[13.5px] text-ink-3">{a.scholarship?.provider ?? ''}</div>
                    <div className="mt-4 flex items-center gap-3">
                      <Meter value={pct} tone={pct === 100 ? 'sage' : 'ink'} />
                      <span className="num shrink-0 text-[13px] text-ink-3">
                        {completed}/{a.checklist.length}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[12.5px] text-ink-3">
                      <span>{a.mode === 'native' ? 'Applied through BatchMate' : 'Official portal'}</span>
                      {view === 'active' && <span className={dl.tone === 'urgent' ? 'font-semibold text-accent' : ''}>{dl.text}</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected?.scholarship && <ApplySheet open={sheetOpen} onClose={() => setSheetOpen(false)} scholarship={selected.scholarship} application={selected} />}
    </div>
  );
}
