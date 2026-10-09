import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { getInsights } from '../services/analytics';

const router = Router();

/**
 * GET /api/analytics/insights
 * Demographics-only aggregate. Backed by the anonymised AnalyticsProfile
 * collection which contains no identifiers.
 */
router.get(
  '/insights',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const insights = await getInsights();
    res.json(insights);
  })
);

export default router;
