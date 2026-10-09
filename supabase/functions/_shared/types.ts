/**
 * Row shapes shared by the web client and Edge Functions. They mirror
 * supabase/migrations/*_core_schema.sql (snake_case, as returned by PostgREST).
 */
import type {
  ApplicationStatus,
  Category,
  Degree,
  DocumentType,
  Gender,
  IncomeBracket,
  MatchTier,
  ScholarshipType,
  StateName,
} from './constants.ts';

export interface ExamSectionSpec {
  name: string;
  questions: number;
  durationMinutes: number;
  topics: string[];
}

export interface ExamPattern {
  name?: string;
  durationMinutes: number;
  totalQuestions?: number;
  negativeMarking?: number;
  sections: ExamSectionSpec[];
}

export interface RenewalCriteria {
  minimumCgpa?: number;
  minimumAttendance?: number;
  notes?: string;
}

export interface ScholarshipRow {
  id: string;
  provider: string;
  title: string;
  type: ScholarshipType;
  amount: number;
  amount_description: string | null;
  degree: Degree[];
  current_year_allowed: string[];
  income_limit: number | null;
  marks_min: number | null;
  category: Category[];
  state_domicile: string[];
  gender: string[];
  deadline: string | null;
  required_documents: DocumentType[];
  selection_process: string[];
  aptitude_test_required: boolean;
  renewal_criteria: RenewalCriteria | null;
  official_source_url: string;
  last_scraped_at: string;
  application_mode: 'native' | 'external';
  external_portal_url: string | null;
  application_steps: string[];
  description: string | null;
  exam_pattern: ExamPattern | null;
  tags: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'student' | 'admin';
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PassportRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  institution: string | null;
  course: string | null;
  degree: Degree | null;
  /** Free-text expansion when `degree` is 'Other'. */
  degree_other: string | null;
  current_year: string | null;
  class12_percentage: number | null;
  cgpa: number | null;
  entrance_exam_name: string | null;
  entrance_exam_score: number | null;
  state: StateName | null;
  category: Category | null;
  income_bracket: IncomeBracket | null;
  gender: Gender | null;
  disability_status: boolean;
  completeness: number;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PassportUpdate = Partial<
  Omit<PassportRow, 'user_id' | 'completeness' | 'last_matched_at' | 'created_at' | 'updated_at'>
>;

export interface PassportDocumentRow {
  id: string;
  user_id: string;
  type: DocumentType;
  file_name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  status: 'pending_review' | 'verified' | 'rejected';
  retention_until: string | null;
  uploaded_at: string;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  documentType?: DocumentType;
}

export interface StatusEvent {
  status: ApplicationStatus;
  note?: string;
  at: string;
}

export interface ApplicationRow {
  id: string;
  user_id: string;
  scholarship_id: string;
  mode: 'native' | 'external';
  status: ApplicationStatus;
  checklist: ChecklistItem[];
  notes: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  history: StatusEvent[];
  created_at: string;
  updated_at: string;
}

export interface SectionStat {
  section: string;
  correct: number;
  total: number;
  avgSeconds: number;
}

export interface ExamAttemptRow {
  id: string;
  user_id: string;
  scholarship_id: string;
  mock_test_id: string;
  answers: {
    questionId: string;
    section: string;
    topic: string;
    selectedIndex: number | null;
    correct: boolean;
    timeSpentSeconds: number;
  }[];
  score: number;
  max_score: number;
  accuracy: number;
  readiness_score: number;
  avg_seconds: number;
  section_stats: SectionStat[];
  weak_topics: { topic: string; correct: number; total: number }[];
  completed_at: string;
}

export interface ScrapeRunRow {
  id: string;
  source_name: string;
  source_url: string;
  started_at: string;
  finished_at: string | null;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  records_found: number;
  records_upserted: number;
  duration_ms: number;
  error: string | null;
  mode: 'live' | 'snapshot';
}

export interface MatchReason {
  kind: 'pass' | 'warn' | 'fail';
  label: string;
  detail?: string;
}

export interface MatchResult {
  scholarshipId: string;
  tier: MatchTier;
  fitScore: number;
  hardMatch: boolean;
  missingFields: string[];
  reasons: MatchReason[];
}

export interface Insights {
  totals: { profiles: number; applicationsStarted: number; submitted: number; awarded: number; rejected: number };
  byState: { key: string; total: number; awarded: number }[];
  byIncomeTier: { key: string; total: number }[];
  byDegree: { key: string; total: number }[];
  awardedByType: { key: string; count: number }[];
}

export interface AdminAuditRow {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminStats {
  students: number;
  newStudents7d: number;
  unverifiedStudents: number;
  pendingDocuments: number;
  awaitingDecision: number;
  activeApplications: number;
  awarded: number;
  activeScholarships: number;
  closingSoon: number;
}
