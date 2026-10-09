import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart3,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  Lock,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { PassportRow, PassportUpdate } from '@shared/types.ts';
import { CATEGORIES, CURRENT_YEARS, DEGREES, DOCUMENT_TYPES, GENDERS, INCOME_BRACKETS, INCOME_LABELS, STATES, type DocumentType } from '../lib/constants';
import { openDocument, useDeleteDocument, useDocuments, usePassport, useUpdatePassport, useUploadDocument } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { bytes, initials, shortDate } from '../lib/format';
import { tick } from '../lib/haptics';
import {
  Alert,
  Badge,
  Button,
  Card,
  ChipGroup,
  Field,
  IconButton,
  Input,
  Ring,
  Select,
  Sheet,
  Skeleton,
  Toggle,
} from '../components/ui';

const EDITABLE: (keyof PassportUpdate)[] = [
  'full_name',
  'institution',
  'course',
  'degree',
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

function pick(p: PassportRow): Form {
  return Object.fromEntries(EDITABLE.map((k) => [k, p[k]])) as Form;
}

function FormCard({ icon: Icon, title, children }: { icon: typeof MapPin; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold">
        <Icon className="h-[18px] w-[18px] text-accent" /> {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function ChipField<T extends string>(props: { label: string; options: readonly T[]; value: unknown; onChange: (v: T | null) => void; labels?: Record<string, string>; hint?: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[13px] font-semibold text-fg-muted">{props.label}</div>
      <ChipGroup label={props.label} options={props.options} value={(props.value as T) ?? null} onChange={props.onChange} labels={props.labels} />
      {props.hint && <p className="text-[12px] text-fg-faint">{props.hint}</p>}
    </div>
  );
}

export default function PassportPage() {
  const { profile, user, signOut } = useAuth();
  const passport = usePassport();
  const documents = useDocuments();
  const update = useUpdatePassport();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
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
  const num = (k: keyof PassportUpdate) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k)(e.target.value === '' ? null : Number(e.target.value));

  const validation = (() => {
    const pct = form.class12_percentage as number | null;
    const cgpa = form.cgpa as number | null;
    if (pct != null && (pct < 0 || pct > 100)) return 'Class 12 % must be between 0 and 100';
    if (cgpa != null && (cgpa < 0 || cgpa > 10)) return 'CGPA must be between 0 and 10';
    return null;
  })();

  const save = () => {
    if (!passport.data || validation) return;
    const base = pick(passport.data);
    const patch = Object.fromEntries(EDITABLE.filter((k) => (base[k] ?? null) !== (form[k] ?? null)).map((k) => [k, form[k] ?? null])) as PassportUpdate;
    update.mutate(patch, {
      onSuccess: (row) => {
        tick(10);
        toast.success(row.completeness === 100 ? 'Passport complete! Matches refreshed ✨' : 'Saved · matches refreshed');
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
          toast.success(`${docType} uploaded`);
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
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const completeness = passport.data.completeness;
  const docs = documents.data ?? [];

  return (
    <div className={dirty ? 'pb-24' : undefined}>
      {/* Profile header */}
      <Card className="flex items-center gap-4 rounded-3xl p-5">
        <Ring value={completeness} size={72} stroke={6} tone={completeness === 100 ? 'mint' : 'accent'}>
          <span className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full bg-accent-soft text-lg font-bold text-accent">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initials(profile?.name)}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-extrabold">{profile?.name || 'Your passport'}</div>
          <div className="truncate text-[13px] text-fg-muted">{user?.email}</div>
          <div className="mt-1 text-[12px] font-semibold text-accent">{completeness}% complete</div>
        </div>
      </Card>

      {welcome && completeness < 100 && (
        <div className="mt-4">
          <Alert tone="accent">
            <b>Welcome to BatchMate!</b> Fill in the basics below — every field you add unlocks more accurate matches.
          </Alert>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 px-1 text-[12px] text-fg-faint">
        <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-mint" />
        We never ask for Aadhaar, PAN or any government ID. Income is stored only as a bracket.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <FormCard icon={GraduationCap} title="Academics">
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" value={(form.full_name as string) ?? ''} onChange={(e) => set('full_name')(e.target.value)} maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Institution" htmlFor="institution">
            <Input id="institution" value={(form.institution as string) ?? ''} onChange={(e) => set('institution')(e.target.value)} placeholder="College or school" maxLength={160} />
          </Field>
          <ChipField label="Degree" options={DEGREES} value={form.degree} onChange={set('degree')} />
          <ChipField label="Current year" options={CURRENT_YEARS.filter((y) => y !== 'Any')} value={form.current_year} onChange={set('current_year')} />
          <Field label="Course" htmlFor="course">
            <Input id="course" value={(form.course as string) ?? ''} onChange={(e) => set('course')(e.target.value)} placeholder="e.g. B.Tech Computer Science" maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class 12 %" htmlFor="class12">
              <Input id="class12" type="number" inputMode="decimal" min={0} max={100} step="0.1" value={(form.class12_percentage as number) ?? ''} onChange={num('class12_percentage')} />
            </Field>
            <Field label="CGPA (/10)" htmlFor="cgpa">
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
        </FormCard>

        <FormCard icon={MapPin} title="About you">
          <Field label="State / domicile" htmlFor="state">
            <Select id="state" value={(form.state as string) ?? ''} onChange={(e) => set('state')(e.target.value)}>
              <option value="">Select state</option>
              {STATES.filter((s) => s !== 'All India').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <ChipField label="Category" options={CATEGORIES} value={form.category} onChange={set('category')} />
          <ChipField label="Gender" options={GENDERS} value={form.gender} onChange={set('gender')} />
          <ChipField
            label="Family income (per year)"
            options={INCOME_BRACKETS}
            labels={INCOME_LABELS}
            value={form.income_bracket}
            onChange={set('income_bracket')}
            hint="A bracket, never an exact number."
          />
          <Toggle
            checked={Boolean(form.disability_status)}
            onChange={set('disability_status')}
            label="I have a documented disability"
            description="Unlocks disability-specific schemes."
          />
        </FormCard>
      </div>

      {/* Documents */}
      <div ref={docsRef} id="documents" className="scroll-mt-20">
        <div className="mb-3 mt-8 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[17px] font-bold">
            <FileText className="h-[18px] w-[18px] text-accent" /> Documents
          </h2>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {documents.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : docs.length === 0 ? (
          <button
            onClick={() => setUploadOpen(true)}
            className="tap flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center transition-colors hover:border-accent/50"
          >
            <UploadCloud className="h-8 w-8 text-accent" />
            <span className="mt-3 font-semibold">Upload your first document</span>
            <span className="mt-1 text-[13px] text-fg-muted">Income certificate, marksheets, bank passbook… PDF or photo, up to 10 MB.</span>
          </button>
        ) : (
          <ul className="card divide-y divide-line">
            <AnimatePresence initial={false}>
              {docs.map((doc) => (
                <m.li
                  key={doc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-muted">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{doc.type}</div>
                    <div className="truncate text-[12px] text-fg-faint">
                      {bytes(doc.size_bytes)} · {shortDate(doc.uploaded_at)}
                    </div>
                  </div>
                  {doc.retention_until ? (
                    <Badge tone="warn">
                      <Lock className="h-3 w-3" /> {shortDate(doc.retention_until)}
                    </Badge>
                  ) : (
                    <Badge tone={doc.status === 'verified' ? 'mint' : doc.status === 'rejected' ? 'danger' : 'neutral'}>
                      {doc.status === 'verified' ? 'Verified' : doc.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </Badge>
                  )}
                  <IconButton label={`View ${doc.type}`} onClick={() => openDocument(doc).catch((e: Error) => toast.error(e.message))}>
                    <Eye className="h-[18px] w-[18px]" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${doc.type}`}
                    disabled={Boolean(doc.retention_until) || remove.isPending}
                    className="hover:bg-danger-soft hover:text-danger"
                    onClick={() => {
                      if (!window.confirm(`Remove ${doc.type}?`)) return;
                      remove.mutate(doc, { onSuccess: () => toast.success('Document removed'), onError: (e) => toast.error(e.message) });
                    }}
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                  </IconButton>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        <p className="mt-2 px-1 text-[12px] text-fg-faint">
          Documents linked to an active application are kept safe. After your last application closes, they&apos;re kept for 6 months, then deleted automatically.
        </p>
      </div>

      {/* Account */}
      <h2 className="mb-3 mt-8 text-[17px] font-bold">Account</h2>
      <ul className="card divide-y divide-line">
        <li>
          <Link to="/insights" className="flex h-14 items-center gap-3 px-4 text-sm font-semibold transition-colors hover:bg-surface-2">
            <BarChart3 className="h-5 w-5 text-accent" /> Community insights <ChevronRight className="ml-auto h-4 w-4 text-fg-faint" />
          </Link>
        </li>
        {profile?.role === 'admin' && (
          <li>
            <Link to="/admin" className="flex h-14 items-center gap-3 px-4 text-sm font-semibold transition-colors hover:bg-surface-2">
              <ShieldCheck className="h-5 w-5 text-accent" /> Source audit (admin) <ChevronRight className="ml-auto h-4 w-4 text-fg-faint" />
            </Link>
          </li>
        )}
        <li>
          <button onClick={() => void signOut()} className="flex h-14 w-full items-center gap-3 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </li>
      </ul>

      {/* Sticky save bar */}
      <AnimatePresence>
        {dirty && (
          <m.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-64"
          >
            <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-accent/40 bg-surface-2 p-2 pl-4 shadow-glow">
              <span className="flex-1 text-sm font-semibold">{validation ?? 'Unsaved changes'}</span>
              <Button variant="ghost" size="sm" onClick={() => passport.data && setForm(pick(passport.data))}>
                Discard
              </Button>
              <Button size="sm" onClick={save} loading={update.isPending} disabled={Boolean(validation)}>
                Save
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Upload sheet */}
      <Sheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload a document"
        subtitle="PDF, JPG, PNG, WEBP or HEIC · up to 10 MB"
        footer={
          <Button block size="lg" disabled={!docType} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
            <UploadCloud className="h-5 w-5" /> {docType ? 'Choose file' : 'Pick a document type'}
          </Button>
        }
      >
        <div className="mb-2.5 text-[13px] font-semibold text-fg-muted">What is it?</div>
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
