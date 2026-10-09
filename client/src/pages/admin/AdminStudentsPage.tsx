import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { INCOME_LABELS } from '../../lib/constants';
import { useSetRole, useStudentDetail, useStudents, type StudentRow } from '../../lib/queries';
import { useAuth } from '../../context/AuthContext';
import { relativeTime, shortDate } from '../../lib/format';
import DocumentPreview from '../../components/DocumentPreview';
import { Avatar, Button, Dial, Empty, Input, ListSkeleton, Notice, PageTitle, Sheet, Skeleton, StatusTag, Surface, Tabs, Tag, cn } from '../../components/ui';

type View = 'students' | 'admins';

const DOC_TONE = { verified: 'sage', rejected: 'rose', pending_review: 'neutral' } as const;

function StudentFile({ student }: { student: StudentRow }) {
  const detail = useStudentDetail(student.id);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const p = student.passport;

  const rows: [string, string | null | undefined][] = p
    ? [
        ['Institution', p.institution],
        ['Course', p.course],
        ['Level', p.degree],
        ['Year', p.current_year],
        ['Class 12', p.class12_percentage != null ? `${p.class12_percentage}%` : null],
        ['CGPA', p.cgpa != null ? String(p.cgpa) : null],
        ['Entrance', p.entrance_exam_name ? `${p.entrance_exam_name}${p.entrance_exam_score != null ? ` · ${p.entrance_exam_score}` : ''}` : null],
        ['State', p.state],
        ['Category', p.category],
        ['Gender', p.gender],
        ['Income', p.income_bracket ? INCOME_LABELS[p.income_bracket] : null],
        ['Disability', p.disability_status ? 'Yes' : 'No'],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-[17px] font-semibold">Passport</h3>
        {!p ? (
          <p className="text-[14px] text-ink-2">No passport yet.</p>
        ) : (
          <Surface className="divide-y divide-dashed divide-line p-0 text-[14px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-4 px-5 py-2.5">
                <span className="w-24 shrink-0 text-ink-3">{k}</span>
                <span className={cn('min-w-0 font-medium', !v && 'text-ink-3')}>{v || '—'}</span>
              </div>
            ))}
          </Surface>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-[17px] font-semibold">Documents</h3>
        {detail.isLoading ? (
          <Skeleton className="h-24 rounded-3xl" />
        ) : !detail.data?.documents.length ? (
          <p className="text-[14px] text-ink-2">Nothing uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {detail.data.documents.map((d) => (
              <li key={d.id} className="rounded-3xl bg-sunken shadow-well">
                <button onClick={() => setOpenDoc(openDoc === d.id ? null : d.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold">{d.type}</div>
                    <div className="text-[12.5px] text-ink-3">{shortDate(d.uploaded_at)}</div>
                  </div>
                  <Tag tone={DOC_TONE[d.status]}>{d.status === 'pending_review' ? 'Waiting' : d.status === 'verified' ? 'Verified' : 'Sent back'}</Tag>
                  <ChevronDown className={cn('h-4 w-4 text-ink-3 transition-transform duration-300', openDoc === d.id && 'rotate-180')} />
                </button>
                {openDoc === d.id && (
                  <div className="px-3 pb-3">
                    <DocumentPreview doc={d} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-[17px] font-semibold">Applications</h3>
        {detail.isLoading ? (
          <Skeleton className="h-24 rounded-3xl" />
        ) : !detail.data?.applications.length ? (
          <p className="text-[14px] text-ink-2">No applications yet.</p>
        ) : (
          <ul className="space-y-2">
            {detail.data.applications.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-3xl bg-sunken px-4 py-3 shadow-well">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{a.scholarship.title}</div>
                  <div className="text-[12.5px] text-ink-3">updated {relativeTime(a.updated_at)}</div>
                </div>
                <StatusTag status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const { data, isLoading, error } = useStudents();
  const { user } = useAuth();
  const setRole = useSetRole();
  const location = useLocation();
  const [view, setView] = useState<View>('students');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Deep link from an application ("Open student file").
  useEffect(() => {
    const target = (location.state as { open?: string } | null)?.open;
    if (target) {
      setSelectedId(target);
      setSheetOpen(true);
    }
  }, [location.state]);

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((s) => (view === 'admins' ? s.role === 'admin' : s.role === 'student'))
      .filter((s) => !q || `${s.name} ${s.email} ${s.passport?.institution ?? ''} ${s.passport?.state ?? ''}`.toLowerCase().includes(q));
  }, [data, view, query]);

  const current = (data ?? []).find((s) => s.id === selectedId) ?? null;

  const toggleRole = () => {
    if (!current) return;
    const next = current.role === 'admin' ? 'student' : 'admin';
    if (!window.confirm(next === 'admin' ? `Give ${current.email} full admin access?` : `Remove admin access from ${current.email}?`)) return;
    setRole.mutate({ id: current.id, role: next }, { onSuccess: () => toast.success(next === 'admin' ? 'Now an admin' : 'Admin access removed'), onError: (e) => toast.error(e.message) });
  };

  return (
    <div>
      <PageTitle kicker={`${(data ?? []).filter((s) => s.role === 'student').length} students`} title="People" />

      <Tabs
        id="people"
        value={view}
        onChange={setView}
        options={[
          { value: 'students', label: 'Students' },
          { value: 'admins', label: 'Admins' },
        ]}
      />

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email, college or state" className="rounded-full pl-11" />
      </div>

      <div className="mt-4">
        {error && <Notice tone="rose">{(error as Error).message}</Notice>}
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : people.length === 0 ? (
          <Empty title="No one here" description={query ? 'Try a different search.' : undefined} />
        ) : (
          <Surface className="divide-y divide-dashed divide-line overflow-hidden">
            {people.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedId(s.id);
                  setSheetOpen(true);
                }}
                className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-sunken/60"
              >
                <Avatar name={s.name || s.email} src={s.avatar_url} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{s.name || 'Unnamed'}</div>
                  <div className="truncate text-[12.5px] text-ink-3">
                    {s.email}
                    {s.passport?.state ? ` · ${s.passport.state}` : ''}
                  </div>
                </div>
                {s.role === 'admin' ? (
                  <Tag tone="lilac">
                    <ShieldCheck className="h-3.5 w-3.5" /> Admin
                  </Tag>
                ) : (
                  <Dial value={s.passport?.completeness ?? 0} size={40} stroke={4} color="rgb(var(--ink))">
                    <span className="num text-[11px] font-semibold">{s.passport?.completeness ?? 0}</span>
                  </Dial>
                )}
              </button>
            ))}
          </Surface>
        )}
      </div>

      <Sheet
        open={sheetOpen && Boolean(current)}
        onClose={() => setSheetOpen(false)}
        wide
        title={current?.name || current?.email || ''}
        subtitle={current ? `${current.email} · joined ${shortDate(current.created_at)}` : undefined}
        footer={
          current &&
          current.id !== user?.id && (
            <Button variant={current.role === 'admin' ? 'danger' : 'soft'} size="lg" block onClick={toggleRole} loading={setRole.isPending}>
              <ShieldCheck className="h-4 w-4" /> {current.role === 'admin' ? 'Remove admin access' : 'Make admin'}
            </Button>
          )
        }
      >
        {current && <StudentFile student={current} />}
      </Sheet>
    </div>
  );
}
