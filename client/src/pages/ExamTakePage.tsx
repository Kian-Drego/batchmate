import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Clock, Grid3x3, Sparkles, X, XCircle } from 'lucide-react';
import { useMockTest, useSubmitMock, type AttemptResult } from '../lib/queries';
import { tick } from '../lib/haptics';
import { Alert, Badge, Button, Card, CountUp, EmptyState, IconButton, Progress, Ring, Sheet, Spinner, cn } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function Results({ result, onRetry }: { result: AttemptResult; onRetry: () => void }) {
  const a = result.attempt;
  const tone = a.accuracy >= 70 ? 'mint' : a.accuracy >= 40 ? 'accent' : 'warn';
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex flex-col items-center text-center">
        <m.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Ring value={a.accuracy} size={148} stroke={11} tone={tone}>
            <div>
              <div className="font-mono text-4xl font-bold tabular-nums">
                <CountUp value={a.accuracy} suffix="%" />
              </div>
              <div className="text-[12px] font-semibold text-fg-faint">ACCURACY</div>
            </div>
          </Ring>
        </m.div>
        <h1 className="mt-5 text-2xl font-extrabold">
          {a.accuracy >= 80 ? 'Crushed it 🔥' : a.accuracy >= 60 ? 'Solid run 💪' : a.accuracy >= 40 ? 'Getting there' : 'Rough one. Run it back.'}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Score {a.score}/{a.maxScore} · {a.avgSeconds}s per question · readiness {a.readinessScore}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {a.sectionStats.map((s) => (
          <Card key={s.section} className="p-3.5">
            <div className="truncate text-[12px] text-fg-faint">{s.section}</div>
            <div className="font-mono text-lg font-bold tabular-nums">
              {s.correct}/{s.total}
            </div>
            <div className="text-[11px] text-fg-faint">{s.avgSeconds}s avg</div>
          </Card>
        ))}
      </div>

      {a.weakTopics.length > 0 && (
        <div className="mt-4">
          <Alert tone="warn">
            Focus next on: <b>{a.weakTopics.map((t) => t.topic).join(', ')}</b>
          </Alert>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-[17px] font-bold">Review</h2>
      <ol className="space-y-3">
        {result.review.map((r, i) => (
          <li key={r.questionId} className={cn('card p-4', r.correct ? 'border-mint/25' : 'border-danger/25')}>
            <div className="flex items-start gap-3">
              {r.correct ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-mint" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-fg-faint">
                  Q{i + 1} · {r.section} · {r.topic}
                </div>
                <p className="mt-1 text-sm font-medium leading-relaxed">{r.prompt}</p>
                <ul className="mt-2 space-y-1">
                  {r.options.map((o, oi) => (
                    <li
                      key={oi}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-[13px]',
                        oi === r.correctIndex && 'bg-mint-soft font-semibold text-mint',
                        oi === r.selectedIndex && oi !== r.correctIndex && 'bg-danger-soft text-danger line-through'
                      )}
                    >
                      {LETTERS[oi]}. {o}
                    </li>
                  ))}
                </ul>
                {r.selectedIndex === null && <div className="mt-1 text-[12px] text-warn">Skipped</div>}
                {r.explanation && <p className="mt-2 text-[13px] text-fg-muted">💡 {r.explanation}</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex gap-2">
        <Link to="/exams" className="flex-1">
          <Button variant="secondary" size="lg" block>
            Back to Prep
          </Button>
        </Link>
        <Button size="lg" className="flex-1" onClick={onRetry}>
          Retake
        </Button>
      </div>
    </div>
  );
}

export default function ExamTakePage() {
  const { scholarshipId } = useParams<{ scholarshipId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useMockTest(scholarshipId);
  const submit = useSubmitMock();

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const enteredAt = useRef(Date.now());

  const questions = data?.questions ?? [];
  const q = questions[index];

  const recordTime = useCallback(() => {
    if (!q) return;
    const secs = Math.round((Date.now() - enteredAt.current) / 1000);
    setTimeSpent((t) => ({ ...t, [q.id]: (t[q.id] ?? 0) + secs }));
    enteredAt.current = Date.now();
  }, [q]);

  const doSubmit = useCallback(() => {
    if (!data || submit.isPending) return;
    const secs = q ? Math.round((Date.now() - enteredAt.current) / 1000) : 0;
    const finalTimes = q ? { ...timeSpent, [q.id]: (timeSpent[q.id] ?? 0) + secs } : timeSpent;
    submit.mutate(
      {
        mockTestId: data.mockTest.id,
        answers: questions.map((x) => ({ questionId: x.id, selectedIndex: answers[x.id] ?? null, timeSpentSeconds: finalTimes[x.id] ?? 0 })),
      },
      {
        onSuccess: (r) => {
          tick([10, 50, 10]);
          setResult(r);
          window.scrollTo({ top: 0 });
        },
        onError: (e) => toast.error(e.message),
      }
    );
  }, [data, q, questions, answers, timeSpent, submit]);

  // Countdown
  useEffect(() => {
    if (!started || result) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [started, result]);

  useEffect(() => {
    if (started && !result && remaining === 0 && data) {
      toast('⏰ Time’s up — submitting');
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // Warn before leaving mid-test.
  useEffect(() => {
    if (!started || result) return;
    const fn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [started, result]);

  const go = (next: number) => {
    if (next < 0 || next >= questions.length) return;
    recordTime();
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const choose = (opt: number) => {
    if (!q) return;
    tick(6);
    setAnswers((a) => ({ ...a, [q.id]: a[q.id] === opt ? null : opt }));
  };

  const begin = () => {
    if (!data) return;
    setRemaining(data.mockTest.durationMinutes * 60);
    enteredAt.current = Date.now();
    setStarted(true);
  };

  const retry = () => {
    setResult(null);
    setAnswers({});
    setTimeSpent({});
    setIndex(0);
    setStarted(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <Spinner className="h-7 w-7" />
        <p className="text-sm text-fg-muted">Building your mock test…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16">
        <EmptyState
          icon={XCircle}
          title="Couldn't load the test"
          description={(error as Error)?.message ?? 'Try again in a moment.'}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Go back
              </Button>
              <Button onClick={() => void refetch()}>Retry</Button>
            </div>
          }
        />
      </div>
    );
  }

  if (result) return <Results result={result} onRetry={retry} />;

  const t = data.mockTest;

  if (!started) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-[calc(1rem+env(safe-area-inset-top))]">
        <IconButton label="Close" onClick={() => navigate(-1)} className="-ml-2">
          <X className="h-5 w-5" />
        </IconButton>
        <div className="flex flex-1 flex-col justify-center">
          <Badge tone="accent" className="self-start">
            {t.source === 'ai' ? (
              <>
                <Sparkles className="h-3 w-3" /> AI-generated
              </>
            ) : (
              'Curated'
            )}
          </Badge>
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight">{t.title}</h1>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Card className="p-3.5 text-center">
              <div className="font-mono text-2xl font-bold">{t.totalQuestions}</div>
              <div className="text-[12px] text-fg-faint">questions</div>
            </Card>
            <Card className="p-3.5 text-center">
              <div className="font-mono text-2xl font-bold">{t.durationMinutes}</div>
              <div className="text-[12px] text-fg-faint">minutes</div>
            </Card>
            <Card className="p-3.5 text-center">
              <div className="font-mono text-2xl font-bold">{t.negativeMarking || 0}</div>
              <div className="text-[12px] text-fg-faint">negative</div>
            </Card>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-fg-muted">
            <li>• Tap an option to select, tap again to clear.</li>
            <li>• Jump between questions anytime with the grid.</li>
            <li>• The test auto-submits when time runs out.</li>
          </ul>
        </div>
        <Button size="lg" block onClick={begin}>
          Start test <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  const answered = questions.filter((x) => answers[x.id] != null).length;
  const lowTime = remaining <= 60;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 px-4 pt-safe-t">
        <div className="flex h-14 items-center gap-3">
          <IconButton
            label="Quit test"
            className="-ml-2"
            onClick={() => {
              if (window.confirm('Quit this test? Your answers will be lost.')) navigate('/exams');
            }}
          >
            <X className="h-5 w-5" />
          </IconButton>
          <div className="flex-1 text-sm font-semibold">
            {index + 1} <span className="text-fg-faint">/ {questions.length}</span>
          </div>
          <div className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold tabular-nums', lowTime ? 'bg-hot-soft text-hot' : 'bg-surface-2')}>
            <Clock className="h-4 w-4" /> {fmt(remaining)}
          </div>
        </div>
        <Progress value={((index + 1) / questions.length) * 100} className="mb-2 h-1" />
      </header>

      {/* Question */}
      <main className="relative flex-1 overflow-hidden px-4 py-5">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <m.div
            key={q.id}
            custom={direction}
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="accent">{q.section}</Badge>
              <Badge>{q.topic}</Badge>
              <Badge tone={q.difficulty === 'hard' ? 'hot' : q.difficulty === 'medium' ? 'warn' : 'mint'}>{q.difficulty}</Badge>
            </div>
            <p className="mt-4 text-[17px] font-semibold leading-relaxed">{q.prompt}</p>
            <ul className="mt-5 space-y-2.5">
              {q.options.map((o, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <li key={oi}>
                    <button
                      onClick={() => choose(oi)}
                      className={cn(
                        'tap flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] transition-[border-color,background-color,box-shadow] duration-150',
                        selected ? 'border-accent bg-accent-soft shadow-glow-sm' : 'border-line bg-surface hover:border-line-strong'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold transition-colors',
                          selected ? 'bg-accent text-accent-fg' : 'bg-surface-3 text-fg-muted'
                        )}
                      >
                        {LETTERS[oi]}
                      </span>
                      <span className="font-medium">{o}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </m.div>
        </AnimatePresence>
      </main>

      {/* Bottom bar */}
      <footer className="sticky bottom-0 border-t border-line bg-bg/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="lg" iconOnly onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous question">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => setPaletteOpen(true)}>
            <Grid3x3 className="h-4 w-4" /> {answered}/{questions.length} answered
          </Button>
          {index < questions.length - 1 ? (
            <Button size="lg" iconOnly onClick={() => go(index + 1)} aria-label="Next question">
              <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="lg" onClick={doSubmit} loading={submit.isPending}>
              Submit
            </Button>
          )}
        </div>
      </footer>

      <Sheet
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        title="Questions"
        subtitle={`${answered} answered · ${questions.length - answered} left`}
        footer={
          <Button
            block
            size="lg"
            loading={submit.isPending}
            onClick={() => {
              if (answered < questions.length && !window.confirm(`${questions.length - answered} unanswered. Submit anyway?`)) return;
              setPaletteOpen(false);
              doSubmit();
            }}
          >
            Submit test
          </Button>
        }
      >
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {questions.map((x, i) => (
            <button
              key={x.id}
              onClick={() => {
                go(i);
                setPaletteOpen(false);
              }}
              className={cn(
                'tap flex h-12 items-center justify-center rounded-xl border font-mono text-sm font-bold',
                i === index && 'border-accent shadow-glow-sm',
                answers[x.id] != null ? 'border-mint/40 bg-mint-soft text-mint' : 'border-line bg-surface-2 text-fg-muted'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
