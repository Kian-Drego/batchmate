import { AnalyticsProfile } from '../models/AnalyticsProfile';
import type { IScholarshipPassport } from '../models/ScholarshipPassport';
import type { ApplicationStatus, ScholarshipType } from '../domain/constants';

/**
 * Derive the anonymised bucket for a passport. Only coarse demographic
 * dimensions are used; no identifiers are read or written here.
 */
function bucketOf(passport: IScholarshipPassport) {
  return {
    state: passport.demographic?.state ?? 'Unknown',
    incomeTier: passport.demographic?.incomeBracket ?? 'Unknown',
    targetDegree: passport.academic?.degree ?? 'Unknown',
    category: passport.demographic?.category ?? 'Unknown',
    gender: passport.demographic?.gender ?? 'Unknown',
    disabilityStatus: Boolean(passport.demographic?.disabilityStatus),
  };
}

async function bump(passport: IScholarshipPassport, inc: Record<string, number>) {
  const filter = bucketOf(passport);
  await AnalyticsProfile.updateOne(
    filter,
    { $inc: inc, $setOnInsert: filter },
    { upsert: true }
  );
}

export async function recordProfile(passport: IScholarshipPassport): Promise<void> {
  await bump(passport, { totalProfiles: 1 });
}

export async function recordApplicationStarted(passport: IScholarshipPassport): Promise<void> {
  await bump(passport, { applicationsStarted: 1 });
}

export async function recordApplicationStatus(
  passport: IScholarshipPassport,
  status: ApplicationStatus,
  scholarshipType?: ScholarshipType
): Promise<void> {
  if (status === 'Submitted' || status === 'Verification Pending') {
    await bump(passport, { applicationsSubmitted: 1 });
  }
  if (status === 'Awarded') {
    await bump(passport, { awarded: 1 });
  }
  if (status === 'Rejected') {
    await bump(passport, { rejected: 1 });
  }
  if (status === 'Awarded' && scholarshipType) {
    const filter = bucketOf(passport);
    const existing = await AnalyticsProfile.findOneAndUpdate(
      filter,
      { $setOnInsert: filter },
      { upsert: true, new: true }
    );
    if (existing) {
      const row = existing.awardedScholarshipTypes.find((r) => r.type === scholarshipType);
      if (row) row.count += 1;
      else existing.awardedScholarshipTypes.push({ type: scholarshipType, count: 1 });
      await existing.save();
    }
  }
}

export interface AnalyticsInsights {
  totals: { profiles: number; applicationsStarted: number; submitted: number; awarded: number; rejected: number };
  byState: { key: string; total: number; awarded: number }[];
  byIncomeTier: { key: string; total: number }[];
  byDegree: { key: string; total: number }[];
  awardedByType: { key: string; count: number }[];
}

export async function getInsights(): Promise<AnalyticsInsights> {
  const [totalsAgg] = await AnalyticsProfile.aggregate([
    {
      $group: {
        _id: null,
        profiles: { $sum: '$totalProfiles' },
        applicationsStarted: { $sum: '$applicationsStarted' },
        submitted: { $sum: '$applicationsSubmitted' },
        awarded: { $sum: '$awarded' },
        rejected: { $sum: '$rejected' },
      },
    },
  ]);

  const groupBy = (field: string, sortField = 'total') =>
    AnalyticsProfile.aggregate([
      {
        $group: {
          _id: `$${field}`,
          total: { $sum: '$totalProfiles' },
          awarded: { $sum: '$awarded' },
        },
      },
      { $sort: { [sortField]: -1 } },
      { $limit: 12 },
      { $project: { _id: 0, key: '$_id', total: 1, awarded: 1 } },
    ]);

  const [byState, byIncomeTier, byDegree, awardedByType] = await Promise.all([
    groupBy('state'),
    groupBy('incomeTier'),
    groupBy('targetDegree'),
    AnalyticsProfile.aggregate([
      { $unwind: '$awardedScholarshipTypes' },
      { $group: { _id: '$awardedScholarshipTypes.type', count: { $sum: '$awardedScholarshipTypes.count' } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, key: '$_id', count: 1 } },
    ]),
  ]);

  return {
    totals: {
      profiles: totalsAgg?.profiles ?? 0,
      applicationsStarted: totalsAgg?.applicationsStarted ?? 0,
      submitted: totalsAgg?.submitted ?? 0,
      awarded: totalsAgg?.awarded ?? 0,
      rejected: totalsAgg?.rejected ?? 0,
    },
    byState,
    byIncomeTier: byIncomeTier.map((r) => ({ key: r.key, total: r.total })),
    byDegree: byDegree.map((r) => ({ key: r.key, total: r.total })),
    awardedByType: awardedByType as { key: string; count: number }[],
  };
}
