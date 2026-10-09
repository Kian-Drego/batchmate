import { Schema, model, Document, Types } from 'mongoose';
import { EXAM_SECTIONS } from '../domain/constants';

export interface IQuestion {
  _id: Types.ObjectId;
  section: (typeof EXAM_SECTIONS)[number];
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IMockTest extends Document<Types.ObjectId> {
  scholarship: Types.ObjectId;
  title: string;
  durationMinutes: number;
  negativeMarking: number;
  questions: Types.DocumentArray<IQuestion>;
  source: 'ai' | 'curated';
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    section: { type: String, enum: EXAM_SECTIONS, required: true },
    topic: { type: String, required: true },
    prompt: { type: String, required: true },
    options: { type: [String], required: true, validate: (v: string[]) => v.length >= 2 },
    correctIndex: { type: Number, required: true },
    explanation: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { _id: true }
);

const mockTestSchema = new Schema<IMockTest>(
  {
    scholarship: { type: Schema.Types.ObjectId, ref: 'Scholarship', required: true, index: true },
    title: { type: String, required: true },
    durationMinutes: { type: Number, default: 30 },
    negativeMarking: { type: Number, default: 0 },
    questions: { type: [questionSchema], default: [] },
    source: { type: String, enum: ['ai', 'curated'], default: 'curated' },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const MockTest = model<IMockTest>('MockTest', mockTestSchema);
