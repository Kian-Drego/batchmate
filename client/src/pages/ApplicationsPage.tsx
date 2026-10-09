import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ExternalLink, Smartphone } from 'lucide-react';
import { useApplications } from '../lib/queries';
import { deadlineLabel, inr, relativeTime } from '../lib/format';
import ApplySheet from '../components/ApplySheet';
import { Alert, Badge, Button, EmptyState, ListSkeleton, PageHeader, Progress, Segmented, StatusBadge } from '../components/ui';

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
      <PageHeader eyebrow="Tracker" title="Applications" description="Every scholarship you're applying for, with checklists and status in one place." />

      {awarded.length > 0 && (
        <div className="card mb-4 flex items-center gap-4 border-mint/30 p-4 shadow-glow-mint">
          <span className="text-3xl" aria-hidden>
            🏆
          </span>
          <div>
            <div className="font-bold">
              {awarded.length} awarded · {inr(awarded.reduce((s, a) => s + Number(a.scholarship.amount || 0), 0))}
            </div>
            <div className="text-[13px] text-fg-muted">Keep it up. Renewal criteria live in Prep.</div>
          </div>
        </div>
      )}

      <Segmented
        id="apps"
        value={view}
        onChange={setView}
        options={[
          { value: 'active', label: 'Active', count: active.length },
          { value: 'done', label: 'Completed', count: done.length },
        ]}
      />

      <div className="mt-4">
        {error && <Alert>{(error as Error).message}</Alert>}
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={view === 'active' ? 'No active applications' : 'Nothing completed yet'}
            description={view === 'active' ? 'Open any match and tap “Start applying” to track it here.' : 'Awarded and rejected applications land here.'}
            action={
              view === 'active' && (
                <Link to="/matches">
                  <Button>Browse matches</Button>
                </Link>
              )
            }
          />
        ) : (
          <ul className="space-y-3">
            {list.map((a) => {
              const completed = a.checklist.filter((c) => c.done).length;
              const pct = a.checklist.length ? (completed / a.checklist.length) * 100 : 0;
              const dl = deadlineLabel(a.scholarship.deadline);
              return (
                <li key={a.id}>
                  <button onClick={() => {
                      setSelectedId(a.id);
                      setSheetOpen(true);
                    }} className="tap card block w-full p-4 text-left transition-[border-color] hover:border-accent/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 font-bold leading-snug">{a.scholarship.title}</div>
                        <div className="mt-0.5 truncate text-[13px] text-fg-muted">{a.scholarship.provider}</div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={pct} tone={pct === 100 ? 'mint' : 'accent'} />
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-fg-faint">
                        {completed}/{a.checklist.length}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-fg-faint">
                      <Badge>
                        {a.mode === 'native' ? <Smartphone className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                        {a.mode === 'native' ? 'Apply here' : 'Official portal'}
                      </Badge>
                      {view === 'active' && <Badge tone={dl.tone === 'urgent' ? 'hot' : dl.tone === 'soon' ? 'warn' : 'neutral'}>{dl.text}</Badge>}
                      <span className="ml-auto">updated {relativeTime(a.updated_at)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <ApplySheet open={sheetOpen} onClose={() => setSheetOpen(false)} scholarship={selected.scholarship} application={selected} />
      )}
    </div>
  );
}
