import { EXAM_SECTIONS, ExamSection } from '../domain/constants';
import { env } from '../config/env';
import type { IScholarship } from '../models/Scholarship';
import type { IQuestion } from '../models/MockTest';

export interface GeneratedQuestion {
  section: ExamSection;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SectionPlan {
  section: ExamSection;
  questions: number;
  topics: string[];
}

// ---------------------------------------------------------------------------
// Curated procedural question bank. Always available (offline / AI disabled)
// and used as a deterministic fallback when the LLM endpoint is unreachable.
// ---------------------------------------------------------------------------

type Template = {
  topic: string;
  build: (seed: number) => GeneratedQuestion;
};

function rand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return Math.floor(frac * (max - min + 1)) + min;
}

function quantTemplates(): Template[] {
  return [
    {
      topic: 'Percentages',
      build: (s) => {
        const price = rand(s, 200, 900);
        const pct = rand(s + 1, 10, 40);
        const answer = Math.round(price * (1 - pct / 100));
        return {
          section: 'Quantitative',
          topic: 'Percentages',
          prompt: `A scholarship stipend of ₹${price} is reduced by ${pct}%. What is the new amount?`,
          options: [
            `₹${answer}`,
            `₹${answer + 25}`,
            `₹${answer - 30}`,
            `₹${price - pct}`,
          ],
          correctIndex: 0,
          explanation: `${pct}% of ${price} = ${Math.round((price * pct) / 100)}, so ${price} − that = ${answer}.`,
          difficulty: 'easy',
        };
      },
    },
    {
      topic: 'Ratios',
      build: (s) => {
        const a = rand(s, 2, 6);
        const b = rand(s + 2, 3, 9);
        const total = (a + b) * rand(s + 3, 10, 40);
        const share = Math.round((total * a) / (a + b));
        return {
          section: 'Quantitative',
          topic: 'Ratios',
          prompt: `₹${total} is split between two students in the ratio ${a}:${b}. What is the larger share?`,
          options: [`₹${Math.round((total * b) / (a + b))}`, `₹${share}`, `₹${total / 2}`, `₹${total}`],
          correctIndex: 0,
          explanation: `Shares are ${a} and ${b} parts; the larger is ${b}/${a + b} of ${total}.`,
          difficulty: 'medium',
        };
      },
    },
    {
      topic: 'Averages',
      build: (s) => {
        const n = rand(s, 4, 6);
        const avg = rand(s + 1, 50, 80);
        const extra = rand(s + 2, 60, 95);
        const newAvg = Math.round((avg * n + extra) / (n + 1));
        return {
          section: 'Quantitative',
          topic: 'Averages',
          prompt: `A student has an average of ${avg}% over ${n} subjects. After scoring ${extra}% in one more subject, the new average is closest to:`,
          options: [`${newAvg}%`, `${avg}%`, `${extra}%`, `${avg + extra}%`],
          correctIndex: 0,
          explanation: `New average = (${avg}×${n} + ${extra}) / ${n + 1} ≈ ${newAvg}%.`,
          difficulty: 'medium',
        };
      },
    },
  ];
}

function verbalTemplates(): Template[] {
  const syn: [string, string[]][] = [
    ['Diligent', ['Hardworking', 'Lazy', 'Careless', 'Rude']],
    ['Prudent', ['Cautious', 'Reckless', 'Wealthy', 'Loud']],
    ['Concise', ['Brief', 'Lengthy', 'Vague', 'Harsh']],
    ['Adequate', ['Sufficient', 'Scarce', 'Costly', 'Slow']],
  ];
  return syn.map(([word, opts], i) => ({
    topic: 'Synonyms',
    build: (s) => {
      const correct = opts[0];
      const shuffled = [...opts];
      // deterministic rotation so the answer is not always first
      const shift = rand(s + i, 0, 3);
      const rotated = [...shuffled.slice(shift), ...shuffled.slice(0, shift)];
      return {
        section: 'Verbal',
        topic: 'Synonyms',
        prompt: `Choose the word closest in meaning to "${word}".`,
        options: rotated,
        correctIndex: rotated.indexOf(correct),
        explanation: `"${word}" means ${correct.toLowerCase()}.`,
        difficulty: 'easy',
      };
    },
  }));
}

