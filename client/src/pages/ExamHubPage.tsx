import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { planFromScholarship, renewalOutlook } from '@shared/exam.ts';
import { useMatches, usePassport, usePerformance, useScholarships } from '../lib/queries';
import { relativeTime } from '../lib/format';
import { Button, CountUp, Dial, Empty, ListSkeleton, Meter, PageTitle, SectionHead, Surface, Tag, riseDelay } from '../components/ui';

export default function ExamHubPage() {
  const perf = usePerformance();
  const matches = useMatches();
  const scholarships = useScholarships();
  const passport = usePassport();

  const tests = useMemo(() => {
    const matched = new Set((matches.data?.all ?? []).map((m) => m.scholarshipId));
    return (scholarships.data ?? [])
      .filter((s) => s.aptitude_test_required)
      .sort((a, b) => Number(matched.has(b.id)) - Number(matched.has(a.id)))
      .map((s) => ({ s, matched: matched.has(s.id) }));
  }, [matches.data, scholarships.data]);

  const p = perf.data;
  const mood = p.totalAttempts === 0 ? 'Take a first mock to see where you stand.' : p.readinessScore >= 70 ? 'You are in good shape. Keep the rhythm.' : 'A few more reps and you’ll be there.';

  return (
    <div>
      <PageTitle kicker="Practice" title="Prep" />

      <Surface tone="butter" grain className="flex items-center gap-6 rounded-5xl p-6 sm:p-8">
        <Dial value={p.readinessScore} size={112} stroke={9} color="rgb(var(--butter-ink))" track="rgb(var(--butter-ink) / 0.15)">
          <div className="text-center">
            <div className="num text-[34px] font-semibold leading-none">
              <CountUp value={p.readinessScore} />
            </div>
            <div className="mt-1 text-[11px] font-semibold opacity-70">ready</div>
          </div>
        </Dial>
        <div className="min-w-0">
          <div className="font-display text-[22px] font-semibold leading-tight">Exam readiness</div>
          <p className="mt-1.5 text-[14.5px] opacity-85">{mood}</p>
          {p.totalAttempts > 0 && (
            <p className="mt-2 text-[13px] font-semibold opacity-75">
              {p.totalAttempts} attempt{p.totalAttempts === 1 ? '' : 's'} · {p.averageAccuracy}% accuracy
            </p>
          )}
        </div>
      </Surface>

      {p.totalAttempts > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
          <Surface className="p-6">
            <h2 className="mb-4 text-[19px] font-semibold">Work on these</h2>
            {p.weakTopics.length === 0 ? (
              <p className="text-[14.5px] text-ink-2">No weak spots right now.</p>
            ) : (
              <ul className="space-y-3.5">
                {p.weakTopics.map((t) => (
                  <li key={t.topic}>
                    <div className="mb-1.5 flex justify-between text-[14.5px]">
                      <span className="font-medium">{t.topic}</span>
                      <span className="num text-ink-3">{t.accuracy}%</span>
                    </div>
                    <Meter value={t.accuracy} tone="butter" />
                  </li>
                ))}
              </ul>
            )}
          </Surface>
          <Surface className="p-6">
            <h2 className="mb-4 text-[19px] font-semibold">By section</h2>
            <ul className="space-y-3.5">
              {p.sections.map((s) => (
                <li key={s.section}>
                  <div className="mb-1.5 flex justify-between text-[14.5px]">
                    <span className="font-medium">{s.section}</span>
                    <span className="text-ink-3">
                      <span className="num text-ink">{s.accuracy}%</span> · {s.avgSeconds}s each
                    </span>
                  </div>
                  <Meter value={s.accuracy} tone={s.accuracy >= 70 ? 'sage' : 'ink'} />
                </li>
              ))}
            </ul>
            {p.strongTopics.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {p.strongTopics.map((t) => (
                  <Tag key={t.topic} tone="sage">
                    {t.topic} · {t.accuracy}%
                  </Tag>
                ))}
              </div>
            )}
          </Surface>
        </div>
      )}

      <SectionHead>Mock tests</SectionHead>
      {scholarships.isLoading ? (
        <ListSkeleton rows={3} />
      ) : tests.length === 0 ? (
        <Empty title="No tests right now" description="When a test-based scholarship joins the catalogue, its mock shows up here." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {tests.map(({ s, matched }, i) => {
            const plan = planFromScholarship(s);
            const total = plan.reduce((n, x) => n + x.questions, 0);
            const renewal = renewalOutlook(s.renewal_criteria?.minimumCgpa, passport.data?.cgpa);
            return (
              <li key={s.id} style={riseDelay(i)} className="surface min-w-0 animate-rise p-5">
                <div className="flex flex-wrap gap-1.5">
                  {matched && <Tag tone="sage">You match</Tag>}
                  {renewal.status !== 'unknown' && <Tag tone={renewal.status === 'on-track' ? 'sky' : 'butter'}>Renewal {renewal.status === 'on-track' ? 'on track' : 'at risk'}</Tag>}
                </div>
                <div className="mt-3 line-clamp-2 font-display text-[19px] font-semibold leading-snug">{s.title}</div>
                <div className="mt-0.5 truncate text-[13.5px] text-ink-3">{s.exam_pattern?.name ?? s.provider}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.map((x) => (
                    <Tag key={x.section}>
                      {x.section} · {x.questions}
                    </Tag>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-line pt-4">
                  <span className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2">
                    <Clock className="h-4 w-4" /> {total} questions · {s.exam_pattern?.durationMinutes ?? Math.max(15, total * 3)} min
                  </span>
                  <Link to={`/exams/${s.id}/take`}>
                    <Button size="sm">
                      Start <ArrowRight className="h-4 w-4" />
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
          <SectionHead>Recent attempts</SectionHead>
          <Surface className="divide-y divide-dashed divide-line overflow-hidden">
            {p.recent.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{a.scholarship?.title ?? 'Mock test'}</div>
                  <div className="text-[12.5px] text-ink-3">{relativeTime(a.completed_at)}</div>
                </div>
                <div className="text-right">
                  <div className="num text-[18px] font-semibold">{a.accuracy}%</div>
                  <div className="text-[12px] text-ink-3">
                    {a.score}/{a.max_score}
                  </div>
                </div>
              </div>
            ))}
          </Surface>
        </>
      )}
    </div>
  );
}
