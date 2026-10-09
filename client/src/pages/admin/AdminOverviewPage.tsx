import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminStats, useAudit } from '../../lib/queries';
import { relativeTime } from '../../lib/format';
import { describeAction } from './AdminActivityPage';
import { PageTitle, SectionHead, Skeleton, Stat, Surface, cn, tint, type Tone } from '../../components/ui';

function Todo({ to, count, label, tone, empty }: { to: string; count: number | undefined; label: string; tone: Tone; empty: string }) {
  const clear = count === 0;
  return (
    <Link to={to} className={cn('press grainy flex flex-col rounded-5xl p-6 shadow-soft hover:shadow-lift', clear ? 'border border-line/70 bg-card' : tint(tone))}>
      <div className="num text-[64px] font-semibold leading-[0.9]">{count ?? '–'}</div>
      <div className="mt-2 font-display text-[19px] font-semibold leading-tight">{clear ? empty : label}</div>
      <div className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold opacity-80">
        Open <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const { profile } = useAuth();
  const stats = useAdminStats();
  const audit = useAudit();
  const s = stats.data;

  return (
    <div>
      <PageTitle kicker={`Signed in as ${profile?.email ?? 'admin'}`} title="Console" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Todo to="/admin/review" count={s?.pendingDocuments} label="documents waiting for review" empty="Review queue is clear" tone="peach" />
        <Todo to="/admin/applications" count={s?.awaitingDecision} label="applications need a decision" empty="No decisions pending" tone="lilac" />
      </div>

      <SectionHead>At a glance</SectionHead>
      {stats.isLoading ? (
        <Skeleton className="h-48 rounded-4xl" />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Students" value={s?.students ?? 0} hint={`+${s?.newStudents7d ?? 0} this week · ${s?.unverifiedStudents ?? 0} unverified`} />
          <Stat label="Active applications" value={s?.activeApplications ?? 0} />
          <Stat label="Awarded" value={s?.awarded ?? 0} tone="sage" />
          <Stat label="Live scholarships" value={s?.activeScholarships ?? 0} hint={`${s?.closingSoon ?? 0} closing in 14 days`} />
        </div>
      )}

      <SectionHead
        action={
          <Link to="/admin/activity" className="text-[13.5px] font-semibold text-ink-2 hover:text-ink">
            All activity
          </Link>
        }
      >
        Recent activity
      </SectionHead>
      {audit.isLoading ? (
        <Skeleton className="h-40 rounded-4xl" />
      ) : !audit.data?.length ? (
        <Surface className="p-5 text-[14.5px] text-ink-2">Nothing yet. Reviews, decisions and catalogue edits will show up here.</Surface>
      ) : (
        <Surface className="divide-y divide-dashed divide-line overflow-hidden">
          {audit.data.slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1 text-[14px]">
                <span className="font-semibold">{a.actor?.name || a.actor?.email || 'Someone'}</span> <span className="text-ink-2">{describeAction(a)}</span>
              </div>
              <span className="shrink-0 text-[12.5px] text-ink-3">{relativeTime(a.created_at)}</span>
            </div>
          ))}
        </Surface>
      )}
    </div>
  );
}
