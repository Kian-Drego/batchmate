/**
 * Data layer: React Query hooks over supabase-js. Rows stay snake_case (see
 * @shared/types.ts). RLS scopes every read to the signed-in user.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { completeness, matchAll } from '@shared/matching.ts';
import type {
  AdminAuditRow,
  AdminStats,
  ApplicationRow,
  ExamAttemptRow,
  Insights,
  PassportDocumentRow,
  PassportRow,
  PassportUpdate,
  ProfileRow,
  ScholarshipRow,
  ScrapeRunRow,
} from '@shared/types.ts';
import type { ApplicationStatus, DocumentType } from '@shared/constants.ts';
import { supabase, toError } from './supabase';
import { useAuth } from '../context/AuthContext';

export type ApplicationWithScholarship = ApplicationRow & { scholarship: ScholarshipRow | null };
export type AttemptWithScholarship = ExamAttemptRow & {
  scholarship: Pick<ScholarshipRow, 'id' | 'title' | 'provider'> | null;
};

export const keys = {
  passport: (uid: string) => ['passport', uid] as const,
  documents: (uid: string) => ['documents', uid] as const,
  scholarships: ['scholarships'] as const,
  applications: (uid: string) => ['applications', uid] as const,
  attempts: (uid: string) => ['attempts', uid] as const,
  insights: ['insights'] as const,
  scrapeRuns: ['scrape-runs'] as const,
};

async function run<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw await toError(error);
  return data as T;
}

function useUid(): string {
  const { user } = useAuth();
  return user?.id ?? 'anon';
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function usePassport() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.passport(uid),
    queryFn: () => run<PassportRow>(supabase.from('passports').select('*').eq('user_id', uid).single()),
    enabled: uid !== 'anon',
  });
}

export function useDocuments() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.documents(uid),
    queryFn: () =>
      run<PassportDocumentRow[]>(
        supabase.from('passport_documents').select('*').order('uploaded_at', { ascending: false })
      ),
    enabled: uid !== 'anon',
  });
}

export function useScholarships() {
  return useQuery({
    queryKey: keys.scholarships,
    queryFn: () =>
      run<ScholarshipRow[]>(
        supabase.from('scholarships').select('*').eq('active', true).order('deadline', { ascending: true, nullsFirst: false })
      ),
    staleTime: 10 * 60 * 1000,
  });
}

export function useScholarship(id: string | undefined) {
  const list = useScholarships();
  return useQuery({
    queryKey: ['scholarship', id],
    queryFn: () => run<ScholarshipRow>(supabase.from('scholarships').select('*').eq('id', id!).single()),
    enabled: Boolean(id),
    initialData: () => list.data?.find((s) => s.id === id),
    staleTime: 10 * 60 * 1000,
  });
}

export function useApplications() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.applications(uid),
    queryFn: () =>
      run<ApplicationWithScholarship[]>(
        supabase
          .from('applications')
          .select('*, scholarship:scholarships(*)')
          .order('updated_at', { ascending: false })
      ),
    enabled: uid !== 'anon',
  });
}

export function useAttempts() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.attempts(uid),
    queryFn: () =>
      run<AttemptWithScholarship[]>(
        supabase
          .from('exam_attempts')
          .select('*, scholarship:scholarships(id, title, provider)')
          .order('completed_at', { ascending: false })
          .limit(100)
      ),
    enabled: uid !== 'anon',
  });
}

export function useInsights() {
  return useQuery({
    queryKey: keys.insights,
    queryFn: () => run<Insights>(supabase.rpc('get_insights_admin')),
    staleTime: 5 * 60 * 1000,
  });
}

export function useScrapeRuns(enabled: boolean) {
  return useQuery({
    queryKey: keys.scrapeRuns,
    queryFn: () =>
      run<ScrapeRunRow[]>(supabase.from('scrape_runs').select('*').order('started_at', { ascending: false }).limit(50)),
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Derived: matching (pure, client-side) and exam performance
// ---------------------------------------------------------------------------

export type Match = ReturnType<typeof matchAll<ScholarshipRow>>[number];

export function useMatches() {
  const passport = usePassport();
  const documents = useDocuments();
  const scholarships = useScholarships();

  const value = useMemo(() => {
    if (!passport.data || !scholarships.data) return null;
    const all = matchAll(scholarships.data, passport.data, documents.data ?? []);
    return {
      all,
      highlyEligible: all.filter((m) => m.tier === 'Highly Eligible'),
      possiblyEligible: all.filter((m) => m.tier === 'Possibly Eligible'),
      needsInfo: all.filter((m) => m.tier === 'Needs Additional Information'),
      completeness: completeness(passport.data),
    };
  }, [passport.data, documents.data, scholarships.data]);

  return {
    data: value,
    isLoading: passport.isLoading || scholarships.isLoading || documents.isLoading,
    error: passport.error ?? scholarships.error ?? documents.error,
  };
}

export function usePerformance() {
  const attempts = useAttempts();
  const data = useMemo(() => {
    const list = attempts.data ?? [];
    const topicMap = new Map<string, { correct: number; total: number }>();
    const sectionAgg = new Map<string, { correct: number; total: number; seconds: number; n: number }>();
    for (const a of list) {
      for (const ans of a.answers) {
        const t = topicMap.get(ans.topic) ?? { correct: 0, total: 0 };
        t.total += 1;
        if (ans.correct) t.correct += 1;
        topicMap.set(ans.topic, t);
      }
      for (const s of a.section_stats) {
        const agg = sectionAgg.get(s.section) ?? { correct: 0, total: 0, seconds: 0, n: 0 };
        agg.correct += s.correct;
        agg.total += s.total;
        agg.seconds += s.avgSeconds;
        agg.n += 1;
        sectionAgg.set(s.section, agg);
      }
    }
    const topics = [...topicMap.entries()].map(([topic, v]) => ({
      topic,
      ...v,
      accuracy: Math.round((v.correct / v.total) * 100),
    }));
    const avg = (f: (a: ExamAttemptRow) => number) =>
      list.length ? Math.round(list.reduce((s, a) => s + f(a), 0) / list.length) : 0;
    return {
      totalAttempts: list.length,
      readinessScore: avg((a) => a.readiness_score),
      averageAccuracy: avg((a) => a.accuracy),
      weakTopics: topics.filter((t) => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 8),
      strongTopics: topics.filter((t) => t.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy).slice(0, 8),
      sections: [...sectionAgg.entries()].map(([section, v]) => ({
        section,
        accuracy: Math.round((v.correct / v.total) * 100),
        avgSeconds: Math.round(v.seconds / v.n),
        total: v.total,
      })),
      recent: list.slice(0, 10),
    };
  }, [attempts.data]);
  return { data, isLoading: attempts.isLoading, error: attempts.error };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useUpdatePassport() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PassportUpdate) =>
      run<PassportRow>(supabase.from('passports').update(patch).eq('user_id', uid).select('*').single()),
    onSuccess: (row) => qc.setQueryData(keys.passport(uid), row),
  });
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export function useUploadDocument() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: DocumentType }) => {
      if (file.size > MAX_BYTES) throw new Error('File is larger than 10 MB');
      if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only PDF, JPG, PNG, WEBP or HEIC files are allowed');
      const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-120);
      const key = `${uid}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(key, file, { contentType: file.type, upsert: false });
      if (upErr) throw await toError(upErr);
      const { data, error } = await supabase
        .from('passport_documents')
        .insert({ type, file_name: file.name.slice(0, 200), storage_key: key, mime_type: file.type, size_bytes: file.size })
        .select('*')
        .single();
      if (error) {
        await supabase.storage.from('documents').remove([key]);
        throw await toError(error);
      }
      return data as PassportDocumentRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.documents(uid) }),
  });
}

export function useDeleteDocument() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: PassportDocumentRow) => {
      if (doc.retention_until) throw new Error('This document is locked by an application retention window');
      const rows = await run<{ id: string }[]>(
        supabase.from('passport_documents').delete().eq('id', doc.id).select('id')
      );
      if (!rows.length) throw new Error('Document is locked and cannot be removed');
      await supabase.storage.from('documents').remove([doc.storage_key]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.documents(uid) }),
  });
}

export async function openDocument(doc: PassportDocumentRow): Promise<void> {
  // Open synchronously-created tab first so mobile popup blockers allow it.
  const tab = window.open('', '_blank');
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_key, 120);
  if (error || !data) {
    tab?.close();
    throw await toError(error);
  }
  if (tab) tab.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

function useApplicationMutation<V>(fn: (v: V) => PromiseLike<{ data: unknown; error: unknown }>) {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => run<ApplicationRow>(fn(v) as PromiseLike<{ data: ApplicationRow | null; error: unknown }>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.applications(uid) });
      // Retention may have changed document locks.
      qc.invalidateQueries({ queryKey: keys.documents(uid) });
    },
  });
}

export const useStartApplication = () =>
  useApplicationMutation((scholarshipId: string) => supabase.rpc('start_application', { p_scholarship: scholarshipId }));

export const useSetChecklistItem = () =>
  useApplicationMutation((v: { applicationId: string; itemId: string; done: boolean }) =>
    supabase.rpc('set_checklist_item', { p_application: v.applicationId, p_item: v.itemId, p_done: v.done })
  );

export const useUpdateStatus = () =>
  useApplicationMutation((v: { applicationId: string; status: ApplicationStatus; note?: string }) =>
    supabase.rpc('update_application_status', { p_application: v.applicationId, p_status: v.status, p_note: v.note ?? null })
  );

export const useSubmitApplication = () =>
  useApplicationMutation((applicationId: string) => supabase.rpc('submit_application', { p_application: applicationId }));

// ---------------------------------------------------------------------------
// Exams (Edge Function)
// ---------------------------------------------------------------------------

export interface PublicQuestion {
  id: string;
  section: string;
  topic: string;
  prompt: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MockTestPayload {
  mockTest: {
    id: string;
    scholarshipId: string;
    title: string;
    durationMinutes: number;
    negativeMarking: number;
    source: 'ai' | 'curated';
    totalQuestions: number;
  };
  questions: PublicQuestion[];
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
    prompt: string;
    options: string[];
    selectedIndex: number | null;
    correctIndex: number;
    correct: boolean;
    explanation: string | null;
    timeSpentSeconds: number;
  }[];
}

/**
 * Post to a Supabase Edge Function through the same-origin Vercel proxy
 * (`/api/edge/<name>`). Direct `supabase.functions.invoke` calls are blocked by
 * CORS from the www origin — the hosted functions' ALLOWED_ORIGINS secret only
 * lists the apex domain — so the proxy handles that hop server-side.
 */
