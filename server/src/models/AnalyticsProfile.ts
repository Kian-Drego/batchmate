import { Schema, model, Document, Types } from 'mongoose';
import { CATEGORIES, DEGREES, GENDERS, INCOME_BRACKETS, STATES } from '../domain/constants';

/**
 * Anonymised analytics bucket.
 *
 * This collection is deliberately decoupled from `User` and
 * `ScholarshipPassport`. It stores counts of demographic combinations only —
 * never a name, email, phone number, document URL or any field that could be
 * re-associated with an individual. Writes are upserts that increment counters.
 */
export interface IAnalyticsProfile extends Document<Types.ObjectId> {
  state: string;
  incomeTier: string;
  targetDegree: string;
  category: string;
  gender: string;
  disabilityStatus: boolean;
  totalProfiles: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  awarded: number;
  rejected: number;
  awardedScholarshipTypes: { type: string; count: number }[];
  updatedAt: Date;
}

const awardedTypeSchema = new Schema(
  { type: { type: String, required: true }, count: { type: Number, default: 0 } },
  { _id: false }
);

const analyticsProfileSchema = new Schema<IAnalyticsProfile>(
  {
    state: { type: String, enum: [...STATES, 'Unknown'], default: 'Unknown' },
    incomeTier: { type: String, enum: [...INCOME_BRACKETS, 'Unknown'], default: 'Unknown' },
    targetDegree: { type: String, enum: [...DEGREES, 'Unknown'], default: 'Unknown' },
    category: { type: String, enum: [...CATEGORIES, 'Unknown'], default: 'Unknown' },
    gender: { type: String, enum: [...GENDERS, 'Unknown'], default: 'Unknown' },
    disabilityStatus: { type: Boolean, default: false },
    totalProfiles: { type: Number, default: 0 },
    applicationsStarted: { type: Number, default: 0 },
    applicationsSubmitted: { type: Number, default: 0 },
    awarded: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    awardedScholarshipTypes: { type: [awardedTypeSchema], default: [] },
  },
  { timestamps: true }
);

analyticsProfileSchema.index(
  { state: 1, incomeTier: 1, targetDegree: 1, category: 1, gender: 1, disabilityStatus: 1 },
  { unique: true }
);

export const AnalyticsProfile = model<IAnalyticsProfile>(
  'AnalyticsProfile',
  analyticsProfileSchema
);
