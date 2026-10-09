/** Shared API types mirrored from the server models. */
import type { ApplicationStatus, Category, Degree, Gender, IncomeBracket, MatchTier } from './constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  avatarUrl?: string;
  provider: 'local' | 'google';
}

export interface PassportDocument {
  _id: string;
  type: string;
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending_review' | 'verified' | 'rejected';
  retentionUntilDate: string | null;
  uploadedAt: string;
}

export interface Passport {
  _id: string;
  fullName?: string;
  phone?: string;
  academic: {
    institution?: string;
    course?: string;
    degree?: Degree;
    currentYear?: string;
    class12Percentage?: number;
    cgpa?: number;
    entranceExamName?: string;
    entranceExamScore?: number;
  };
  demographic: {
    state?: string;
    category?: Category;
    incomeBracket?: IncomeBracket;
    gender?: Gender;
    disabilityStatus?: boolean;
  };
  documents: PassportDocument[];
  completeness: number;
  lastMatchedAt: string | null;
}

export interface MatchReason {
  kind: 'pass' | 'warn' | 'fail';
  label: string;
  detail?: string;
}

export interface Scholarship {
  _id: string;
  provider: string;
  title: string;
  type: string;
  amount: number;
  amountDescription?: string;
  degree: string[];
  currentYearAllowed: string[];
  incomeLimit?: number;
  marksMin?: number;
  category: string[];
  stateDomicile: string[];
  gender: string[];
  deadline?: string;
  requiredDocuments: string[];
  selectionProcess: string[];
  aptitudeTestRequired: boolean;
  renewalCriteria?: { minimumCgpa?: number; minimumAttendance?: number; notes?: string };
  officialSourceUrl: string;
  lastScrapedAt: string;
  applicationMode: 'native' | 'external';
  externalPortalUrl?: string;
  applicationSteps: string[];
  description?: string;
  examPattern?: {
    name?: string;
    durationMinutes: number;
    totalQuestions?: number;
    negativeMarking?: number;
    sections: { name: string; questions: number; durationMinutes: number; topics: string[] }[];
  };
  tags: string[];
}

export interface Match {
  scholarshipId: string;
  tier: MatchTier;
  fitScore: number;
  reasons: MatchReason[];
  missingFields: string[];
  scholarship: Scholarship;
}

export interface MatchResponse {
  matches: Match[];
  grouped: {
    highlyEligible: Match[];
    possiblyEligible: Match[];
    needsInfo: Match[];
  };
  lastMatchedAt: string | null;
}

export interface ChecklistItem {
  _id: string;
  label: string;
  done: boolean;
  documentType?: string;
}

export interface Application {
  _id: string;
  scholarship: Scholarship;
  mode: 'native' | 'external';
  status: ApplicationStatus;
  checklist: ChecklistItem[];
  notes?: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  history: { status: string; note?: string; at: string }[];
  updatedAt: string;
}

export interface Question {
  id: string;
  section: string;
  topic: string;
  prompt: string;
  options: string[];
  difficulty: string;
}

export interface MockTestPayload {
  mockTest: {
    id: string;
    title: string;
    durationMinutes: number;
    negativeMarking: number;
    source: 'ai' | 'curated';
    totalQuestions: number;
  };
  questions: Question[];
}

export interface AttemptResult {
  attempt: {
    id: string;
    score: number;
    maxScore: number;
    accuracy: number;
    readinessScore: number;
    avgSeconds: number;
    sectionStats: { section: string; correct: number; total: number; avgSeconds: number }[];
    weakTopics: { topic: string; correct: number; total: number }[];
  };
  review: {
    questionId: string;
    section: string;
    topic: string;
    selectedIndex: number | null;
    correct: boolean;
    timeSpentSeconds: number;
    correctIndex: number | null;
  }[];
}

export interface Performance {
  totalAttempts: number;
  readinessScore: number;
  averageAccuracy: number;
  weakTopics: { topic: string; correct: number; total: number; accuracy: number }[];
  strongTopics: { topic: string; correct: number; total: number; accuracy: number }[];
  sections: { section: string; accuracy: number; avgSeconds: number; total: number }[];
  recentAttempts: {
    id: string;
    scholarship: { title: string; provider: string } | null;
    score: number;
    maxScore: number;
    accuracy: number;
    readinessScore: number;
    completedAt: string;
  }[];
}

export interface Insights {
  totals: {
    profiles: number;
    applicationsStarted: number;
    submitted: number;
    awarded: number;
    rejected: number;
  };
  byState: { key: string; total: number; awarded: number }[];
  byIncomeTier: { key: string; total: number }[];
  byDegree: { key: string; total: number }[];
  awardedByType: { key: string; count: number }[];
}

export interface Blueprint {
  aptitudeTestRequired: boolean;
  examPattern: Scholarship['examPattern'] | null;
  blueprint: { section: string; questions: number; topics: string[] }[];
  renewal: { status: 'on-track' | 'at-risk' | 'unknown'; gap: number | null };
  renewalCriteria: Scholarship['renewalCriteria'] | null;
}
