import { Schema, model, Document, Types } from 'mongoose';
import {
  CATEGORIES,
  DEGREES,
  DOCUMENT_TYPES,
  GENDERS,
  INCOME_BRACKETS,
  STATES,
} from '../domain/constants';

/**
 * Document registry entry. Files live in object storage; only the key/URL and
 * metadata are persisted here. `retentionUntilDate` implements the retention
 * policy engine (locked while an application is active, +180 days after
 * completion otherwise).
 */
export interface IPassportDocument {
  _id: Types.ObjectId;
  type: (typeof DOCUMENT_TYPES)[number];
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending_review' | 'verified' | 'rejected';
  // Active (in-use) documents never expire. Completed ones receive a date.
  retentionUntilDate: Date | null;
  uploadedAt: Date;
}

export interface IAcademic {
  institution?: string;
  course?: string;
  degree?: (typeof DEGREES)[number];
  currentYear?: string;
  class12Percentage?: number;
  cgpa?: number;
  entranceExamName?: string;
  entranceExamScore?: number;
}

export interface IDemographic {
  state?: (typeof STATES)[number];
  category?: (typeof CATEGORIES)[number];
  incomeBracket?: (typeof INCOME_BRACKETS)[number];
  gender?: (typeof GENDERS)[number];
  disabilityStatus?: boolean;
}

export interface IScholarshipPassport extends Document<Types.ObjectId> {
  user: Types.ObjectId;
  fullName?: string;
  phone?: string;
  academic: IAcademic;
  demographic: IDemographic;
  documents: Types.DocumentArray<IPassportDocument>;
  completeness: number;
  lastMatchedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const passportDocumentSchema = new Schema<IPassportDocument>(
  {
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    fileName: { type: String, required: true },
    storageKey: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    sizeBytes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending_review', 'verified', 'rejected'],
      default: 'pending_review',
    },
    retentionUntilDate: { type: Date, default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const academicSchema = new Schema<IAcademic>(
  {
    institution: { type: String, trim: true },
    course: { type: String, trim: true },
    degree: { type: String, enum: DEGREES },
    currentYear: { type: String, trim: true },
    class12Percentage: { type: Number, min: 0, max: 100 },
    cgpa: { type: Number, min: 0, max: 10 },
    entranceExamName: { type: String, trim: true },
    entranceExamScore: { type: Number },
  },
  { _id: false }
);

const demographicSchema = new Schema<IDemographic>(
  {
    state: { type: String, enum: STATES },
    category: { type: String, enum: CATEGORIES },
    incomeBracket: { type: String, enum: INCOME_BRACKETS },
    gender: { type: String, enum: GENDERS },
    disabilityStatus: { type: Boolean, default: false },
  },
  { _id: false }
);

const passportSchema = new Schema<IScholarshipPassport>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    // Contact metadata intentionally minimal and optional; no national IDs.
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true, select: false },
    academic: { type: academicSchema, default: () => ({}) },
    demographic: { type: demographicSchema, default: () => ({}) },
    documents: { type: [passportDocumentSchema], default: [] },
    completeness: { type: Number, default: 0 },
    lastMatchedAt: { type: Date, default: null },
  },
  // `minimize: false` keeps the empty `academic` / `demographic` subdocuments
  // that Mongoose would otherwise strip. The client binds its form to both, so
  // the API must always return them (a missing object crashed the passport page).
  { timestamps: true, minimize: false }
);

export const ScholarshipPassport = model<IScholarshipPassport>(
  'ScholarshipPassport',
  passportSchema
);
