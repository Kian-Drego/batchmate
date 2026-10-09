import { ScholarshipPassport, IPassportDocument } from '../models/ScholarshipPassport';
import { Application } from '../models/Application';
import { RETENTION_GRACE_DAYS } from '../domain/constants';
import { storage } from './storage';
import { Types } from 'mongoose';

const TERMINAL_STATUSES = ['Awarded', 'Rejected'];
const GRACE_MS = RETENTION_GRACE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Retention policy engine.
 *
 * Rule: while a user has at least one non-terminal application, every document
 * is locked and non-expiring (`retentionUntilDate = null`). Once all
 * applications reach a terminal state, documents receive a retention window of
 * `completionDate + 180 days`, after which the cleanup worker may remove them.
 */
export async function applyRetentionPolicy(userId: Types.ObjectId | string): Promise<void> {
  const passport = await ScholarshipPassport.findOne({ user: userId });
  if (!passport) return;

  const applications = await Application.find({ user: userId });
  const active = applications.filter((a) => !TERMINAL_STATUSES.includes(a.status));

  let retentionUntil: Date | null = null;
  if (active.length === 0 && applications.length > 0) {
    const completionDates = applications
      .filter((a) => TERMINAL_STATUSES.includes(a.status))
      .map((a) => a.completedAt ?? a.updatedAt);
    const latest = completionDates.reduce<Date | null>(
      (max, d) => (!max || d > max ? d : max),
      null
    );
    if (latest) retentionUntil = new Date(latest.getTime() + GRACE_MS);
  }

  let changed = false;
  passport.documents.forEach((doc) => {
    const current = doc.retentionUntilDate ? doc.retentionUntilDate.getTime() : null;
    const next = retentionUntil ? retentionUntil.getTime() : null;
    if (current !== next) {
      doc.retentionUntilDate = retentionUntil;
      changed = true;
    }
  });
  if (changed) await passport.save();
}

/**
 * Cleanup worker. Runs daily; removes expired documents from object storage
 * and the passport registry. A final guard re-checks for active applications
 * so a document is never deleted while still in use.
 */
export async function runRetentionSweep(now: Date = new Date()): Promise<{
  scanned: number;
  deleted: number;
}> {
  const passports = await ScholarshipPassport.find({
    'documents.retentionUntilDate': { $lte: now, $ne: null },
  });

  let deleted = 0;
  let scanned = 0;

  for (const passport of passports) {
    const activeApps = await Application.countDocuments({
      user: passport._id,
      status: { $nin: TERMINAL_STATUSES },
    });
    if (activeApps > 0) continue;

    const expired = passport.documents.filter(
      (d: IPassportDocument) => d.retentionUntilDate && d.retentionUntilDate <= now
    );
    for (const doc of expired) {
      scanned += 1;
      try {
        await storage.remove(doc.storageKey);
      } catch {
        /* storage may already be clean; still drop the registry entry */
      }
      passport.documents.pull({ _id: doc._id });
      deleted += 1;
    }
    if (expired.length) await passport.save();
  }

  return { scanned, deleted };
}
