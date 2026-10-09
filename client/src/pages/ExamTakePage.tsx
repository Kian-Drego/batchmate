import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Clock, Grid2x2, X } from 'lucide-react';
import { useMockTest, useSubmitMock, type AttemptResult } from '../lib/queries';
import { tick } from '../lib/haptics';
import { Button, CountUp, Dial, Empty, IconButton, Meter, Notice, Sheet, Spinner, Surface, Tag, cn } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function fmt(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function Results({ result, onRetry }: { result: AttemptResult; onRetry: () => void }) {
  const a = result.attempt;
  const headline = a.accuracy >= 80 ? 'Beautifully done.' : a.accuracy >= 60 ? 'Solid run.' : a.accuracy >= 40 ? 'Getting there.' : 'Run it back.';
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Surface tone="sage" grain className="flex flex-col items-center rounded-5xl px-6 py-9 text-center">
        <m.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <Dial value={a.accuracy} size={156} stroke={11} color="rgb(var(--sage-ink))" track="rgb(var(--sage-ink) / 0.15)">
            <div>
              <div className="num text-[46px] font-semibold leading-none">
                <CountUp value={a.accuracy} suffix="%" />
              </div>
              <div className="mt-1 text-[12px] font-semibold opacity-70">accuracy</div>
            </div>
          </Dial>
        </m.div>
        <h1 className="mt-5 text-[30px] font-semibold">{headline}</h1>
        <p className="mt-1 text-[14.5px] opacity-80">
          Score {a.score}/{a.maxScore} · {a.avgSeconds}s per question · readiness {a.readinessScore}
        </p>
      </Surface>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {a.sectionStats.map((s) => (
          <Surface key={s.section} className="p-4">
            <div className="truncate text-[12.5px] text-ink-3">{s.section}</div>
            <div className="num text-[24px] font-semibold">
              {s.correct}/{s.total}
            </div>
            <div className="text-[12px] text-ink-3">{s.avgSeconds}s each</div>
          </Surface>
        ))}
      </div>

      {a.weakTopics.length > 0 && (
        <Notice tone="butter" className="mt-3">
          Next, focus on <b className="font-semibold">{a.weakTopics.map((t) => t.topic).join(', ')}</b>.
        </Notice>
      )}

      <h2 className="mb-3 mt-9 px-1 text-[21px] font-semibold">Review</h2>
      <ol className="space-y-3">
        {result.review.map((r, i) => (
          <li key={r.questionId} className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] font-semibold text-ink-3">
                Q{i + 1} · {r.topic}
              </span>
              <Tag tone={r.correct ? 'sage' : r.selectedIndex === null ? 'butter' : 'rose'}>{r.correct ? 'Correct' : r.selectedIndex === null ? 'Skipped' : 'Missed'}</Tag>
            </div>
            <p className="mt-2 text-[15px] font-medium leading-relaxed">{r.prompt}</p>
            <ul className="mt-3 space-y-1.5">
              {r.options.map((o, oi) => (
                <li
                  key={oi}
                  className={cn(
                    'rounded-2xl px-3.5 py-2 text-[14px]',
                    oi === r.correctIndex ? 'bg-sage font-semibold text-sage-ink' : oi === r.selectedIndex ? 'bg-rose text-rose-ink line-through' : 'text-ink-2'
                  )}
                >
                  {LETTERS[oi]}. {o}
                </li>
              ))}
            </ul>
            {r.explanation && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{r.explanation}</p>}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex gap-2">
        <Link to="/exams" className="flex-1">
          <Button variant="soft" size="lg" block>
            Back to Prep
          </Button>
        </Link>
        <Button size="lg" className="flex-1" onClick={onRetry}>
          Try again
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

  useEffect(() => {
    if (!started || result) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [started, result]);

  useEffect(() => {
    if (started && !result && remaining === 0 && data) {
      toast('Time’s up — submitting');
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

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
        <p className="text-[14.5px] text-ink-2">Setting your paper…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16">
        <Empty
          title="Couldn't load the test"
          description={(error as Error)?.message ?? 'Try again in a moment.'}
          action={
            <div className="flex gap-2">
              <Button variant="soft" onClick={() => navigate(-1)}>
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
        <IconButton label="Close" onClick={() => navigate(-1)} className="-ml-1 border border-line bg-card shadow-soft">
          <X className="h-5 w-5" />
        </IconButton>
        <div className="flex flex-1 flex-col justify-center">
          <span className="text-[13px] font-semibold text-ink-3">{t.source === 'ai' ? 'Freshly generated paper' : 'Curated paper'}</span>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.05]">{t.title}</h1>
          <div className="mt-7 grid grid-cols-3 gap-2">
            {[
              [t.totalQuestions, 'questions'],
              [t.durationMinutes, 'minutes'],
              [t.negativeMarking || 0, 'negative'],
            ].map(([v, l]) => (
              <Surface key={l as string} className="p-4 text-center">
                <div className="num text-[30px] font-semibold leading-none">{v}</div>
                <div className="mt-1 text-[12.5px] text-ink-3">{l}</div>
              </Surface>
            ))}
          </div>
          <ul className="mt-7 space-y-2.5 text-[14.5px] text-ink-2">
            <li>Tap an option to choose it, tap again to clear.</li>
            <li>Jump around freely with the question grid.</li>
            <li>The paper submits itself when time runs out.</li>
          </ul>
        </div>
        <Button size="lg" block onClick={begin}>
          Begin <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  const answered = questions.filter((x) => answers[x.id] != null).length;
  const lowTime = remaining <= 60;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-20 bg-canvas/95 px-4 pt-safe-t">
        <div className="flex h-16 items-center gap-3">
          <IconButton
            label="Quit test"
            className="-ml-1 border border-line bg-card shadow-soft"
            onClick={() => {
              if (window.confirm('Leave this test? Your answers will be lost.')) navigate('/exams');
            }}
          >
            <X className="h-5 w-5" />
          </IconButton>
          <div className="flex-1">
            <span className="num text-[18px] font-semibold">{index + 1}</span>
            <span className="text-[14px] text-ink-3"> of {questions.length}</span>
          </div>
          <div className={cn('num inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] font-semibold shadow-soft', lowTime ? 'bg-peach text-peach-ink' : 'bg-card')}>
            <Clock className="h-4 w-4" /> {fmt(remaining)}
          </div>
        </div>
        <Meter value={((index + 1) / questions.length) * 100} className="mb-2 h-1.5" />
      </header>

      <main className="relative flex-1 overflow-hidden px-4 py-6">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <m.div
            key={q.id}
            custom={direction}
            initial={{ x: direction * 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <div className="flex flex-wrap gap-1.5">
              <Tag tone="lilac">{q.section}</Tag>
              <Tag>{q.topic}</Tag>
            </div>
            <p className="mt-5 font-display text-[23px] font-semibold leading-snug">{q.prompt}</p>
            <ul className="mt-6 space-y-2.5">
              {q.options.map((o, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <li key={oi}>
                    <button
                      onClick={() => choose(oi)}
                      className={cn(
                        'press flex min-h-[60px] w-full items-center gap-4 rounded-3xl px-4 py-3 text-left text-[15.5px]',
                        selected ? 'bg-primary text-primary-fg shadow-key' : 'border border-line bg-card shadow-soft'
                      )}
                    >
                      <span className={cn('num flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold', selected ? 'bg-primary-fg/15' : 'bg-sunken')}>
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

      <footer className="sticky bottom-0 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-center gap-1.5 rounded-full border border-line/70 bg-card p-1.5 shadow-lift">
          <Button variant="ghost" size="lg" iconOnly onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous question">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => setPaletteOpen(true)}>
            <Grid2x2 className="h-4 w-4" /> {answered}/{questions.length} answered
          </Button>
          {index < questions.length - 1 ? (
            <Button size="lg" iconOnly onClick={() => go(index + 1)} aria-label="Next question">
              <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="lg" onClick={doSubmit} loading={submit.isPending}>
              <Check className="h-4 w-4" /> Submit
            </Button>
          )}
        </div>
      </footer>

      <Sheet
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        title="All questions"
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
            Submit paper
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
                'press num flex h-12 items-center justify-center rounded-2xl text-[16px] font-semibold',
                answers[x.id] != null ? 'bg-primary text-primary-fg shadow-key' : 'bg-sunken text-ink-2 shadow-well',
                i === index && 'ring-2 ring-accent ring-offset-2 ring-offset-card'
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
