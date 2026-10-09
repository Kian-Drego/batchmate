import { Schema, model, Document, Types } from 'mongoose';
import { APPLICATION_STATUSES } from '../domain/constants';

export interface IStatusEvent {
  status: (typeof APPLICATION_STATUSES)[number];
  note?: string;
  at: Date;
}

export interface IChecklistItem {
  _id: Types.ObjectId;
  label: string;
  done: boolean;
  documentType?: string;
}

export interface IApplication extends Document<Types.ObjectId> {
  user: Types.ObjectId;
  scholarship: Types.ObjectId;
  mode: 'native' | 'external';
  status: (typeof APPLICATION_STATUSES)[number];
  checklist: Types.DocumentArray<IChecklistItem>;
  notes?: string;
  submittedAt?: Date | null;
  completedAt?: Date | null;
  history: Types.DocumentArray<IStatusEvent>;
  createdAt: Date;
  updatedAt: Date;
}

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    label: { type: String, required: true },
    done: { type: Boolean, default: false },
    documentType: { type: String },
  },
  { _id: true }
);

const statusEventSchema = new Schema<IStatusEvent>(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    note: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new Schema<IApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scholarship: { type: Schema.Types.ObjectId, ref: 'Scholarship', required: true, index: true },
    mode: { type: String, enum: ['native', 'external'], default: 'external' },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'Not Started' },
    checklist: { type: [checklistItemSchema], default: [] },
    notes: { type: String },
    submittedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    history: { type: [statusEventSchema], default: [] },
  },
  { timestamps: true }
);

applicationSchema.index({ user: 1, scholarship: 1 }, { unique: true });

export const Application = model<IApplication>('Application', applicationSchema);