function logicalTemplates(): Template[] {
  return [
    {
      topic: 'Number Series',
      build: (s) => {
        const start = rand(s, 2, 9);
        const step = rand(s + 1, 3, 9);
        const seq = [start, start + step, start + 2 * step, start + 3 * step];
        const answer = start + 4 * step;
        return {
          section: 'Logical',
          topic: 'Number Series',
          prompt: `Find the next number: ${seq.join(', ')}, ?`,
          options: [`${answer}`, `${answer + step}`, `${answer - 1}`, `${start + 5 * step}`],
          correctIndex: 0,
          explanation: `Each term increases by ${step}.`,
          difficulty: 'easy',
        };
      },
    },
    {
      topic: 'Odd One Out',
      build: (s) => {
        const groups = [
          { common: 'are prime numbers', items: ['2', '3', '5', '9'] },
          { common: 'are even numbers', items: ['4', '8', '12', '15'] },
          { common: 'are days of a work week', items: ['Mon', 'Tue', 'Wed', 'Sunday'] },
        ];
        const g = groups[rand(s, 0, groups.length - 1)];
        const correct = g.items[3];
        const options = [g.items[0], g.items[1], g.items[2], correct];
        return {
          section: 'Logical',
          topic: 'Odd One Out',
          prompt: `Which one does not belong with the others (${g.common})?`,
          options,
          correctIndex: 3,
          explanation: `Three of the options ${g.common}; "${correct}" does not.`,
          difficulty: 'medium',
        };
      },
    },
  ];
}

function gkTemplates(): Template[] {
  return [
    {
      topic: 'Government Schemes',
      build: () => ({
        section: 'General Knowledge',
        topic: 'Government Schemes',
        prompt: 'The National Scholarship Portal (NSP) is operated under which ministry?',
        options: [
          'Ministry of Education',
          'Ministry of Finance',
          'Ministry of Defence',
          'Ministry of Commerce',
        ],
        correctIndex: 0,
        explanation: 'NSP is the Government of India scholarship platform under the Ministry of Education.',
        difficulty: 'easy',
      }),
    },
    {
      topic: 'Education Basics',
      build: (s) => {
        const facts = [
          {
            prompt: 'AICTE regulates technical education at which level?',
            options: ['Undergraduate & Postgraduate technical courses', 'Primary school only', 'Only doctoral research', 'Only vocational training'],
            correctIndex: 0,
            explanation: 'AICTE oversees technical education institutions and programmes.',
          },
          {
            prompt: 'What does "CGPA" stand for?',
            options: ['Cumulative Grade Point Average', 'Central Grant Payment Amount', 'Certified Graduate Program Admission', 'Combined General Performance Analysis'],
            correctIndex: 0,
            explanation: 'CGPA is the Cumulative Grade Point Average.',
          },
        ];
        const f = facts[rand(s, 0, facts.length - 1)];
        return {
          section: 'General Knowledge',
          topic: 'Education Basics',
          prompt: f.prompt,
          options: f.options,
          correctIndex: f.correctIndex,
          explanation: f.explanation,
          difficulty: 'easy',
        };
      },
    },
  ];
}

const TEMPLATES: Record<ExamSection, Template[]> = {
  Quantitative: quantTemplates(),
  Verbal: verbalTemplates(),
  Logical: logicalTemplates(),
  'General Knowledge': gkTemplates(),
};

function curatedQuestions(plan: SectionPlan[]): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  plan.forEach((p, pi) => {
    const pool = TEMPLATES[p.section] ?? gkTemplates();
    for (let i = 0; i < p.questions; i += 1) {
      const template = pool[i % pool.length];
      out.push(template.build(pi * 100 + i + 1));
    }
  });
  return out;
}

