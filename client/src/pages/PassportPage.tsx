import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { toast } from 'sonner';
import { Download, Eye, Lock, LogOut, Plus, Trash2, UploadCloud } from 'lucide-react';
import type { PassportRow, PassportUpdate } from '@shared/types.ts';
import { CATEGORIES, DEGREES, DEGREE_YEARS, DOCUMENT_TYPES, GENDERS, INCOME_BRACKETS, INCOME_LABELS, STATES, STUDY_YEARS, type Degree, type DocumentType } from '../lib/constants';
import { openDocument, useDeleteDocument, useDocuments, useDownloadPassport, usePassport, useUpdatePassport, useUploadDocument } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { bytes, shortDate } from '../lib/format';
import { tick } from '../lib/haptics';
import { Avatar, Button, ChipGroup, Dial, Field, IconButton, Input, Notice, Select, Sheet, Skeleton, Surface, Switch, Tag } from '../components/ui';

const EDITABLE: (keyof PassportUpdate)[] = [
  'full_name',
  'institution',
  'course',
  'degree',
  'degree_other',
  'current_year',
  'class12_percentage',
  'cgpa',
  'entrance_exam_name',
  'entrance_exam_score',
  'state',
  'category',
  'income_bracket',
  'gender',
  'disability_status',
];

type Form = Partial<Record<keyof PassportUpdate, unknown>>;

/**
 * Snapshot the passport into form state. School-year levels saved before the
 * level list was trimmed (Class 10/11/12, Diploma) no longer satisfy the DB
 * check, so surface them as 'Other' pinned to their original free-text value.
 */
function pick(p: PassportRow): Form {
  const form = Object.fromEntries(EDITABLE.map((k) => [k, p[k]])) as Form;
  const degree = form.degree as string | null;
  if (degree && !(DEGREES as readonly string[]).includes(degree)) {
    form.degree_other = form.degree_other ?? degree;
    form.degree = 'Other';
  }
  return form;
}

