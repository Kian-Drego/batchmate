import { Schema, model, Document, Types } from 'mongoose';

export interface IAnswer {
  questionId: Types.ObjectId;
  section: string;
  topic: string;
  selectedIndex: number | null;
  correct: boolean;
  timeSpentSeconds: number;
}

export interface IExamAttempt extends Document<Types.ObjectId> {
  user: Types.ObjectId;
  scholarship: Types.ObjectId;
  mockTest: Types.ObjectId;
  answers: Types.DocumentArray<IAnswer>;
  score: number;
  maxScore: number;
  accuracy: number;
  readinessScore: number;
  sectionStats: { section: string; correct: number; total: number; avgSeconds: number }[];
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    section: { type: String, required: true },
    topic: { type: String, required: true },
    selectedIndex: { type: Number, default: null },
    correct: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const sectionStatSchema = new Schema(
  { section: String, correct: Number, total: Number, avgSeconds: Number },
  { _id: false }
);

const examAttemptSchema = new Schema<IExamAttempt>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scholarship: { type: Schema.Types.ObjectId, ref: 'Scholarship', required: true },
    mockTest: { type: Schema.Types.ObjectId, ref: 'MockTest', required: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    readinessScore: { type: Number, default: 0 },
    sectionStats: { type: [sectionStatSchema], default: [] },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ExamAttempt = model<IExamAttempt>('ExamAttempt', examAttemptSchema);