/** Derive a sensible section plan from a scholarship's exam pattern. */
export function planFromScholarship(scholarship: IScholarship, total = 12): SectionPlan[] {
  const pattern = scholarship.examPattern;
  if (pattern?.sections?.length) {
    return pattern.sections.map((s) => {
      const section = (EXAM_SECTIONS as readonly string[]).includes(s.name)
        ? (s.name as ExamSection)
        : 'General Knowledge';
      return { section, questions: Math.max(1, s.questions || 3), topics: s.topics ?? [] };
    });
  }
  // Balanced default across the four canonical sections.
  const per = Math.max(1, Math.floor(total / EXAM_SECTIONS.length));
  return EXAM_SECTIONS.map((section) => ({
    section,
    questions: per,
    topics: [],
  }));
}

// ---------------------------------------------------------------------------
// LLM integration (OpenAI-compatible chat completions + HF inference).
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an exam question setter for Indian scholarship aptitude tests.
Return ONLY valid JSON matching this schema:
{"questions":[{"section":"Quantitative|Verbal|Logical|General Knowledge","topic":string,"prompt":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string,"difficulty":"easy|medium|hard"}]}
Rules: exactly one correct option at correctIndex; plausible distractors; no markdown; no extra keys.`;

async function callOpenAICompatible(plan: SectionPlan[], scholarship: IScholarship) {
  const res = await fetch(`${env.ai.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ai.apiKey}`,
    },
    body: JSON.stringify({
      model: env.ai.model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Scholarship: ${scholarship.title} (${scholarship.provider}).
Generate questions per this plan: ${JSON.stringify(plan)}.`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI provider error: ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(content) as { questions?: GeneratedQuestion[] };
}

function sanitize(raw: unknown, plan: SectionPlan[]): GeneratedQuestion[] | null {
  const parsed = raw as { questions?: unknown };
  if (!parsed?.questions || !Array.isArray(parsed.questions)) return null;
  const valid: GeneratedQuestion[] = [];
  for (const q of parsed.questions as GeneratedQuestion[]) {
    if (
      q &&
      typeof q.prompt === 'string' &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      typeof q.correctIndex === 'number' &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length &&
      (EXAM_SECTIONS as readonly string[]).includes(q.section)
    ) {
      valid.push({
        section: q.section,
        topic: q.topic || 'General',
        prompt: q.prompt,
        options: q.options.slice(0, 4),
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty ?? 'medium',
      });
    }
  }
  // Only trust AI output if it produced a reasonable number of questions.
  const expected = plan.reduce((n, p) => n + p.questions, 0);
  return valid.length >= Math.max(4, Math.floor(expected * 0.6)) ? valid : null;
}

export async function generateQuestions(
  scholarship: IScholarship,
  plan: SectionPlan[]
): Promise<{ questions: GeneratedQuestion[]; source: 'ai' | 'curated' }> {
  if (env.ai.provider !== 'disabled' && env.ai.apiKey) {
    try {
      const raw = await callOpenAICompatible(plan, scholarship);
      const cleaned = sanitize(raw, plan);
      if (cleaned) return { questions: cleaned, source: 'ai' };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ai] generation failed, using curated bank:', (err as Error).message);
    }
  }
  return { questions: curatedQuestions(plan), source: 'curated' };
}

// ---------------------------------------------------------------------------
// Scoring & readiness analytics.
// ---------------------------------------------------------------------------

export interface AttemptInput {
  section: string;
  topic: string;
  questionId: string;
  selectedIndex: number | null;
  timeSpentSeconds: number;
}

export interface ScoredAnswer {
  questionId: string;
  section: string;
  topic: string;
  selectedIndex: number | null;
  correct: boolean;
  timeSpentSeconds: number;
}

