import { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileUp,
  Lock,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Passport } from '../lib/types';
import {
  CATEGORIES,
  CURRENT_YEARS,
  DEGREES,
  DOCUMENT_TYPES,
  GENDERS,
  INCOME_BRACKETS,
  STATES,
} from '../lib/constants';
import { bytes, shortDate } from '../lib/format';
import {
  Alert,
  Badge,
  Button,
  Field,
  Panel,
  Progress,
  SectionHeader,
  Select,
  Spinner,
  TextInput,
} from '../components/ui';

const INCOME_LABELS: Record<string, string> = {
  'Below 100000': 'Below ₹1,00,000',
  '100000-250000': '₹1,00,000 – ₹2,50,000',
  '250000-500000': '₹2,50,000 – ₹5,00,000',
  '500000-800000': '₹5,00,000 – ₹8,00,000',
  '800000-1200000': '₹8,00,000 – ₹12,00,000',
  Above1200000: 'Above ₹12,00,000',
  'Above 1200000': 'Above ₹12,00,000',
};

/**
 * Older records (and freshly created passports) can come back without the empty
 * `academic` / `demographic` objects or `documents` array. Normalise the shape so
 * the form always has something to bind to instead of throwing.
 */
function normalizePassport(passport: Passport): Passport {
  return {
    ...passport,
    academic: passport.academic ?? {},
    demographic: passport.demographic ?? {},
    documents: passport.documents ?? [],
  };
}

