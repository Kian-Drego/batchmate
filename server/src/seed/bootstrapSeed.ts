import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Scholarship } from '../models/Scholarship';
import { ScholarshipPassport } from '../models/ScholarshipPassport';
import { ingestSnapshot } from '../services/scraper';
import { recalculatePassport } from '../services/passport';

/** The demo passport's document registry (metadata only, no identifiers). */
function demoDocuments() {
  const base = (type: string, fileName: string, mimeType: string, sizeBytes: number, status: string) => ({
    type,
    fileName,
    storageKey: `passports/demo/${fileName}`,
    url: `/api/files/${encodeURIComponent(`passports/demo/${fileName}`)}`,
    mimeType,
    sizeBytes,
    status,
    retentionUntilDate: null,
    uploadedAt: new Date(),
  });
  return [
    base('Income Certificate', 'income-certificate.pdf', 'application/pdf', 182_000, 'verified'),
    base('Class 12 Marksheet', 'class12-marksheet.pdf', 'application/pdf', 240_000, 'verified'),
    base('Category Certificate', 'obc-certificate.pdf', 'application/pdf', 150_000, 'pending_review'),
    base('Domicile Proof', 'domicile-proof.pdf', 'application/pdf', 120_000, 'verified'),
    base('Bonafide / Enrolment Certificate', 'bonafide.pdf', 'application/pdf', 96_000, 'verified'),
    base('Bank Passbook', 'bank-passbook.jpg', 'image/jpeg', 210_000, 'verified'),
    base('Photograph', 'photograph.jpg', 'image/jpeg', 64_000, 'verified'),
  ] as never;
}

/**
 * Idempotent bootstrap used on server start and by the seed script:
 * - load the verified scholarship snapshot when the catalogue is empty
 * - create the demo student/admin accounts and a representative passport
 *
 * Everything is guarded by existence checks so it never overwrites real data.
 */
export async function ensureSeedData(): Promise<{ createdUsers: boolean; seededCatalogue: number }> {
  let seededCatalogue = 0;
  if ((await Scholarship.estimatedDocumentCount()) === 0) {
    seededCatalogue = await ingestSnapshot();
  }

  let createdUsers = false;
  if ((await User.estimatedDocumentCount()) === 0) {
    createdUsers = true;
    const passwordHash = await bcrypt.hash('password123', 12);

    const student = await User.create({
      name: 'Demo Student',
      email: 'student@example.com',
      passwordHash,
      provider: 'local',
      role: 'student',
    });

    await User.create({
      name: 'Platform Admin',
      email: 'admin@example.com',
      passwordHash,
      provider: 'local',
      role: 'admin',
    });

    const passport = new ScholarshipPassport({ user: student._id });
    passport.fullName = 'Demo Student';
    passport.academic = {
      institution: 'Government College of Engineering, Pune',
      course: 'B.Tech Computer Engineering',
      degree: 'Professional (MBBS/BTech/LLB)',
      currentYear: '2nd Year',
      class12Percentage: 86.4,
      cgpa: 8.1,
      entranceExamName: 'MHT-CET',
      entranceExamScore: 96.2,
    };
    passport.demographic = {
      state: 'Maharashtra',
      category: 'OBC',
      incomeBracket: '250000-500000',
      gender: 'Female',
      disabilityStatus: false,
    };
    passport.documents = demoDocuments();
    await passport.save();
    await recalculatePassport(passport);
  }

  return { createdUsers, seededCatalogue };
}