export interface AttemptScore {
  answers: ScoredAnswer[];
  score: number;
  maxScore: number;
  accuracy: number;
  sectionStats: { section: string; correct: number; total: number; avgSeconds: number }[];
  weakTopics: { topic: string; correct: number; total: number }[];
  readinessScore: number;
  avgSeconds: number;
}

const DIFFICULTY_MULTIPLIER: Record<string, number> = { easy: 1, medium: 1.5, hard: 2 };

export function scoreAttempt(questions: IQuestion[], inputs: AttemptInput[]): AttemptScore {
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  const answers: ScoredAnswer[] = inputs.map((a) => {
    const q = byId.get(String(a.questionId));
    const correct = Boolean(q && a.selectedIndex !== null && a.selectedIndex === q.correctIndex);
    return {
      questionId: String(a.questionId),
      section: q?.section ?? a.section,
      topic: q?.topic ?? a.topic,
      selectedIndex: a.selectedIndex,
      correct,
      timeSpentSeconds: a.timeSpentSeconds ?? 0,
    };
  });

  let maxScore = 0;
  let score = 0;
  answers.forEach((a) => {
    const q = byId.get(a.questionId);
    const weight = DIFFICULTY_MULTIPLIER[q?.difficulty ?? 'medium'] ?? 1;
    maxScore += weight;
    if (a.correct) score += weight;
  });

  const accuracy = answers.length ? Math.round((answers.filter((a) => a.correct).length / answers.length) * 100) : 0;
  const avgSeconds =
    answers.length ? Math.round(answers.reduce((s, a) => s + a.timeSpentSeconds, 0) / answers.length) : 0;

  const sectionMap = new Map<string, { correct: number; total: number; seconds: number }>();
  const topicMap = new Map<string, { correct: number; total: number }>();
  answers.forEach((a) => {
    const s = sectionMap.get(a.section) ?? { correct: 0, total: 0, seconds: 0 };
    s.total += 1;
    s.seconds += a.timeSpentSeconds;
    if (a.correct) s.correct += 1;
    sectionMap.set(a.section, s);

    const t = topicMap.get(a.topic) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (a.correct) t.correct += 1;
    topicMap.set(a.topic, t);
  });

  const sectionStats = [...sectionMap.entries()].map(([section, v]) => ({
    section,
    correct: v.correct,
    total: v.total,
    avgSeconds: Math.round(v.seconds / v.total),
  }));

  const weakTopics = [...topicMap.entries()]
    .map(([topic, v]) => ({ topic, correct: v.correct, total: v.total }))
    .filter((t) => t.correct / t.total < 0.6)
    .sort((a, b) => a.correct / a.total - b.correct / b.total);

  // Readiness blends accuracy (80%) with speed discipline (20%). Ideal pace is
  // ~45s/question; faster or slower both reduce the speed factor.
  const speedFactor = answers.length
    ? Math.max(0, 1 - Math.abs(avgSeconds - 45) / 90)
    : 0;
  const readinessScore = Math.round(accuracy * 0.8 + speedFactor * 100 * 0.2);

  return {
    answers,
    score: Math.round(score * 10) / 10,
    maxScore: Math.round(maxScore * 10) / 10,
    accuracy,
    sectionStats,
    weakTopics,
    readinessScore,
    avgSeconds,
  };
}

/**
 * Renewal eligibility tracker: compares a scholarship's renewal CGPA floor
 * with the passport's current standing to project maintainability.
 */
export function renewalOutlook(
  minimumCgpa: number | undefined,
  currentCgpa: number | undefined
): { status: 'on-track' | 'at-risk' | 'unknown'; gap: number | null } {
  if (minimumCgpa === undefined || currentCgpa === undefined) {
    return { status: 'unknown', gap: null };
  }
  const gap = Math.round((currentCgpa - minimumCgpa) * 100) / 100;
  if (gap >= 0.3) return { status: 'on-track', gap };
  if (gap >= 0) return { status: 'at-risk', gap };
  return { status: 'at-risk', gap };
}