async function invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  let res: Response;
  try {
    res = await fetch(`/api/edge/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Could not reach the server');
  }
  const text = await res.text();
  if (!res.ok) {
    let parsed: { error?: string; details?: unknown } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON upstream error; fall back to a generic message */
    }
    const error = new Error(parsed?.error || 'Request failed') as Error & { details?: unknown };
    if (parsed?.details !== undefined) error.details = parsed?.details;
    throw error;
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

export async function invokeExams<T>(body: Record<string, unknown>): Promise<T> {
  return invokeEdge<T>('exams', body);
}

export function useMockTest(scholarshipId: string | undefined) {
  return useQuery({
    queryKey: ['mock-test', scholarshipId],
    queryFn: () => invokeExams<MockTestPayload>({ action: 'generate', scholarshipId }),
    enabled: Boolean(scholarshipId),
    staleTime: Infinity,
    retry: 1,
  });
}

export function useSubmitMock() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { mockTestId: string; answers: { questionId: string; selectedIndex: number | null; timeSpentSeconds: number }[] }) =>
      invokeExams<AttemptResult>({ action: 'submit', ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.attempts(uid) }),
  });
}

export function useRunScrape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invokeEdge<{ mode: string; totalUpserted: number }>('jobs', { task: 'scrape' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.scrapeRuns });
      qc.invalidateQueries({ queryKey: keys.scholarships });
    },
  });
}

// ---------------------------------------------------------------------------
// Admin console
// ---------------------------------------------------------------------------

export type ProfileLite = Pick<ProfileRow, 'id' | 'name' | 'email'>;
export type ReviewDocument = PassportDocumentRow & { profile: ProfileLite | null };
export type AdminApplication = ApplicationRow & { scholarship: ScholarshipRow; profile: ProfileLite | null };
export type StudentRow = ProfileRow & { passport: PassportRow | null };
export type AuditWithActor = AdminAuditRow & { actor: ProfileLite | null };

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  documents: (status: string) => ['admin', 'documents', status] as const,
  applications: (filter: string) => ['admin', 'applications', filter] as const,
  students: ['admin', 'students'] as const,
  student: (id: string) => ['admin', 'student', id] as const,
  catalogue: ['admin', 'catalogue'] as const,
  audit: ['admin', 'audit'] as const,
};

function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  return run<T>(supabase.rpc(fn, args) as unknown as PromiseLike<{ data: T | null; error: unknown }>);
}

export function useAdminStats() {
  return useQuery({ queryKey: adminKeys.stats, queryFn: () => rpc<AdminStats>('admin_stats', {}) });
}

export function useReviewQueue(status: PassportDocumentRow['status']) {
  return useQuery({
    queryKey: adminKeys.documents(status),
    queryFn: () =>
      run<ReviewDocument[]>(
        supabase
          .from('passport_documents')
          .select('*, profile:profiles!passport_documents_user_id_fkey(id, name, email)')
          .eq('status', status)
          .order(status === 'pending_review' ? 'uploaded_at' : 'reviewed_at', { ascending: status === 'pending_review' })
          .limit(200)
      ),
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: PassportDocumentRow['status']; note?: string }) =>
      rpc<PassportDocumentRow>('admin_review_document', { p_document: v.id, p_status: v.status, p_note: v.note ?? null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export type AppFilter = 'review' | 'active' | 'closed';

export function useAdminApplications(filter: AppFilter) {
  return useQuery({
    queryKey: adminKeys.applications(filter),
    queryFn: () => {
      const statuses =
        filter === 'review' ? ['Submitted', 'Verification Pending'] : filter === 'active' ? ['Not Started', 'In Progress'] : ['Awarded', 'Rejected'];
      return run<AdminApplication[]>(
        supabase
          .from('applications')
          .select('*, scholarship:scholarships(*), profile:profiles(id, name, email)')
          .in('status', statuses)
          .order('updated_at', { ascending: false })
          .limit(200)
      );
    },
  });
}

export function useDecideApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: ApplicationStatus; note?: string }) =>
      rpc<ApplicationRow>('admin_decide_application', { p_application: v.id, p_status: v.status, p_note: v.note ?? null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useStudents() {
  return useQuery({
    queryKey: adminKeys.students,
    queryFn: () => run<StudentRow[]>(supabase.from('profiles').select('*, passport:passports(*)').order('created_at', { ascending: false }).limit(500)),
  });
}

export function useStudentDetail(id: string | null) {
  return useQuery({
    queryKey: adminKeys.student(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const [documents, applications] = await Promise.all([
        run<PassportDocumentRow[]>(supabase.from('passport_documents').select('*').eq('user_id', id!).order('uploaded_at', { ascending: false })),
        run<ApplicationWithScholarship[]>(
          supabase.from('applications').select('*, scholarship:scholarships(*)').eq('user_id', id!).order('updated_at', { ascending: false })
        ),
      ]);
      return { documents, applications };
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; role: 'student' | 'admin' }) => rpc<ProfileRow>('admin_set_role', { p_user: v.id, p_role: v.role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useCatalogue() {
  return useQuery({
    queryKey: adminKeys.catalogue,
    queryFn: () => run<ScholarshipRow[]>(supabase.from('scholarships').select('*').order('updated_at', { ascending: false })),
  });
}

export type ScholarshipInput = Omit<ScholarshipRow, 'id' | 'created_at' | 'updated_at' | 'last_scraped_at'> & { id?: string };

export function useSaveScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScholarshipInput) => {
      const { id, ...row } = input;
      return run<ScholarshipRow>(
        id
          ? supabase.from('scholarships').update(row).eq('id', id).select('*').single()
          : supabase.from('scholarships').insert(row).select('*').single()
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: keys.scholarships });
    },
  });
}

export function useAudit() {
  return useQuery({
    queryKey: adminKeys.audit,
    queryFn: () =>
      run<AuditWithActor[]>(supabase.from('admin_audit').select('*, actor:profiles(id, name, email)').order('created_at', { ascending: false }).limit(200)),
  });
}

/** Signed URL for previewing any document (admins can read every folder). */
export async function signedUrl(storageKey: string): Promise<string> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(storageKey, 300);
  if (error || !data) throw await toError(error);
  return data.signedUrl;
}
