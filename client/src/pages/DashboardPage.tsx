import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Application, MatchResponse, Passport } from '../lib/types';
import { deadlineLabel, inr, shortDate } from '../lib/format';
import { Badge, Button, Panel, Progress, SectionHeader, Spinner, Stat, TierBadge } from '../components/ui';

export default function DashboardPage() {
  const { user } = useAuth();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [matches, setMatches] = useState<MatchResponse | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ passport: Passport }>('/passport'),
      api.get<MatchResponse>('/passport/matches'),
      api.get<{ applications: Application[] }>('/applications'),
    ])
      .then(([p, m, a]) => {
        setPassport(p.passport);
        setMatches(m);
        setApplications(a.applications);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const grouped = matches?.grouped;
  const allMatches = matches?.matches ?? [];
  const needsInfo = grouped?.needsInfo.length ?? 0;
  const tracked = applications.length;
  const active = applications.filter(
    (a) => !['Awarded', 'Rejected'].includes(a.status)
  ).length;
  const missingFields = passport?.completeness === 100 ? [] : (grouped?.needsInfo[0]?.missingFields ?? []);

  const upcoming = [...allMatches]
    .filter((m) => m.scholarship.deadline)
    .sort((a, b) => new Date(a.scholarship.deadline!).getTime() - new Date(b.scholarship.deadline!).getTime())
    .slice(0, 4);

  return (
    <div>
      <SectionHeader
        eyebrow={`Welcome back, ${user?.name?.split(' ')[0] ?? ''}`}
        title="Your scholarship position"
        description="Ranked matches, open tasks and the nearest deadlines — recalculated each time your passport changes."
      />

      {/* Metrics row - asymmetric, left rule rather than identical cards. */}
      <Panel className="grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
        <Stat label="Highly eligible" value={grouped?.highlyEligible.length ?? 0} tone="eligible" />
        <Stat label="Possibly eligible" value={grouped?.possiblyEligible.length ?? 0} tone="caution" />
        <Stat label="Open applications" value={active} sub={`${tracked} tracked`} />
        <Stat
          label="Passport complete"
          value={`${passport?.completeness ?? 0}%`}
          tone={passport?.completeness === 100 ? 'eligible' : 'default'}
        />
      </Panel>

      {needsInfo > 0 && (
        <div className="mt-4">
          <Panel className="flex flex-wrap items-center justify-between gap-4 border-caution/40 bg-caution-soft/60 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-caution" aria-hidden />
              <div>
                <div className="font-semibold text-ink">
                  {needsInfo} {needsInfo === 1 ? 'scheme needs' : 'schemes need'} more information
                </div>
                <p className="text-sm text-ink-soft">
                  {missingFields.length
                    ? `Add: ${missingFields.join(', ')}`
                    : 'Complete the highlighted passport fields to verify these matches.'}
                </p>
              </div>
            </div>
            <Link to="/passport">
              <Button variant="secondary" size="sm">
                Complete passport <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Panel>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Top matches */}
        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-lavender" aria-hidden />
              <h3 className="text-lg font-semibold">Strongest matches</h3>
            </div>
            <Link to="/matches" className="inline-flex items-center py-1.5 -my-1.5 text-xs font-semibold text-lavender-ink underline">
              View all {allMatches.length}
            </Link>
          </div>

          {allMatches.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No matches yet. Complete your passport to start matching.
            </p>
          ) : (
            <ul className="divide-y divide-line-faint">
              {allMatches.slice(0, 4).map((m) => (
                <li key={m.scholarshipId} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/scholarships/${m.scholarshipId}`}
                      className="block truncate py-1 text-sm font-semibold text-ink hover:underline"
                    >
                      {m.scholarship.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-faint">
                      <span className="truncate">{m.scholarship.provider}</span>
                      <span aria-hidden>·</span>
                      <span className="data-value">{inr(m.scholarship.amount)}</span>
                    </div>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <Progress value={m.fitScore} tone={m.fitScore >= 80 ? 'eligible' : 'caution'} />
                  </div>
                  <TierBadge tier={m.tier} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Deadlines */}
        <Panel className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-lavender" aria-hidden />
            <h3 className="text-lg font-semibold">Closing soon</h3>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-soft">No upcoming deadlines in your matches.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((m) => {
                const dl = deadlineLabel(m.scholarship.deadline);
                const tone = dl.tone === 'urgent' ? 'stop' : dl.tone === 'soon' ? 'caution' : 'neutral';
                return (
                  <li key={m.scholarshipId} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/scholarships/${m.scholarshipId}`}
                        className="block truncate py-1 text-sm font-medium text-ink hover:underline"
                      >
                        {m.scholarship.title}
                      </Link>
                      <div className="text-xs text-ink-faint">
                        {shortDate(m.scholarship.deadline)}
                      </div>
                    </div>
                    <Badge tone={tone as never}>{dl.text}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Applications summary */}
      <Panel className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-lavender" aria-hidden />
            <h3 className="text-lg font-semibold">Application tracker</h3>
          </div>
          <Link to="/applications" className="inline-flex items-center py-1.5 -my-1.5 text-xs font-semibold text-lavender-ink underline">
            Manage
          </Link>
        </div>
        {applications.length === 0 ? (
          <p className="text-sm text-ink-soft">
            You are not tracking any applications yet. Open a match to begin.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {applications.slice(0, 4).map((a) => {
              const done = a.checklist.filter((c) => c.done).length;
              const pct = a.checklist.length ? (done / a.checklist.length) * 100 : 0;
              return (
                <div key={a._id} className="min-w-0 rounded-card border border-line-faint p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-ink">
                      {a.scholarship?.title}
                    </span>
                    <Badge tone="neutral">{a.status}</Badge>
                  </div>
                  <div className="mt-3">
                    <Progress value={pct} label={`${done}/${a.checklist.length} steps`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
