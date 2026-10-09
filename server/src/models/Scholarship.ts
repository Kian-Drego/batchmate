import { Schema, model, Document, Types } from 'mongoose';
import {
  CATEGORIES,
  DEGREES,
  DOCUMENT_TYPES,
  GENDERS,
  SCHOLARSHIP_TYPES,
  STATES,
} from '../domain/constants';

export interface IRenewalCriteria {
  minimumCgpa?: number;
  minimumAttendance?: number;
  notes?: string;
}

export interface IExamSectionSpec {
  name: string;
  questions: number;
  durationMinutes: number;
  topics: string[];
}

export interface IExamPattern {
  name?: string;
  durationMinutes: number;
  totalQuestions?: number;
  negativeMarking?: number;
  sections: IExamSectionSpec[];
}

export interface IScholarship extends Document<Types.ObjectId> {
  provider: string;
  title: string;
  type: (typeof SCHOLARSHIP_TYPES)[number];
  amount: number;
  amountDescription?: string;
  degree: (typeof DEGREES)[number][];
  currentYearAllowed: string[];
  incomeLimit?: number;
  marksMin?: number;
  category: (typeof CATEGORIES)[number][];
  stateDomicile: string[];
  gender: string[];
  deadline?: Date;
  requiredDocuments: (typeof DOCUMENT_TYPES)[number][];
  selectionProcess: string[];
  aptitudeTestRequired: boolean;
  renewalCriteria?: IRenewalCriteria;
  officialSourceUrl: string;
  lastScrapedAt: Date;
  // Application mode
  applicationMode: 'native' | 'external';
  externalPortalUrl?: string;
  applicationSteps: string[];
  description?: string;
  examPattern?: IExamPattern;
  tags: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const renewalSchema = new Schema<IRenewalCriteria>(
  {
    minimumCgpa: { type: Number },
    minimumAttendance: { type: Number },
    notes: { type: String },
  },
  { _id: false }
);

const examSectionSchema = new Schema<IExamSectionSpec>(
  {
    name: { type: String, required: true },
    questions: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
    topics: { type: [String], default: [] },
  },
  { _id: false }
);

const examPatternSchema = new Schema<IExamPattern>(
  {
    name: { type: String },
    durationMinutes: { type: Number, default: 60 },
    totalQuestions: { type: Number, default: 0 },
    negativeMarking: { type: Number, default: 0 },
    sections: { type: [examSectionSchema], default: [] },
  },
  { _id: false }
);

const scholarshipSchema = new Schema<IScholarship>(
  {
    provider: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: SCHOLARSHIP_TYPES, required: true },
    amount: { type: Number, required: true, default: 0 },
    amountDescription: { type: String },
    degree: { type: [String], enum: DEGREES, default: [] },
    currentYearAllowed: { type: [String], default: [] },
    incomeLimit: { type: Number },
    marksMin: { type: Number },
    category: { type: [String], enum: CATEGORIES, default: [] },
    stateDomicile: { type: [String], default: [] },
    gender: { type: [String], default: [] },
    deadline: { type: Date },
    requiredDocuments: { type: [String], enum: DOCUMENT_TYPES, default: [] },
    selectionProcess: { type: [String], default: [] },
    aptitudeTestRequired: { type: Boolean, default: false },
    renewalCriteria: { type: renewalSchema },
    officialSourceUrl: { type: String, required: true },
    lastScrapedAt: { type: Date, default: Date.now },
    applicationMode: { type: String, enum: ['native', 'external'], default: 'external' },
    externalPortalUrl: { type: String },
    applicationSteps: { type: [String], default: [] },
    description: { type: String },
    examPattern: { type: examPatternSchema },
    tags: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

scholarshipSchema.index({ provider: 'text', title: 'text', tags: 'text' });

export const Scholarship = model<IScholarship>('Scholarship', scholarshipSchema);
