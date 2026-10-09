import { Router, Response } from 'express';
import { z } from 'zod';
import { Scholarship } from '../models/Scholarship';
import { MockTest } from '../models/MockTest';
import { ExamAttempt } from '../models/ExamAttempt';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import { validateBody } from '../middleware/validate';
import { EXAM_SECTIONS } from '../domain/constants';
import {
  generateQuestions,
  planFromScholarship,
  renewalOutlook,
  scoreAttempt,
} from '../services/exam';
import { getOrCreatePassport } from '../services/passport';

const router = Router();
router.use(requireAuth);

function publicQuestion(q: { _id: unknown; section: string; topic: string; prompt: string; options: string[]; difficulty: string }) {
  return {
    id: String(q._id),
    section: q.section,
    topic: q.topic,
    prompt: q.prompt,
    options: q.options,
    difficulty: q.difficulty,
  };
}

/** GET /api/exams/:scholarshipId/blueprint - pattern, syllabus, renewal. */
router.get(
  '/:scholarshipId/blueprint',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const scholarship = await Scholarship.findById(req.params.scholarshipId).lean();
    if (!scholarship) throw new ApiError(404, 'Scholarship not found');
    const plan = planFromScholarship(scholarship as never);
    const passport = await getOrCreatePassport(req.user!._id);
    const renewal = renewalOutlook(
      scholarship.renewalCriteria?.minimumCgpa,
      passport.academic?.cgpa
    );
    res.json({
      aptitudeTestRequired: scholarship.aptitudeTestRequired,
      examPattern: scholarship.examPattern ?? null,
      blueprint: plan,
      renewal,
      renewalCriteria: scholarship.renewalCriteria ?? null,
    });
  })
);

/** POST /api/exams/:scholarshipId/generate - build (or fetch) a mock test. */
router.post(
  '/:scholarshipId/generate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const scholarship = await Scholarship.findById(req.params.scholarshipId);
    if (!scholarship) throw new ApiError(404, 'Scholarship not found');

    // Reuse a previously generated test for the same scholarship when present.
    let mock = await MockTest.findOne({ scholarship: scholarship._id }).sort({ createdAt: -1 });
    if (!mock) {
      const plan = planFromScholarship(scholarship);
      const { questions, source } = await generateQuestions(scholarship, plan);
      const sectionMinutes = plan.reduce((n, p) => n + Math.max(5, p.questions * 3), 0);
      mock = await MockTest.create({
        scholarship: scholarship._id,
        title: `${scholarship.title} - Mock Test`,
        durationMinutes: scholarship.examPattern?.durationMinutes ?? sectionMinutes,
        negativeMarking: scholarship.examPattern?.negativeMarking ?? 0,
        questions,
        source,
      });
    }

    res.status(201).json({
      mockTest: {
        id: String(mock._id),
        title: mock.title,
        durationMinutes: mock.durationMinutes,
        negativeMarking: mock.negativeMarking,
        source: mock.source,
        totalQuestions: mock.questions.length,
      },
      questions: mock.questions.map(publicQuestion),
    });
  })
);

/** GET /api/exams/mock/:id - fetch a test without revealing answers. */
router.get(
  '/mock/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const mock = await MockTest.findById(req.params.id);
    if (!mock) throw new ApiError(404, 'Mock test not found');
    res.json({
      mockTest: {
        id: String(mock._id),
        title: mock.title,
        durationMinutes: mock.durationMinutes,
        negativeMarking: mock.negativeMarking,
        source: mock.source,
        totalQuestions: mock.questions.length,
      },
      questions: mock.questions.map(publicQuestion),
    });
  })
);

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedIndex: z.number().int().min(0).max(10).nullable(),
        timeSpentSeconds: z.number().min(0).default(0),
      })
    )
    .min(1),
});

