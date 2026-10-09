import { Schema, model, Document, Types } from 'mongoose';

/**
 * Audit trail for the nightly scraper. Each source visited per run produces a
 * record so a failed or changed portal is immediately visible.
 */
export interface IScrapeRun extends Document<Types.ObjectId> {
  sourceName: string;
  sourceUrl: string;
  startedAt: Date;
  finishedAt?: Date | null;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  recordsFound: number;
  recordsUpserted: number;
  durationMs: number;
  error?: string;
  mode: 'live' | 'snapshot';
}

const scrapeRunSchema = new Schema<IScrapeRun>(
  {
    sourceName: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    status: { type: String, enum: ['success', 'partial', 'failed', 'skipped'], default: 'success' },
    recordsFound: { type: Number, default: 0 },
    recordsUpserted: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    error: { type: String },
    mode: { type: String, enum: ['live', 'snapshot'], default: 'snapshot' },
  },
  { timestamps: true }
);

export const ScrapeRun = model<IScrapeRun>('ScrapeRun', scrapeRunSchema);