function Chapter({ n, title, sub, children }: { n: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <Surface className="p-6">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="num text-[13px] font-semibold text-accent">{n}</span>
        <div>
          <h2 className="text-[21px] font-semibold leading-tight">{title}</h2>
          {sub && <p className="mt-0.5 text-[13.5px] text-ink-3">{sub}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </Surface>
  );
}

function ChipField<T extends string>(props: { label: string; options: readonly T[]; value: unknown; onChange: (v: T | null) => void; labels?: Record<string, string>; hint?: string }) {
  return (
    <div className="space-y-2.5">
      <div className="pl-1 text-[13px] font-semibold text-ink-2">{props.label}</div>
      <ChipGroup label={props.label} options={props.options} value={(props.value as T) ?? null} onChange={props.onChange} labels={props.labels} />
      {props.hint && <p className="pl-1 text-[12.5px] text-ink-3">{props.hint}</p>}
    </div>
  );
}

const DOC_STATUS = {
  verified: { tone: 'sage', label: 'Verified' },
  rejected: { tone: 'rose', label: 'Needs a re-upload' },
  pending_review: { tone: 'neutral', label: 'In review' },
} as const;

export default function PassportPage() {
  const { profile, user, signOut } = useAuth();
  const passport = usePassport();
  const documents = useDocuments();
  const update = useUpdatePassport();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const pack = useDownloadPassport();
  const [params] = useSearchParams();
  const location = useLocation();
  const welcome = params.get('welcome') === '1';

  const [form, setForm] = useState<Form>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (passport.data) setForm(pick(passport.data));
  }, [passport.data]);

  useEffect(() => {
    if (location.hash === '#documents' && docsRef.current) {
      setTimeout(() => docsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
  }, [location.hash, documents.data]);

  const dirty = useMemo(() => {
    if (!passport.data) return false;
    const base = pick(passport.data);
    return EDITABLE.some((k) => (base[k] ?? null) !== (form[k] ?? null));
  }, [form, passport.data]);

  const set = (k: keyof PassportUpdate) => (v: unknown) => setForm((f) => ({ ...f, [k]: v === '' ? null : v }));
  const num = (k: keyof PassportUpdate) => (e: React.ChangeEvent<HTMLInputElement>) => set(k)(e.target.value === '' ? null : Number(e.target.value));

  const level = form.degree as Degree | null | undefined;
  const yearOptions = level ? DEGREE_YEARS[level] ?? STUDY_YEARS : STUDY_YEARS;

  /** Level drives which study years make sense; clear a year that no longer fits. */
  const chooseLevel = (v: Degree | null) => {
    set('degree')(v);
    if (v !== 'Other') set('degree_other')(null);
    const current = form.current_year as string | null;
    const allowed = v ? DEGREE_YEARS[v] ?? STUDY_YEARS : STUDY_YEARS;
    if (current && !allowed.includes(current)) set('current_year')(null);
  };

  const validation = (() => {
    const pct = form.class12_percentage as number | null;
    const cgpa = form.cgpa as number | null;
    if (pct != null && (pct < 0 || pct > 100)) return 'Class 12 % must be 0–100';
    if (cgpa != null && (cgpa < 0 || cgpa > 10)) return 'CGPA must be 0–10';
    return null;
  })();

  const save = () => {
    if (!passport.data || validation) return;
    const base = pick(passport.data);
    const patch = Object.fromEntries(EDITABLE.filter((k) => (base[k] ?? null) !== (form[k] ?? null)).map((k) => [k, form[k] ?? null])) as PassportUpdate;
    update.mutate(patch, {
      onSuccess: (row) => {
        tick(10);
        toast.success(row.completeness === 100 ? 'Passport complete — matches refreshed' : 'Saved — matches refreshed');
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const onFile = (file: File) => {
    if (!docType) return;
    upload.mutate(
      { file, type: docType },
      {
        onSuccess: () => {
          tick(10);
          toast.success(`${docType} uploaded — we'll review it shortly`);
          setUploadOpen(false);
          setDocType(null);
        },
        onError: (e) => toast.error(e.message),
        onSettled: () => {
          if (fileRef.current) fileRef.current.value = '';
        },
      }
    );
  };

  if (passport.isLoading || !passport.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-5xl" />
        <Skeleton className="h-80 rounded-4xl" />
      </div>
    );
  }

  const completeness = passport.data.completeness;
  const docs = documents.data ?? [];
  const verifiedCount = docs.filter((d) => d.status === 'verified').length;

  return (
    <div className={dirty ? 'pb-28' : undefined}>
      {/* Identity card */}
      <Surface tone="lilac" grain className="flex items-center gap-5 rounded-5xl p-6">
        <Dial value={completeness} size={86} stroke={6} color="rgb(var(--lilac-ink))" track="rgb(var(--lilac-ink) / 0.15)">
          <Avatar name={profile?.name} src={profile?.avatar_url} size={64} className="bg-card text-ink" />
        </Dial>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold opacity-75">Scholarship passport</div>
          <div className="truncate font-display text-[26px] font-semibold leading-tight">{profile?.name || 'You'}</div>
          <div className="truncate text-[13.5px] opacity-75">{user?.email}</div>
          <div className="num mt-1 text-[14px] font-semibold">{completeness}% complete</div>
        </div>
      </Surface>

      {welcome && completeness < 100 && (
        <Notice tone="peach" className="mt-3">
          <b className="font-semibold">Welcome to BatchMate.</b> Start with the basics below — every field unlocks sharper matches. We’ve also emailed you a verification link: open “Your Magic Link” and tap “Log In”.
        </Notice>
      )}

      <p className="mt-4 px-2 text-[13px] leading-relaxed text-ink-3">
        We never ask for Aadhaar, PAN or any government ID. Income is stored as a bracket, never a number.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
        <Chapter n="01" title="Studies" sub="Where you are and how you're doing.">
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" value={(form.full_name as string) ?? ''} onChange={(e) => set('full_name')(e.target.value)} maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Institution" htmlFor="institution">
            <Input id="institution" value={(form.institution as string) ?? ''} onChange={(e) => set('institution')(e.target.value)} placeholder="College or school" maxLength={160} />
          </Field>
          <ChipField label="Level" options={DEGREES} value={form.degree} onChange={chooseLevel} />
          <ChipField
            label="Year"
            options={yearOptions}
            value={form.current_year}
            onChange={set('current_year')}
            hint={!level ? 'Pick a level to see its year options.' : undefined}
          />
          {level === 'Other' && (
            <Field label="Specify your level" htmlFor="degree_other">
              <Input
                id="degree_other"
                value={(form.degree_other as string) ?? ''}
                onChange={(e) => set('degree_other')(e.target.value)}
                placeholder="e.g. Integrated law, certificate, vocational"
                maxLength={80}
              />
            </Field>
          )}
          <Field label="Course" htmlFor="course">
            <Input id="course" value={(form.course as string) ?? ''} onChange={(e) => set('course')(e.target.value)} placeholder="e.g. B.Tech Computer Science" maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class 12 %" htmlFor="class12">
              <Input id="class12" type="number" inputMode="decimal" min={0} max={100} step="0.1" value={(form.class12_percentage as number) ?? ''} onChange={num('class12_percentage')} />
            </Field>
            <Field label="CGPA (out of 10)" htmlFor="cgpa">
              <Input id="cgpa" type="number" inputMode="decimal" min={0} max={10} step="0.01" value={(form.cgpa as number) ?? ''} onChange={num('cgpa')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entrance exam" htmlFor="exam">
              <Input id="exam" value={(form.entrance_exam_name as string) ?? ''} onChange={(e) => set('entrance_exam_name')(e.target.value)} placeholder="JEE, NEET…" maxLength={80} />
            </Field>
            <Field label="Score" htmlFor="examScore">
              <Input id="examScore" type="number" inputMode="decimal" step="0.01" value={(form.entrance_exam_score as number) ?? ''} onChange={num('entrance_exam_score')} />
            </Field>
          </div>
        </Chapter>

        <Chapter n="02" title="About you" sub="Only what eligibility rules actually need.">
          <Field label="State you live in" htmlFor="state">
            <Select id="state" value={(form.state as string) ?? ''} onChange={(e) => set('state')(e.target.value)}>
              <option value="">Choose a state</option>
              {STATES.filter((s) => s !== 'All India').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <ChipField label="Category" options={CATEGORIES} value={form.category} onChange={set('category')} />
          <ChipField label="Gender" options={GENDERS} value={form.gender} onChange={set('gender')} />
          <ChipField label="Family income, per year" options={INCOME_BRACKETS} labels={INCOME_LABELS} value={form.income_bracket} onChange={set('income_bracket')} />
          <Switch checked={Boolean(form.disability_status)} onChange={set('disability_status')} label="I have a documented disability" description="Unlocks disability-specific schemes." />
        </Chapter>
      </div>

      {/* Documents */}
      <div ref={docsRef} id="documents" className="scroll-mt-20">
        <div className="mb-3 mt-9 flex items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-[21px] font-semibold">Documents</h2>
            <p className="text-[13px] text-ink-3">Reviewed by the BatchMate team. PDF or photo, up to 500 KB.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={verifiedCount === 0 || pack.isPending}
              loading={pack.isPending}
              onClick={() =>
                pack.mutate(docs, {
                  onSuccess: (n) =>
                    n > 0
                      ? toast.success(`Downloading ${n} verified document${n === 1 ? '' : 's'} as a zip`)
                      : toast.error('No verified documents to download yet'),
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download passport</span>
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
        {documents.isLoading ? (
          <Skeleton className="h-28 rounded-4xl" />
        ) : docs.length === 0 ? (
          <button
            onClick={() => setUploadOpen(true)}
            className="press flex w-full flex-col items-center rounded-4xl border-2 border-dashed border-line bg-card/60 px-6 py-12 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-peach text-peach-ink">
              <UploadCloud className="h-6 w-6" />
            </span>
            <span className="mt-4 font-display text-[19px] font-semibold">Add your first document</span>
            <span className="mt-1 max-w-xs text-[13.5px] text-ink-2">Income certificate, marksheets, bank passbook — the usual suspects.</span>
          </button>
        ) : (
          <Surface className="divide-y divide-dashed divide-line overflow-hidden">
            <AnimatePresence initial={false}>
              {docs.map((doc) => {
                const st = DOC_STATUS[doc.status];
                return (
                  <m.div key={doc.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">{doc.type}</div>
                        <div className="truncate text-[12.5px] text-ink-3">
                          {bytes(doc.size_bytes)} · {shortDate(doc.uploaded_at)}
                        </div>
                      </div>
                      {doc.retention_until ? (
                        <Tag tone="butter">
                          <Lock className="h-3 w-3" /> until {shortDate(doc.retention_until)}
                        </Tag>
                      ) : (
                        <Tag tone={st.tone}>{st.label}</Tag>
                      )}
                      <IconButton label={`View ${doc.type}`} onClick={() => openDocument(doc).catch((e: Error) => toast.error(e.message))}>
                        <Eye className="h-[18px] w-[18px]" />
                      </IconButton>
                      <IconButton
                        label={`Remove ${doc.type}`}
                        disabled={Boolean(doc.retention_until) || remove.isPending}
                        className="hover:bg-rose hover:text-rose-ink"
                        onClick={() => {
                          if (!window.confirm(`Remove ${doc.type}?`)) return;
                          remove.mutate(doc, { onSuccess: () => toast.success('Removed'), onError: (e) => toast.error(e.message) });
                        }}
                      >
                        <Trash2 className="h-[18px] w-[18px]" />
                      </IconButton>
                    </div>
                    {doc.status === 'rejected' && doc.review_note && (
                      <div className="mt-2.5 rounded-2xl bg-rose px-3.5 py-2.5 text-[13px] text-rose-ink">
                        <b className="font-semibold">Why:</b> {doc.review_note} — remove it and upload a clearer copy.
                      </div>
                    )}
                  </m.div>
                );
              })}
            </AnimatePresence>
          </Surface>
        )}
        <p className="mt-2.5 px-2 text-[12.5px] leading-relaxed text-ink-3">
          Documents tied to an active application are locked. Six months after your last application closes, they&apos;re deleted automatically.
        </p>
      </div>

      <button
        onClick={() => void signOut()}
        className="press mt-9 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-card text-[14.5px] font-semibold text-rose-ink shadow-soft"
      >
        <LogOut className="h-[18px] w-[18px]" /> Sign out
      </button>

      {/* Save bar, floating above the dock */}
      <AnimatePresence>
        {dirty && (
          <m.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
            className="fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-[260px]"
          >
            <div className="mx-auto flex max-w-lg items-center gap-2 rounded-full border border-line/70 bg-card p-1.5 pl-5 shadow-lift">
              <span className="flex-1 text-[14px] font-semibold">{validation ?? 'Unsaved changes'}</span>
              <Button variant="ghost" size="sm" onClick={() => passport.data && setForm(pick(passport.data))}>
                Undo
              </Button>
              <Button size="md" onClick={save} loading={update.isPending} disabled={Boolean(validation)}>
                Save
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <Sheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Add a document"
        subtitle="PDF, JPG, PNG, WEBP or HEIC · up to 500 KB"
        footer={
          <Button block size="lg" disabled={!docType} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
            <UploadCloud className="h-5 w-5" /> {docType ? 'Choose a file' : 'Pick what it is first'}
          </Button>
        }
      >
        <div className="mb-3 pl-1 text-[13px] font-semibold text-ink-2">What is it?</div>
        <ChipGroup label="Document type" options={DOCUMENT_TYPES} value={docType} onChange={setDocType} />
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </Sheet>
    </div>
  );
}
