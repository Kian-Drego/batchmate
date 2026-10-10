import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApplications, useMatches, usePerformance } from '../lib/queries';
import { daysUntil, firstName, inr } from '../lib/format';
import { ScholarshipTile } from '../components/ScholarshipCard';
import { VerifyCard } from '../components/VerifyEmail';
import { useEmailVerification } from '../lib/verification';
import { Button, CountUp, Dial, Empty, Meter, SectionHead, Skeleton, StatusTag, Surface, cn } from '../components/ui';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

export default function DashboardPage() {
  const { profile } = useAuth();
  const matches = useMatches();
  const applications = useApplications();
  const perf = usePerformance();
  const verification = useEmailVerification();
  const pushVerify = ['ready', 'sending', 'sent'].includes(verification.state.kind);

  const data = matches.data;
  const eligible = useMemo(() => (data ? [...data.highlyEligible, ...data.possiblyEligible] : []), [data]);
  const potential = eligible.reduce((sum, m) => sum + Number(m.scholarship.amount || 0), 0);
  const closingSoon = useMemo(
    () =>
      (data?.all ?? [])
        .map((m) => ({ m, d: daysUntil(m.scholarship.deadline) }))
        .filter(({ d }) => d !== null && d >= 0 && d <= 30)
        .sort((a, b) => (a.d ?? 0) - (b.d ?? 0))
        .slice(0, 4),
    [data]
  );
  const activeApps = (applications.data ?? []).filter((a) => !['Awarded', 'Rejected'].includes(a.status));
  const percent = data?.completeness.percent ?? 0;

  return (
    <div>
      <div className="mb-6 px-1">
        <p className="text-[13.5px] font-medium text-ink-3">{today}</p>
        <h1 className="mt-1 text-[38px] font-semibold leading-[1.02] sm:text-[48px]">
          {greeting()},
          <br />
          <span className="text-ink-2">{firstName(profile?.name).toLowerCase()}.</span>
        </h1>
      </div>

      {/* Verification takes the top slot only while we can actually send. */}
      {pushVerify && <VerifyCard className="mb-3 animate-rise" />}

      {/* Hero */}
      {matches.isLoading ? (
        <Skeleton className="h-[220px] rounded-5xl" />
      ) : (
        <Surface tone="peach" grain className="relative overflow-hidden rounded-5xl p-6 sm:p-8">
          <div className="text-[14px] font-semibold opacity-80">Your matches today</div>
          <div className="mt-2 flex items-end gap-3">
            <span className="num text-[76px] font-semibold leading-[0.85] sm:text-[96px]">
              <CountUp value={eligible.length} />
            </span>
            <span className="pb-1.5 font-display text-[22px] font-semibold leading-tight">
              scholarship{eligible.length === 1 ? '' : 's'}
              <br />
              fit you
            </span>
          </div>
          <p className="mt-4 max-w-sm text-[15px] opacity-85">
            {eligible.length ? (
              <>
                Worth up to <b className="num font-semibold">{inr(potential)}</b> combined. {data?.needsInfo.length ? `${data.needsInfo.length} more could unlock with a few details.` : ''}
              </>
            ) : (
              'Fill in your passport and we will start matching straight away.'
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/matches">
              <Button>
                See matches <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {percent < 100 && (
              <Link to="/passport">
                <Button variant="soft" className="bg-white/60 dark:bg-black/20">
                  Passport {percent}%
                </Button>
              </Link>
            )}
          </div>
          {/* Decorative pebble */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 dark:bg-white/5" aria-hidden />
        </Surface>
      )}

      {/* Quick tiles */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link to="/applications" className="press rounded-4xl border border-line/70 bg-card p-5 shadow-soft hover:shadow-lift">
          <div className="text-[13px] font-medium text-ink-3">Applying</div>
          <div className="num mt-1 text-[34px] font-semibold leading-none">{activeApps.length}</div>
          <div className="mt-2 text-[12.5px] text-ink-2">{activeApps.length === 1 ? 'application' : 'applications'} in motion</div>
        </Link>
        <Link to="/exams" className="press flex items-center gap-3 rounded-4xl border border-line/70 bg-card p-5 shadow-soft hover:shadow-lift">
          <Dial value={perf.data.readinessScore} size={58} stroke={5} color="rgb(var(--accent))">
            <span className="num text-[16px] font-semibold">{perf.data.readinessScore}</span>
          </Dial>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-ink-3">Exam ready</div>
            <div className="text-[12.5px] text-ink-2">{perf.data.totalAttempts ? `${perf.data.totalAttempts} mock${perf.data.totalAttempts === 1 ? '' : 's'} taken` : 'Try a mock'}</div>
          </div>
        </Link>
      </div>

      {/* Shelf */}
      {eligible.length > 0 && (
        <>
          <SectionHead
            action={
              <Link to="/matches" className="text-[13.5px] font-semibold text-ink-2 hover:text-ink">
                All matches
              </Link>
            }
          >
            Picked for you
          </SectionHead>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {eligible.slice(0, 8).map((m) => (
              <div key={m.scholarshipId} className="w-[74%] shrink-0 snap-start sm:w-[280px]">
                <ScholarshipTile scholarship={m.scholarship} fitScore={m.fitScore} />
              </div>
            ))}
          </div>
        </>
      )}
      {!matches.isLoading && eligible.length === 0 && (
        <div className="mt-6">
          <Empty
            title="Nothing matched yet"
            description="Add your degree, state, category and income bracket. Matches update the moment you save."
            action={
              <Link to="/passport">
                <Button>Complete passport</Button>
              </Link>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section>
          <SectionHead>Closing soon</SectionHead>
          {closingSoon.length === 0 ? (
            <Surface className="p-5 text-[14.5px] text-ink-2">Nothing due in the next 30 days. Breathe.</Surface>
          ) : (
            <Surface className="divide-y divide-dashed divide-line overflow-hidden">
              {closingSoon.map(({ m, d }) => (
                <Link key={m.scholarshipId} to={`/scholarships/${m.scholarshipId}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunken/60">
                  <div className={cn('flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl', d! <= 7 ? 'bg-peach text-peach-ink' : 'bg-sunken text-ink-2')}>
                    <span className="num text-[18px] font-semibold leading-none">{d}</span>
                    <span className="text-[10px] font-semibold">days</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold">{m.scholarship.title}</div>
                    <div className="truncate text-[12.5px] text-ink-3">
                      {inr(m.scholarship.amount)} · {m.scholarship.provider}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3" />
                </Link>
              ))}
            </Surface>
          )}
        </section>

        <section>
          <SectionHead
            action={
              <Link to="/applications" className="text-[13.5px] font-semibold text-ink-2 hover:text-ink">
                Tracker
              </Link>
            }
          >
            In motion
          </SectionHead>
          {applications.isLoading ? (
            <Skeleton className="h-28 rounded-4xl" />
          ) : activeApps.length === 0 ? (
            <Surface className="p-5 text-[14.5px] text-ink-2">No applications yet. Open any match and tap “Start applying”.</Surface>
          ) : (
            <div className="space-y-3">
              {activeApps.slice(0, 3).map((a) => {
                const done = a.checklist.filter((c) => c.done).length;
                const pct = a.checklist.length ? (done / a.checklist.length) * 100 : 0;
                return (
                  <Link key={a.id} to={`/scholarships/${a.scholarship_id}`} className="press block rounded-4xl border border-line/70 bg-card p-5 shadow-soft hover:shadow-lift">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-[15px] font-semibold">{a.scholarship?.title ?? 'Scholarship unavailable'}</div>
                      <StatusTag status={a.status} />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Meter value={pct} tone={pct === 100 ? 'sage' : 'ink'} />
                      <span className="num shrink-0 text-[13px] text-ink-3">
                        {done}/{a.checklist.length}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
