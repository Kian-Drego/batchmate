import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, ClipboardList, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApplications, useMatches } from '../lib/queries';
import { daysUntil, deadlineLabel, firstName, inr } from '../lib/format';
import ScholarshipCard from '../components/ScholarshipCard';
import { Badge, Button, CountUp, EmptyState, Progress, Ring, SectionTitle, Skeleton, StatusBadge, cn } from '../components/ui';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const matches = useMatches();
  const applications = useApplications();

  const data = matches.data;
  const eligible = useMemo(() => (data ? [...data.highlyEligible, ...data.possiblyEligible] : []), [data]);
  const potential = eligible.reduce((sum, m) => sum + Number(m.scholarship.amount || 0), 0);
  const closingSoon = useMemo(
    () =>
      (data?.all ?? [])
        .filter((m) => {
          const d = daysUntil(m.scholarship.deadline);
          return d !== null && d >= 0 && d <= 30;
        })
        .sort((a, b) => (daysUntil(a.scholarship.deadline) ?? 0) - (daysUntil(b.scholarship.deadline) ?? 0))
        .slice(0, 4),
    [data]
  );
  const activeApps = (applications.data ?? []).filter((a) => !['Awarded', 'Rejected'].includes(a.status));
  const percent = data?.completeness.percent ?? 0;

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm font-medium text-fg-muted">{greeting()},</p>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-4xl">
          {firstName(profile?.name)} <span className="inline-block origin-[70%_70%] animate-pop-in">👋</span>
        </h1>
      </div>

      {/* Hero: passport completeness */}
      {matches.isLoading ? (
        <Skeleton className="h-36 w-full rounded-3xl" />
      ) : (
        <Link
          to="/passport"
          className={cn(
            'tap card relative flex items-center gap-5 overflow-hidden rounded-3xl p-5',
            percent < 100 ? 'border-accent/40 shadow-glow-sm' : 'border-mint/30'
          )}
        >
          <Ring value={percent} size={84} stroke={7} tone={percent === 100 ? 'mint' : 'accent'}>
            <span className="font-mono text-lg font-bold tabular-nums">
              <CountUp value={percent} suffix="%" />
            </span>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="eyebrow">Scholarship passport</div>
            <div className="mt-1 text-[17px] font-bold leading-snug">
              {percent === 100 ? 'Passport complete. Matches are at full accuracy.' : 'Finish your passport to unlock every match'}
            </div>
            {percent < 100 && data && (
              <div className="mt-1.5 line-clamp-1 text-[13px] text-fg-muted">Missing: {data.completeness.missing.join(', ')}</div>
            )}
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-fg-faint" />
        </Link>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Matches', value: eligible.length, tone: 'text-accent' },
          { label: 'Up to', value: inr(potential), tone: 'text-mint', raw: true },
          { label: 'Active apps', value: activeApps.length, tone: 'text-hot' },
        ].map((s) => (
          <div key={s.label} className="card p-3.5">
            <div className="text-[12px] font-medium text-fg-faint">{s.label}</div>
            <div className={cn('mt-0.5 truncate font-mono text-xl font-bold tabular-nums', s.tone)}>
              {matches.isLoading ? '—' : s.raw ? s.value : <CountUp value={s.value as number} />}
            </div>
          </div>
        ))}
      </div>

      {/* Top picks carousel (CSS scroll-snap — zero JS) */}
      <SectionTitle
        action={
          <Link to="/matches" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-[18px] w-[18px] text-accent" /> Top picks for you
        </span>
      </SectionTitle>
      {matches.isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 w-[78%] shrink-0 rounded-2xl sm:w-72" />
          ))}
        </div>
      ) : eligible.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="No matches yet"
          description="Add your degree, state, category and income bracket — we'll find what you qualify for."
          action={
            <Link to="/passport">
              <Button>Complete passport</Button>
            </Link>
          }
        />
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {eligible.slice(0, 8).map((m) => (
            <div key={m.scholarshipId} className="w-[78%] shrink-0 snap-start sm:w-72">
              <ScholarshipCard scholarship={m.scholarship} tier={m.tier} fitScore={m.fitScore} compact />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Closing soon */}
        <section>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-[18px] w-[18px] text-hot" /> Closing soon
            </span>
          </SectionTitle>
          {closingSoon.length === 0 ? (
            <p className="card p-4 text-sm text-fg-muted">Nothing closing in the next 30 days. You&apos;re chilling.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {closingSoon.map((m) => {
                const dl = deadlineLabel(m.scholarship.deadline);
                return (
                  <li key={m.scholarshipId}>
                    <Link to={`/scholarships/${m.scholarshipId}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{m.scholarship.title}</div>
                        <div className="truncate text-[12px] text-fg-faint">{inr(m.scholarship.amount)} · {m.scholarship.provider}</div>
                      </div>
                      <Badge tone={dl.tone === 'urgent' ? 'hot' : 'warn'}>{dl.text}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Applications */}
        <section>
          <SectionTitle
            action={
              <Link to="/applications" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
                Tracker <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-[18px] w-[18px] text-mint" /> In progress
            </span>
          </SectionTitle>
          {applications.isLoading ? (
            <Skeleton className="h-28 w-full rounded-2xl" />
          ) : activeApps.length === 0 ? (
            <p className="card p-4 text-sm text-fg-muted">No active applications. Open a match and tap “Start applying”.</p>
          ) : (
            <ul className="space-y-2.5">
              {activeApps.slice(0, 3).map((a) => {
                const done = a.checklist.filter((c) => c.done).length;
                const pct = a.checklist.length ? (done / a.checklist.length) * 100 : 0;
                return (
                  <li key={a.id}>
                    <Link to={`/scholarships/${a.scholarship_id}`} className="tap card block p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-semibold">{a.scholarship.title}</div>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={pct} tone={pct === 100 ? 'mint' : 'accent'} />
                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-fg-faint">
                          {done}/{a.checklist.length}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
