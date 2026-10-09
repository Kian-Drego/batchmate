import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ChevronRight, Clock, Flame, GraduationCap, Target, TrendingUp } from 'lucide-react';
import { planFromScholarship, renewalOutlook } from '@shared/exam.ts';
import { useMatches, usePassport, usePerformance, useScholarships } from '../lib/queries';
import { relativeTime } from '../lib/format';
import { Badge, Button, Card, CountUp, EmptyState, ListSkeleton, PageHeader, Progress, Ring, SectionTitle, Stat } from '../components/ui';

export default function ExamHubPage() {
  const perf = usePerformance();
  const matches = useMatches();
  const scholarships = useScholarships();
  const passport = usePassport();

  // Matched scholarships with a test first, then any other test-based scholarship.
  const tests = useMemo(() => {
    const matchedIds = new Set((matches.data?.all ?? []).map((m) => m.scholarshipId));
    return (scholarships.data ?? [])
      .filter((s) => s.aptitude_test_required)
      .sort((a, b) => Number(matchedIds.has(b.id)) - Number(matchedIds.has(a.id)))
      .map((s) => ({ s, matched: matchedIds.has(s.id) }));
  }, [matches.data, scholarships.data]);

  const p = perf.data;

  return (
    <div>
      <PageHeader eyebrow="Prep" title="Exam readiness" description="Timed mock tests modelled on each scholarship's real pattern. We track your weak spots so you don't have to." />

      {/* Readiness */}
      <Card className="flex items-center gap-5 rounded-3xl p-5" glow={p.readinessScore >= 70}>
        <Ring value={p.readinessScore} size={96} stroke={8} tone={p.readinessScore >= 70 ? 'mint' : p.readinessScore >= 40 ? 'accent' : 'warn'}>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold leading-none tabular-nums">
              <CountUp value={p.readinessScore} />
            </div>
            <div className="mt-1 text-[10px] font-semibold text-fg-faint">READY</div>
          </div>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold">
            {p.totalAttempts === 0 ? 'Take your first mock' : p.readinessScore >= 70 ? "You're exam-ready 🔥" : 'Keep the streak going'}
          </div>
          <p className="mt-1 text-[13px] text-fg-muted">
            {p.totalAttempts === 0
              ? 'Your readiness score blends accuracy and pace across every attempt.'
              : `${p.totalAttempts} attempt${p.totalAttempts === 1 ? '' : 's'} · ${p.averageAccuracy}% average accuracy`}
          </p>
        </div>
      </Card>

      {p.totalAttempts > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Attempts" value={p.totalAttempts} tone="accent" />
            <Stat label="Avg accuracy" value={`${p.averageAccuracy}%`} tone="mint" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
                <Flame className="h-[18px] w-[18px] text-hot" /> Work on these
              </h2>
              {p.weakTopics.length === 0 ? (
                <p className="text-sm text-fg-muted">No weak topics. Nice.</p>
              ) : (
                <ul className="space-y-3">
                  {p.weakTopics.map((t) => (
                    <li key={t.topic}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{t.topic}</span>
                        <span className="font-mono tabular-nums text-warn">{t.accuracy}%</span>
                      </div>
                      <Progress value={t.accuracy} tone="warn" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
                <TrendingUp className="h-[18px] w-[18px] text-mint" /> By section
              </h2>
              <ul className="space-y-3">
                {p.sections.map((s) => (
                  <li key={s.section}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{s.section}</span>
                      <span className="text-fg-faint">
                        <span className="font-mono tabular-nums text-fg">{s.accuracy}%</span> · {s.avgSeconds}s/q
                      </span>
                    </div>
                    <Progress value={s.accuracy} tone={s.accuracy >= 70 ? 'mint' : 'accent'} />
                  </li>
                ))}
              </ul>
              {p.strongTopics.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.strongTopics.map((t) => (
                    <Badge key={t.topic} tone="mint">
                      {t.topic} {t.accuracy}%
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Target className="h-[18px] w-[18px] text-accent" /> Mock tests
        </span>
      </SectionTitle>
      {scholarships.isLoading ? (
        <ListSkeleton rows={3} />
      ) : tests.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No test-based scholarships right now" description="When one appears in the catalogue, its mock test shows up here." />
      ) : (
        <ul className="space-y-3">
          {tests.map(({ s, matched }) => {
            const plan = planFromScholarship(s);
            const total = plan.reduce((n, x) => n + x.questions, 0);
            const renewal = renewalOutlook(s.renewal_criteria?.minimumCgpa, passport.data?.cgpa);
            return (
              <li key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {matched && <Badge tone="mint">Matched</Badge>}
                      {renewal.status !== 'unknown' && (
                        <Badge tone={renewal.status === 'on-track' ? 'mint' : 'warn'}>
                          Renewal {renewal.status === 'on-track' ? 'on track' : 'at risk'}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 font-bold leading-snug">{s.title}</div>
                    <div className="mt-0.5 truncate text-[13px] text-fg-muted">{s.exam_pattern?.name ?? s.provider}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.map((x) => (
                    <Badge key={x.section}>
                      {x.section} · {x.questions}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-3 text-[13px] text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <Brain className="h-4 w-4" /> {total} Qs
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {s.exam_pattern?.durationMinutes ?? Math.max(15, total * 3)} min
                    </span>
                  </span>
                  <Link to={`/exams/${s.id}/take`}>
                    <Button size="sm">
                      Start <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {p.recent.length > 0 && (
        <>
          <SectionTitle>Recent attempts</SectionTitle>
          <ul className="card divide-y divide-line">
            {p.recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{a.scholarship?.title ?? 'Mock test'}</div>
                  <div className="text-[12px] text-fg-faint">{relativeTime(a.completed_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold tabular-nums">{a.accuracy}%</div>
                  <div className="text-[11px] text-fg-faint">
                    {a.score}/{a.max_score}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