/** POST /api/exams/mock/:id/submit - score and store the attempt. */
router.post(
  '/mock/:id/submit',
  validateBody(submitSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const mock = await MockTest.findById(req.params.id);
    if (!mock) throw new ApiError(404, 'Mock test not found');

    const inputs = (req.body as z.infer<typeof submitSchema>).answers.map((a) => {
      const q = mock.questions.id(a.questionId);
      return {
        questionId: a.questionId,
        section: q?.section ?? 'General Knowledge',
        topic: q?.topic ?? 'General',
        selectedIndex: a.selectedIndex,
        timeSpentSeconds: a.timeSpentSeconds,
      };
    });

    const scored = scoreAttempt(mock.questions as never, inputs);

    const correctIndexById = new Map(
      mock.questions.map((q) => [String(q._id), q.correctIndex])
    );

    const attempt = await ExamAttempt.create({
      user: req.user!._id,
      scholarship: mock.scholarship,
      mockTest: mock._id,
      answers: scored.answers.map((a) => ({
        questionId: a.questionId,
        section: a.section,
        topic: a.topic,
        selectedIndex: a.selectedIndex,
        correct: a.correct,
        timeSpentSeconds: a.timeSpentSeconds,
      })),
      score: scored.score,
      maxScore: scored.maxScore,
      accuracy: scored.accuracy,
      readinessScore: scored.readinessScore,
      sectionStats: scored.sectionStats,
      completedAt: new Date(),
    });

    res.status(201).json({
      attempt: {
        id: String(attempt._id),
        score: scored.score,
        maxScore: scored.maxScore,
        accuracy: scored.accuracy,
        readinessScore: scored.readinessScore,
        avgSeconds: scored.avgSeconds,
        sectionStats: scored.sectionStats,
        weakTopics: scored.weakTopics,
      },
      review: scored.answers.map((a) => ({
        ...a,
        correctIndex: correctIndexById.get(a.questionId) ?? null,
      })),
    });
  })
);

/** GET /api/exams/performance - aggregated readiness analytics for the user. */
router.get(
  '/performance',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const attempts = await ExamAttempt.find({ user: req.user!._id })
      .sort({ createdAt: -1 })
      .populate('scholarship', 'title provider')
      .lean();

    const topicMap = new Map<string, { correct: number; total: number }>();
    const sectionAgg = new Map<string, { correct: number; total: number; seconds: number; attempts: number }>();

    attempts.forEach((attempt) => {
      attempt.answers.forEach((a) => {
        const t = topicMap.get(a.topic) ?? { correct: 0, total: 0 };
        t.total += 1;
        if (a.correct) t.correct += 1;
        topicMap.set(a.topic, t);
      });
      attempt.sectionStats.forEach((s) => {
        const agg = sectionAgg.get(s.section) ?? { correct: 0, total: 0, seconds: 0, attempts: 0 };
        agg.correct += s.correct;
        agg.total += s.total;
        agg.seconds += s.avgSeconds;
        agg.attempts += 1;
        sectionAgg.set(s.section, agg);
      });
    });

    const topics = [...topicMap.entries()].map(([topic, v]) => ({
      topic,
      correct: v.correct,
      total: v.total,
      accuracy: Math.round((v.correct / v.total) * 100),
    }));

    const readiness = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.readinessScore, 0) / attempts.length)
      : 0;

    res.json({
      totalAttempts: attempts.length,
      readinessScore: readiness,
      averageAccuracy: attempts.length
        ? Math.round(attempts.reduce((s, a) => s + a.accuracy, 0) / attempts.length)
        : 0,
      weakTopics: topics
        .filter((t) => t.accuracy < 60)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 8),
      strongTopics: topics.filter((t) => t.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy).slice(0, 8),
      sections: [...sectionAgg.entries()].map(([section, v]) => ({
        section,
        accuracy: Math.round((v.correct / v.total) * 100),
        avgSeconds: Math.round(v.seconds / v.attempts),
        total: v.total,
      })),
      recentAttempts: attempts.slice(0, 10).map((a) => ({
        id: String(a._id),
        scholarship: a.scholarship,
        score: a.score,
        maxScore: a.maxScore,
        accuracy: a.accuracy,
        readinessScore: a.readinessScore,
        completedAt: a.completedAt,
      })),
    });
  })
);

export default router;
