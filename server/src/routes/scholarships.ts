import { Router } from 'express';
import { Scholarship } from '../models/Scholarship';
import { asyncHandler, ApiError } from '../middleware/error';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { getOrCreatePassport } from '../services/passport';
import { completeness, evaluateScholarship } from '../services/matching';
import { runScraper } from '../services/scraper';
import { ScrapeRun } from '../models/ScrapeRun';

const router = Router();

/** GET /api/scholarships - search & filter the catalogue. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, type, degree, state, category, aptitudeTest, page = '1', limit = '20' } = req.query;
    const filter: Record<string, unknown> = { active: true };
    if (q) filter.$text = { $search: String(q) };
    if (type) filter.type = type;
    if (degree) filter.degree = degree;
    if (state) filter.stateDomicile = { $in: [state, 'All India'] };
    if (category) filter.category = category;
    if (aptitudeTest === 'true') filter.aptitudeTestRequired = true;

    const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(limit), 10) || 20));

    const [items, total] = await Promise.all([
      Scholarship.find(filter)
        .sort({ deadline: 1, amount: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Scholarship.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, pageSize });
  })
);

/** GET /api/scholarships/:id - record plus a per-user match breakdown. */
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) throw new ApiError(404, 'Scholarship not found');
    const passport = await getOrCreatePassport(req.user!._id);
    const evaluation = evaluateScholarship(scholarship, passport);
    res.json({
      scholarship,
      match: evaluation,
      profileCompleteness: completeness(passport),
    });
  })
);

/** POST /api/scholarships/admin/scrape - manual crawl trigger. */
router.post(
  '/admin/scrape',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const report = await runScraper();
    res.json(report);
  })
);

/** GET /api/scholarships/admin/scrape-runs - source audit trail. */
router.get(
  '/admin/scrape-runs',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const runs = await ScrapeRun.find().sort({ startedAt: -1 }).limit(50).lean();
    res.json({ runs });
  })
);

export default router;
