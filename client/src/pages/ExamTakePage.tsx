import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AttemptResult, MockTestPayload } from '../lib/types';
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

type Phase = 'loading' | 'intro' | 'taking' | 'result';

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ExamTakePage() {
  const { scholarshipId } = useParams<{ scholarshipId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [payload, setPayload] = useState<MockTestPayload | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const questionStart = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!scholarshipId) return;
    api
      .post<MockTestPayload>(`/exams/${scholarshipId}/generate`)
      .then((p) => {
        setPayload(p);
        setRemaining(p.mockTest.durationMinutes * 60);
        setPhase('intro');
      })
      .catch((err) => setError((err as Error).message));
  }, [scholarshipId]);

  // Countdown timer while the test is running.
  useEffect(() => {
    if (phase !== 'taking') return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          void submit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const recordTime = () => {
    if (!payload) return;
    const q = payload.questions[current];
    const elapsed = Math.round((Date.now() - questionStart.current) / 1000);
    setTimeSpent((prev) => ({ ...prev, [q.id]: (prev[q.id] ?? 0) + elapsed }));
    questionStart.current = Date.now();
  };

  const goTo = (index: number) => {
    recordTime();
    setCurrent(index);
  };

  const start = () => {
    questionStart.current = Date.now();
    setPhase('taking');
  };

  const submit = async (auto = false) => {
    if (!payload || submittedRef.current) return;
    submittedRef.current = true;
    if (!auto) recordTime();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        answers: payload.questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id] ?? null,
          timeSpentSeconds: timeSpent[q.id] ?? 0,
        })),
      };
      const data = await api.post<AttemptResult>(
        `/exams/mock/${payload.mockTest.id}/submit`,
        body
      );
      setResult(data);
      setPhase('result');
    } catch (err) {
      setError((err as Error).message);
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v !== null && v !== undefined).length,
    [answers]
  );

  if (phase === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error && !payload) {
    return (
      <EmptyState
        icon={XCircle}
        title="Could not load the mock test"
        description={error}
        action={
          <Link to="/exams">
            <Button variant="secondary" size="sm">
              Back to exam hub
            </Button>
          </Link>
        }
      />
    );
  }

  if (!payload) return null;

  // ---- Intro --------------------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate('/exams')}
          className="mb-2 inline-flex min-h-[2.5rem] items-center gap-1.5 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Exam hub
        </button>
        <Panel className="p-6">
          <Badge tone="lavender">Mock test ready</Badge>
          <h1 className="mt-3 font-serif text-2xl font-semibold">{payload.mockTest.title}</h1>
          <div className="mt-4 grid grid-cols-3 gap-4 border-y border-line-faint py-4">
            <Stat label="Questions" value={payload.mockTest.totalQuestions} />
            <Stat label="Duration" value={`${payload.mockTest.durationMinutes}m`} />
            <Stat label="Source" value={payload.mockTest.source === 'ai' ? 'AI generated' : 'Curated'} />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>· One question at a time with a countdown timer.</li>
            <li>· Your time per question feeds the speed component of readiness.</li>
            <li>· The test auto-submits when time runs out.</li>
          </ul>
          <Button className="mt-6 w-full" onClick={start}>
            Start test <ArrowRight className="h-4 w-4" />
          </Button>
        </Panel>
      </div>
    );
  }

  // ---- Taking -------------------------------------------------------------
  if (phase === 'taking') {
    const q = payload.questions[current];
    const last = current === payload.questions.length - 1;
    const low = remaining <= 60;

    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-ink-soft">
            Question <span className="data-value font-semibold text-ink">{current + 1}</span> /{' '}
            {payload.questions.length}
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-card border px-3 py-1.5 font-mono text-sm font-semibold ${
              low ? 'border-stop bg-stop-soft text-stop' : 'border-line bg-paper-raised'
            }`}
          >
            <Clock className="h-4 w-4" /> {formatClock(remaining)}
          </div>
        </div>

        <div className="mb-4">
          <Progress value={((current + 1) / payload.questions.length) * 100} />
        </div>

        <Panel className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="neutral">{q.section}</Badge>
            <Badge tone="neutral">{q.topic}</Badge>
          </div>
          <p className="text-lg font-medium leading-relaxed text-ink">{q.prompt}</p>

          <div className="mt-5 space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                  className={`flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left text-sm transition-colors ${
                    selected
                      ? 'border-lavender bg-lavender-soft font-medium text-lavender-ink'
                      : 'border-line-faint hover:bg-paper-sunken'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border font-mono text-xs ${
                      selected ? 'border-lavender bg-lavender text-paper' : 'border-line-faint text-ink-faint'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </Panel>

        {error && (
          <div className="mt-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="secondary" disabled={current === 0} onClick={() => goTo(current - 1)}>
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-ink-faint">{answeredCount} answered</span>
          {last ? (
            <Button onClick={() => submit()} loading={submitting}>
              <Flag className="h-4 w-4" /> Submit test
            </Button>
          ) : (
            <Button onClick={() => goTo(current + 1)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---- Result -------------------------------------------------------------
  const attempt = result?.attempt;
  const review = result?.review ?? [];
  const questionsById = new Map(payload.questions.map((qq) => [qq.id, qq]));

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        eyebrow="Mock test result"
        title="Performance breakdown"
        description="Readiness blends accuracy with attempt speed. Review each question below."
      />

      {attempt && (
        <Panel className="p-5">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat
              label="Readiness"
              value={attempt.readinessScore}
              tone={attempt.readinessScore >= 70 ? 'eligible' : 'caution'}
            />
            <Stat label="Accuracy" value={`${attempt.accuracy}%`} />
            <Stat label="Score" value={`${attempt.score}/${attempt.maxScore}`} />
            <Stat label="Avg / question" value={`${attempt.avgSeconds}s`} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold">Sections</h4>
              <ul className="space-y-2">
                {attempt.sectionStats.map((s) => (
                  <li key={s.section}>
                    <div className="mb-1 flex justify-between text-xs text-ink-soft">
                      <span>{s.section}</span>
                      <span className="data-value">
                        {s.correct}/{s.total} · {s.avgSeconds}s
                      </span>
                    </div>
                    <Progress
                      value={s.total ? (s.correct / s.total) * 100 : 0}
                      tone={(s.correct / s.total) * 100 >= 70 ? 'eligible' : 'caution'}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Weak topics</h4>
              {attempt.weakTopics.length === 0 ? (
                <p className="text-sm text-ink-soft">None — strong across all topics.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {attempt.weakTopics.map((t) => (
                    <li key={t.topic}>
                      <Badge tone="caution">
                        {t.topic} · {t.correct}/{t.total}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-2 border-t border-line-faint pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                submittedRef.current = false;
                setAnswers({});
                setTimeSpent({});
                setCurrent(0);
                setResult(null);
                setRemaining(payload.mockTest.durationMinutes * 60);
                setPhase('taking');
                questionStart.current = Date.now();
              }}
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
            <Link to="/exams">
              <Button variant="ghost">Back to hub</Button>
            </Link>
          </div>
        </Panel>
      )}

      <div className="mt-6 space-y-3">
        {review.map((r, i) => {
          const q = questionsById.get(r.questionId);
          if (!q) return null;
          return (
            <Panel key={r.questionId} flat className="p-4">
              <div className="flex items-start gap-3">
                {r.correct ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-eligible" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-stop" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                    <span className="data-value">Q{i + 1}</span>
                    <Badge tone="neutral">{r.topic}</Badge>
                  </div>
                  <p className="text-sm font-medium text-ink">{q.prompt}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className={r.selectedIndex === r.correctIndex ? 'text-eligible' : 'text-stop'}>
                      Your answer: {r.selectedIndex === null ? 'Not answered' : q.options[r.selectedIndex]}
                    </div>
                    {!r.correct && r.correctIndex !== null && (
                      <div className="text-eligible">Correct: {q.options[r.correctIndex]}</div>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
