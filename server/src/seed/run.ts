import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { Scholarship } from '../models/Scholarship';
import { User } from '../models/User';
import { Application } from '../models/Application';
import { AnalyticsProfile } from '../models/AnalyticsProfile';
import { ensureSeedData } from './bootstrapSeed';
import { applyRetentionPolicy } from '../services/retention';

/**
 * Idempotent seed: refreshes the catalogue, ensures the demo accounts and
 * passport exist, and adds a couple of tracked applications. Safe to run
 * repeatedly.
 */
async function main(): Promise<void> {
  await connectDatabase();

  const { createdUsers, seededCatalogue } = await ensureSeedData();
  // eslint-disable-next-line no-console
  console.log(`[seed] catalogue upserted: ${seededCatalogue} scholarships`);
  // eslint-disable-next-line no-console
  console.log(`[seed] demo users ${createdUsers ? 'created' : 'already present'}`);

  const student = await User.findOne({ email: 'student@example.com' });
  if (student) {
    for (const title of [
      'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti',
      'AICTE Pragati Scholarship for Girls (Technical)',
    ]) {
      const scholarship = await Scholarship.findOne({ title });
      if (!scholarship) continue;
      const exists = await Application.findOne({
        user: student._id,
        scholarship: scholarship._id,
      });
      if (exists) continue;
      await Application.create({
        user: student._id,
        scholarship: scholarship._id,
        mode: scholarship.applicationMode,
        status: 'In Progress',
        checklist: [
          { label: 'Review eligibility criteria', done: true },
          { label: 'Upload Income Certificate', done: true, documentType: 'Income Certificate' },
          { label: 'Upload Domicile Proof', done: false, documentType: 'Domicile Proof' },
        ],
        history: [{ status: 'In Progress', at: new Date(), note: 'Seeded demo application' }],
      });
    }
    await applyRetentionPolicy(student._id);
  }

  // eslint-disable-next-line no-console
  console.log('[seed] demo logins: student@example.com / admin@example.com / password123');

  const stats = {
    scholarships: await Scholarship.countDocuments(),
    users: await User.countDocuments(),
    applications: await Application.countDocuments(),
    analyticsBuckets: await AnalyticsProfile.countDocuments(),
  };
  // eslint-disable-next-line no-console
  console.log('[seed] counts:', stats);

  await disconnectDatabase();
  await mongoose.connection.close().catch(() => undefined);
  process.exit(0);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed:', err);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
