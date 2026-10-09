import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, RefreshCw, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import type { Blueprint, Match, MatchResponse, Performance } from '../lib/types';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Panel,
  Progress,
  SectionHeader,
  Spinner,
  Stat,
} from '../components/ui';

export default function ExamHubPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [blueprints, setBlueprints] = useState<Record<string, Blueprint>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<MatchResponse>('/passport/matches'),
      api.get<Performance>('/exams/performance'),
    ])
      .then(([m, p]) => {
        setMatches(m.matches);
        setPerformance(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const examMatches = useMemo(
    () => matches.filter((m) => m.scholarship.aptitudeTestRequired || m.scholarship.examPattern),
    [matches]
  );

  useEffect(() => {
    examMatches.forEach((m) => {
      api
        .get<Blueprint>(`/exams/${m.scholarshipId}/blueprint`)
        .then((b) => setBlueprints((prev) => ({ ...prev, [m.scholarshipId]: b })))
        .catch(() => undefined);
    });
  }, [examMatches]);

  const generate = async (scholarshipId: string) => {
    setGenerating(scholarshipId);
    setError(null);
    try {
      await api.post(`/exams/${scholarshipId}/generate`);
      navigate(`/exams/${scholarshipId}/take`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Exam & readiness hub"
        title="Aptitude preparation"
        description="Generate topic-wise mock tests for aptitude-based scholarships, then track readiness, weak topics and attempt speed."
      />

      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {/* Performance summary */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-lavender" aria-hidden />
          <h3 className="text-lg font-semibold">Your readiness</h3>
        </div>
        {performance && performance.totalAttempts > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat label="Readiness score" value={performance.readinessScore} tone={performance.readinessScore >= 70 ? 'eligible' : 'caution'} />
              <Stat label="Average accuracy" value={`${performance.averageAccuracy}%`} />
              <Stat label="Attempts" value={performance.totalAttempts} />
              <Stat
                label="Weak topics"
                value={performance.weakTopics.length}
                tone={performance.weakTopics.length ? 'caution' : 'eligible'}
              />
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <TrendingDown className="h-4 w-4 text-caution" /> Needs work
                </div>
                {performance.weakTopics.length === 0 ? (
                  <p className="text-sm text-ink-soft">No weak topics detected yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {performance.weakTopics.map((t) => (
                      <li key={t.topic}>
                        <div className="mb-1 flex justify-between text-xs text-ink-soft">
                          <span>{t.topic}</span>
                          <span className="data-value">{t.accuracy}%</span>
                        </div>
                        <Progress value={t.accuracy} tone="caution" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-eligible" /> Section accuracy
                </div>
                <ul className="space-y-2">
                  {performance.sections.map((s) => (
                    <li key={s.section}>
                      <div className="mb-1 flex justify-between text-xs text-ink-soft">
                        <span>{s.section}</span>
                        <span className="data-value">
                          {s.accuracy}% · {s.avgSeconds}s/q
                        </span>
                      </div>
                      <Progress value={s.accuracy} tone={s.accuracy >= 70 ? 'eligible' : 'caution'} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            No attempts yet. Generate a mock test below to establish your baseline readiness score.
          </p>
        )}
      </Panel>

      {/* Exam-backed scholarships */}
      {examMatches.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No aptitude-based scholarships in your matches"
          description="When a matched scholarship requires an aptitude test, its mock tests will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {examMatches.map((m) => {
            const bp = blueprints[m.scholarshipId];
            return (
              <Panel key={m.scholarshipId} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-semibold text-ink">
                      {m.scholarship.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink-soft">{m.scholarship.provider}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {bp?.examPattern?.name && <Badge tone="lavender">{bp.examPattern.name}</Badge>}
                      {bp && (
                        <Badge tone="neutral">
                          <Timer className="h-3 w-3" /> {bp.examPattern?.durationMinutes ?? 30} min
                        </Badge>
                      )}
                      {bp?.renewal && bp.renewal.status !== 'unknown' && (
                        <Badge tone={bp.renewal.status === 'on-track' ? 'eligible' : 'caution'}>
                          Renewal {bp.renewal.status === 'on-track' ? 'on track' : 'at risk'}
                        </Badge>
                      )}
                    </div>

                    {bp && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bp.blueprint.map((s) => (
                          <span
                            key={s.section}
                            className="rounded-pill border border-line-faint bg-paper-sunken px-2.5 py-0.5 text-[11px] text-ink-soft"
                          >
                            {s.section} · {s.questions}Q
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={() => generate(m.scholarshipId)} loading={generating === m.scholarshipId}>
                    <RefreshCw className="h-4 w-4" /> Generate mock test
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
