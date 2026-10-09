import { ScholarshipPassport, IScholarshipPassport } from '../models/ScholarshipPassport';
import { Scholarship } from '../models/Scholarship';
import { completeness, matchAll, MatchResult, MatchReason } from './matching';
import { recordProfile } from './analytics';
import { Types } from 'mongoose';

export interface MatchedScholarship {
  scholarshipId: string;
  tier: MatchResult['tier'];
  fitScore: number;
  reasons: MatchReason[];
  missingFields: string[];
  scholarship: Record<string, unknown>;
}

/**
 * Recompute profile completeness and stamp the recalculation time. Called
 * whenever the passport changes so matched results are never stale.
 */
export async function recalculatePassport(
  passport: IScholarshipPassport
): Promise<IScholarshipPassport> {
  const { percent } = completeness(passport);
  passport.completeness = percent;
  passport.lastMatchedAt = new Date();
  await passport.save();
  await recordProfile(passport);
  return passport;
}

/**
 * Live matching for a passport. The matching engine is intentionally pure and
 * fast enough to run synchronously per request; the persisted `lastMatchedAt`
 * is what marks a background recalculation as complete.
 */
export async function getMatches(passport: IScholarshipPassport): Promise<MatchedScholarship[]> {
  const scholarships = await Scholarship.find({ active: true }).lean();
  const results = matchAll(scholarships as never, passport);
  const byId = new Map(scholarships.map((s) => [String(s._id), s]));

  return results.map((r) => {
    const doc = byId.get(String(r.scholarship));
    return {
      scholarshipId: String(r.scholarship),
      tier: r.tier,
      fitScore: r.fitScore,
      reasons: r.reasons,
      missingFields: r.missingFields,
      scholarship: doc as unknown as Record<string, unknown>,
    };
  });
}

export async function findPassportByUser(userId: string | Types.ObjectId) {
  return ScholarshipPassport.findOne({ user: userId });
}

export async function getOrCreatePassport(
  userId: string | Types.ObjectId
): Promise<IScholarshipPassport> {
  const existing = await ScholarshipPassport.findOne({ user: userId });
  if (existing) return existing;

  try {
    return await ScholarshipPassport.create({ user: userId });
  } catch (err) {
    // The dashboard prefetches several endpoints in parallel, so two requests
    // can race to create the first passport. On a duplicate-key error, read the
    // row the other request just inserted instead of failing with a 500.
    if ((err as { code?: number }).code === 11000) {
      const created = await ScholarshipPassport.findOne({ user: userId });
      if (created) return created;
    }
    throw err;
  }
}
