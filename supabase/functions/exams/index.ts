/**
 * Exams Edge Function.
 *   POST { action: 'generate', scholarshipId, fresh? } -> mock test (answers stripped)
 *   POST { action: 'get', mockTestId }                 -> mock test (answers stripped)
 *   POST { action: 'submit', mockTestId, answers[] }   -> scored attempt + review
 * Answers never leave the server until a test is submitted.
 */
import { adminClient, handle, HttpError, json, requireUser } from '../_shared/http.ts';
import { assertNoSensitiveFields } from '../_shared/privacy.ts';
import {
  generateQuestions,
  planFromScholarship,
  scoreAttempt,
  type AiConfig,
  type StoredQuestion,
} from '../_shared/exam.ts';

const ai: AiConfig = {
  provider: Deno.env.get('AI_PROVIDER') === 'openai-compatible' ? 'openai-compatible' : 'disabled',
  baseUrl: Deno.env.get('AI_BASE_URL') ?? 'https://api.groq.com/openai/v1',
  apiKey: Deno.env.get('AI_API_KEY') ?? '',
  model: Deno.env.get('AI_MODEL') ?? 'llama-3.1-8b-instant',
};

interface MockTestRow {
  id: string;
  scholarship_id: string;
  title: string;
  duration_minutes: number;
  negative_marking: number;
  questions: StoredQuestion[];
  source: 'ai' | 'curated';
}

function publicTest(m: MockTestRow) {
  return {
    mockTest: {
      id: m.id,
      scholarshipId: m.scholarship_id,
      title: m.title,
      durationMinutes: m.duration_minutes,
      negativeMarking: Number(m.negative_marking),
      source: m.source,
      totalQuestions: m.questions.length,
    },
    questions: m.questions.map(({ id, section, topic, prompt, options, difficulty }) => ({
      id,
      section,
      topic,
      prompt,
      options,
      difficulty,
    })),
  };
}

const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

interface AnswerInput {
  questionId?: unknown;
  selectedIndex?: unknown;
  timeSpentSeconds?: unknown;
}

Deno.serve(
  handle(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const db = adminClient();
    const user = await requireUser(req, db);
    const body = await req.json().catch(() => ({}));
    assertNoSensitiveFields(body);

    switch (body.action) {
      case 'generate': {
        if (!isUuid(body.scholarshipId)) throw new HttpError(400, 'scholarshipId is required');
        const { data: existing } = await db
          .from('mock_tests')
          .select('*')
          .eq('scholarship_id', body.scholarshipId)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing && !body.fresh) return json(req, publicTest(existing as MockTestRow));

        const { data: s } = await db
          .from('scholarships')
          .select('*')
          .eq('id', body.scholarshipId)
          .maybeSingle();
        if (!s) throw new HttpError(404, 'Scholarship not found');

        const plan = planFromScholarship(s);
        const { questions, source } = await generateQuestions(s, plan, ai);
        const stored: StoredQuestion[] = questions.map((q) => ({ ...q, id: crypto.randomUUID() }));
        const sectionMinutes = plan.reduce((n, p) => n + Math.max(5, p.questions * 3), 0);
        const { data: created, error } = await db
          .from('mock_tests')
          .insert({
            scholarship_id: s.id,
            title: `${s.title} — Mock Test`,
            duration_minutes: s.exam_pattern?.durationMinutes ?? sectionMinutes,
            negative_marking: s.exam_pattern?.negativeMarking ?? 0,
            questions: stored,
            source,
          })
          .select('*')
          .single();
        if (error) throw error;
        return json(req, publicTest(created as MockTestRow), 201);
      }

      case 'get': {
        if (!isUuid(body.mockTestId)) throw new HttpError(400, 'mockTestId is required');
        const { data } = await db.from('mock_tests').select('*').eq('id', body.mockTestId).maybeSingle();
        if (!data) throw new HttpError(404, 'Mock test not found');
        return json(req, publicTest(data as MockTestRow));
      }

      case 'submit': {
        if (!isUuid(body.mockTestId)) throw new HttpError(400, 'mockTestId is required');
        if (!Array.isArray(body.answers) || body.answers.length === 0 || body.answers.length > 200) {
          throw new HttpError(400, 'answers must be a non-empty array');
        }
        const { data } = await db.from('mock_tests').select('*').eq('id', body.mockTestId).maybeSingle();
        if (!data) throw new HttpError(404, 'Mock test not found');
        const mock = data as MockTestRow;
        const byId = new Map(mock.questions.map((q) => [q.id, q]));

        const seen = new Set<string>();
        const inputs = (body.answers as AnswerInput[])
          .filter((a) => {
            const id = a?.questionId;
            if (typeof id !== 'string' || !byId.has(id) || seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .map((a) => {
            const q = byId.get(a.questionId as string)!;
            const sel = Number.isInteger(a.selectedIndex) ? (a.selectedIndex as number) : null;
            return {
              questionId: q.id,
              section: q.section,
              topic: q.topic,
              selectedIndex: sel !== null && sel >= 0 && sel < q.options.length ? sel : null,
              timeSpentSeconds: Math.max(0, Math.min(3600, Number(a.timeSpentSeconds) || 0)),
            };
          });
        if (inputs.length === 0) throw new HttpError(400, 'No valid answers supplied');

        const scored = scoreAttempt(mock.questions, inputs);
        const { data: attempt, error } = await db
          .from('exam_attempts')
          .insert({
            user_id: user.id,
            scholarship_id: mock.scholarship_id,
            mock_test_id: mock.id,
            answers: scored.answers,
            score: scored.score,
            max_score: scored.maxScore,
            accuracy: scored.accuracy,
            readiness_score: scored.readinessScore,
            avg_seconds: scored.avgSeconds,
            section_stats: scored.sectionStats,
            weak_topics: scored.weakTopics,
          })
          .select('id')
          .single();
        if (error) throw error;

        return json(
          req,
          {
            attempt: {
              id: attempt.id,
              score: scored.score,
              maxScore: scored.maxScore,
              accuracy: scored.accuracy,
              readinessScore: scored.readinessScore,
              avgSeconds: scored.avgSeconds,
              sectionStats: scored.sectionStats,
              weakTopics: scored.weakTopics,
            },
            review: scored.answers.map((a) => {
              const q = byId.get(a.questionId)!;
              return { ...a, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation ?? null };
            }),
          },
          201
        );
      }

      default:
        throw new HttpError(400, 'Unknown action');
    }
  })
);