export default function PassportPage() {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [form, setForm] = useState<Passport | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<string>(DOCUMENT_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyPassport = (next: Passport) => {
    const normalized = normalizePassport(next);
    setPassport(normalized);
    setForm(structuredClone(normalized));
  };

  useEffect(() => {
    api.get<{ passport: Passport }>('/passport').then((p) => applyPassport(p.passport));
  }, []);

  const update = (path: 'academic' | 'demographic', key: string, value: unknown) => {
    setForm((prev) =>
      prev ? { ...prev, [path]: { ...prev[path], [key]: value } } : prev
    );
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const data = await api.put<{ passport: Passport }>('/passport', {
        fullName: form.fullName,
        academic: form.academic,
        demographic: form.demographic,
      });
      applyPassport(data.passport);
      setSavedAt(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', uploadType);
      const data = await api.upload<{ passport: Passport }>('/passport/documents', fd);
      applyPassport(data.passport);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeDoc = async (id: string) => {
    setError(null);
    try {
      const data = await api.del<{ passport: Passport }>(`/passport/documents/${id}`);
      applyPassport(data.passport);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Scholarship Passport"
        title="Verified profile metadata"
        description="Only non-restricted academic and demographic fields. Saving triggers an immediate recalculation of every scholarship match."
        action={
          savedAt && !saving ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-eligible">
              <Check className="h-4 w-4" /> Saved · matches recalculated
            </span>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <Panel className="mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-eligible" aria-hidden />
            <span className="text-sm font-semibold">Profile completeness</span>
          </div>
          <span className="data-value text-sm text-ink-soft">{passport?.completeness ?? 0}%</span>
        </div>
        <Progress
          value={passport?.completeness ?? 0}
          tone={(passport?.completeness ?? 0) === 100 ? 'eligible' : 'lavender'}
        />
        <p className="mt-2 text-xs text-ink-faint">
          Privacy note: Aadhaar, PAN, or any government identifier is never requested or stored.
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Academic */}
        <Panel className="p-5">
          <h3 className="mb-4 text-lg font-semibold">Academic record</h3>
          <div className="space-y-4">
            <Field label="Institution" htmlFor="institution">
              <TextInput
                id="institution"
                value={form.academic.institution ?? ''}
                onChange={(e) => update('academic', 'institution', e.target.value)}
                placeholder="College or school name"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Degree" htmlFor="degree">
                <Select
                  id="degree"
                  value={form.academic.degree ?? ''}
                  onChange={(e) => update('academic', 'degree', e.target.value || undefined)}
                >
                  <option value="">Select degree</option>
                  {DEGREES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Current year" htmlFor="currentYear">
                <Select
                  id="currentYear"
                  value={form.academic.currentYear ?? ''}
                  onChange={(e) => update('academic', 'currentYear', e.target.value || undefined)}
                >
                  <option value="">Select year</option>
                  {CURRENT_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Course" htmlFor="course">
              <TextInput
                id="course"
                value={form.academic.course ?? ''}
                onChange={(e) => update('academic', 'course', e.target.value)}
                placeholder="e.g. B.Sc Computer Science"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Class 12 percentage" htmlFor="class12">
                <TextInput
                  id="class12"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.academic.class12Percentage ?? ''}
                  onChange={(e) =>
                    update(
                      'academic',
                      'class12Percentage',
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                />
              </Field>
              <Field label="Current CGPA (10-point)" htmlFor="cgpa">
                <TextInput
                  id="cgpa"
                  type="number"
                  min={0}
                  max={10}
                  step="0.01"
                  value={form.academic.cgpa ?? ''}
                  onChange={(e) =>
                    update('academic', 'cgpa', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Entrance exam (optional)" htmlFor="exam">
                <TextInput
                  id="exam"
                  value={form.academic.entranceExamName ?? ''}
                  onChange={(e) => update('academic', 'entranceExamName', e.target.value)}
                  placeholder="e.g. JEE Main"
                />
              </Field>
              <Field label="Entrance score (optional)" htmlFor="examScore">
                <TextInput
                  id="examScore"
                  type="number"
                  step="0.01"
                  value={form.academic.entranceExamScore ?? ''}
                  onChange={(e) =>
                    update(
                      'academic',
                      'entranceExamScore',
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                />
              </Field>
            </div>
          </div>
        </Panel>

        {/* Demographic */}
        <Panel className="p-5">
          <h3 className="mb-4 text-lg font-semibold">Demographic metadata</h3>
          <div className="space-y-4">
            <Field label="State / Domicile" htmlFor="state">
              <Select
                id="state"
                value={form.demographic.state ?? ''}
                onChange={(e) => update('demographic', 'state', e.target.value || undefined)}
              >
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <Select
                  id="category"
                  value={form.demographic.category ?? ''}
                  onChange={(e) => update('demographic', 'category', e.target.value || undefined)}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Gender" htmlFor="gender">
                <Select
                  id="gender"
                  value={form.demographic.gender ?? ''}
                  onChange={(e) => update('demographic', 'gender', e.target.value || undefined)}
                >
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Family annual income bracket"
              htmlFor="income"
              hint="Bracketed intentionally — an exact figure is never stored."
            >
              <Select
                id="income"
                value={form.demographic.incomeBracket ?? ''}
                onChange={(e) => update('demographic', 'incomeBracket', e.target.value || undefined)}
              >
                <option value="">Select bracket</option>
                {INCOME_BRACKETS.map((i) => (
                  <option key={i} value={i}>
                    {INCOME_LABELS[i] ?? i}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-3 rounded-card border border-line-faint px-3 py-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lavender"
                checked={Boolean(form.demographic.disabilityStatus)}
                onChange={(e) => update('demographic', 'disabilityStatus', e.target.checked)}
              />
              <span className="text-sm text-ink-soft">
                I have a documented disability (enables disability-specific schemes)
              </span>
            </label>
          </div>
        </Panel>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} loading={saving}>
          Save passport & recalculate matches
        </Button>
      </div>

      {/* Documents */}
      <div className="mt-8">
        <SectionHeader
          eyebrow="Document registry"
          title="Supporting documents"
          description="Files stay linked to your passport. Documents under active applications are locked; completed applications keep a 6-month retention window."
        />

        <Panel className="p-5">
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Field label="Document type" htmlFor="docType">
                <Select
                  id="docType"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as never)}
                >
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
            <Button
              variant="secondary"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Upload file
            </Button>
            <p className="text-xs text-ink-faint">PDF or image · up to 10 MB</p>
          </div>

          {passport && passport.documents.length === 0 ? (
            <div className="flex flex-col items-center rounded-card border border-dashed border-line-faint py-10 text-center">
              <FileUp className="h-6 w-6 text-ink-faint" aria-hidden />
              <p className="mt-2 text-sm text-ink-soft">No documents uploaded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line-faint">
              {passport?.documents.map((doc) => (
                <li key={doc._id} className="flex items-center gap-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-line-faint bg-paper-sunken">
                    <FileUp className="h-4 w-4 text-ink-soft" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{doc.type}</div>
                    <div className="truncate text-xs text-ink-faint">
                      {doc.fileName} · {bytes(doc.sizeBytes)} · {shortDate(doc.uploadedAt)}
                    </div>
                  </div>
                  {doc.retentionUntilDate ? (
                    <Badge tone="caution">
                      <Lock className="h-3 w-3" /> Until {shortDate(doc.retentionUntilDate)}
                    </Badge>
                  ) : (
                    <Badge tone={doc.status === 'verified' ? 'eligible' : 'neutral'}>
                      {doc.status === 'verified' ? 'Verified' : 'Pending review'}
                    </Badge>
                  )}
                  <button
                    onClick={() => removeDoc(doc._id)}
                    disabled={Boolean(doc.retentionUntilDate)}
                    className="rounded-card border border-line-faint p-2 text-ink-faint hover:bg-stop-soft hover:text-stop disabled:opacity-40"
                    aria-label={`Remove ${doc.type}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
