import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowUpRight } from 'lucide-react';
import type { ApplicationStatus } from '../../lib/constants';
import { useAdminApplications, useDecideApplication, type AdminApplication, type AppFilter } from '../../lib/queries';
import { inr, relativeTime, shortDate } from '../../lib/format';
import { tick } from '../../lib/haptics';
import { Avatar, Button, Empty, Field, ListSkeleton, Meter, Notice, PageTitle, Sheet, StatusTag, Surface, Tabs, Textarea, riseDelay } from '../../components/ui';

function History({ app }: { app: AdminApplication }) {
  return (
    <ol className="relative space-y-4 pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
      {[...app.history].reverse().map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-2 border-card bg-primary shadow-soft" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status={h.status} />
            <span className="text-[12.5px] text-ink-3">{shortDate(h.at)}</span>
            {(h as { by?: string }).by === 'admin' && <span className="text-[12px] font-semibold text-ink-3">by admin</span>}
          </div>
          {h.note && <p className="mt-1 text-[13.5px] text-ink-2">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}

export default function AdminApplicationsPage() {
  const [filter, setFilter] = useState<AppFilter>('review');
  const apps = useAdminApplications(filter);
  const decide = useDecideApplication();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState('');

  const list = apps.data ?? [];
  const current = list.find((a) => a.id === selectedId) ?? null;

  const act = (status: ApplicationStatus) => {
    if (!current) return;
    if (status === 'Rejected' && !note.trim()) {
      toast.error('Add a reason for the rejection');
      return;
    }
    decide.mutate(
      { id: current.id, status, note: note.trim() || undefined },
      {
        onSuccess: () => {
          tick(10);
          toast.success(status === 'Awarded' ? 'Awarded' : status === 'Rejected' ? 'Declined' : 'Moved to verification');
          setNote('');
          setSheetOpen(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const actions = (a: AdminApplication) => {
    if (a.status === 'Submitted')
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" size="lg" className="col-span-2" onClick={() => act('Verification Pending')} loading={decide.isPending && decide.variables?.status === 'Verification Pending'}>
            Start verification
          </Button>
          <Button variant="danger" size="lg" onClick={() => act('Rejected')} loading={decide.isPending && decide.variables?.status === 'Rejected'}>
            Decline
          </Button>
          <Button size="lg" onClick={() => act('Awarded')} loading={decide.isPending && decide.variables?.status === 'Awarded'}>
            Award
          </Button>
        </div>
      );
    if (a.status === 'Verification Pending')
      return (
        <div className="flex gap-2">
          <Button variant="danger" size="lg" className="flex-1" onClick={() => act('Rejected')} loading={decide.isPending && decide.variables?.status === 'Rejected'}>
            Decline
          </Button>
          <Button size="lg" className="flex-[1.4]" onClick={() => act('Awarded')} loading={decide.isPending && decide.variables?.status === 'Awarded'}>
            Award
          </Button>
        </div>
      );
    if (a.status === 'Not Started' || a.status === 'In Progress')
      return (
        <Button variant="danger" size="lg" block onClick={() => act('Rejected')} loading={decide.isPending}>
          Close as ineligible
        </Button>
      );
    return null;
  };

  return (
    <div>
      <PageTitle kicker="Application decisions" title="Decide" sub="Submitted applications are verified here. Every decision is logged and the student sees your note." />

      <Tabs
        id="admin-apps"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'review', label: 'Needs decision' },
          { value: 'active', label: 'In progress' },
          { value: 'closed', label: 'Decided' },
        ]}
      />

      <div className="mt-4">
        {apps.error && <Notice tone="rose">{(apps.error as Error).message}</Notice>}
        {apps.isLoading ? (
          <ListSkeleton rows={4} />
        ) : list.length === 0 ? (
          <Empty title={filter === 'review' ? 'Nothing to decide' : 'Nothing here'} description={filter === 'review' ? 'Submitted applications appear here for verification.' : undefined} />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {list.map((a, i) => {
              const done = a.checklist.filter((c) => c.done).length;
              return (
                <li key={a.id} style={riseDelay(i)} className="min-w-0 animate-rise">
                  <button
                    onClick={() => {
                      setSelectedId(a.id);
                      setNote('');
                      setSheetOpen(true);
                    }}
                    className="press block w-full rounded-4xl border border-line/70 bg-card p-5 text-left shadow-soft hover:shadow-lift"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={a.profile?.name || a.profile?.email} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold">{a.profile?.name || a.profile?.email}</div>
                        <div className="text-[12.5px] text-ink-3">{relativeTime(a.updated_at)}</div>
                      </div>
                      <StatusTag status={a.status} />
                    </div>
                    <div className="mt-3 line-clamp-2 font-display text-[17px] font-semibold leading-snug">{a.scholarship.title}</div>
                    <div className="mt-3 flex items-center gap-3">
                      <Meter value={a.checklist.length ? (done / a.checklist.length) * 100 : 0} />
                      <span className="num shrink-0 text-[12.5px] text-ink-3">
                        {done}/{a.checklist.length}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet
        open={sheetOpen && Boolean(current)}
        onClose={() => setSheetOpen(false)}
        wide
        title={current?.scholarship.title ?? ''}
        subtitle={current ? `${current.profile?.name || current.profile?.email} · ${current.mode === 'native' ? 'applied via BatchMate' : 'official portal'}` : undefined}
        footer={current ? actions(current) : null}
      >
        {current && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <Surface className="p-4">
                <div className="text-[12.5px] text-ink-3">Award</div>
                <div className="num text-[22px] font-semibold">{inr(current.scholarship.amount)}</div>
              </Surface>
              <Surface className="p-4">
                <div className="text-[12.5px] text-ink-3">Checklist</div>
                <div className="num text-[22px] font-semibold">
                  {current.checklist.filter((c) => c.done).length}/{current.checklist.length}
                </div>
              </Surface>
            </div>

            <Link to="/admin/students" state={{ open: current.user_id }} className="press flex items-center justify-between rounded-3xl border border-line bg-card px-4 py-3.5 shadow-soft">
              <span className="text-[14px] font-semibold">Open student file — passport &amp; documents</span>
              <ArrowUpRight className="h-4 w-4 text-ink-3" />
            </Link>

            {['Submitted', 'Verification Pending', 'Not Started', 'In Progress'].includes(current.status) && (
              <Field label="Note to the student" hint="Required to decline. Shown on the student's application." htmlFor="decision-note">
                <Textarea id="decision-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Income certificate is older than 12 months." />
              </Field>
            )}

            <div>
              <h3 className="mb-3 text-[17px] font-semibold">History</h3>
              <History app={current} />
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
