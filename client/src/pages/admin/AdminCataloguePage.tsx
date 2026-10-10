import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import type { ScholarshipRow } from '@shared/types.ts';
import { CATEGORIES, CURRENT_YEARS, DEGREES, DOCUMENT_TYPES, GENDERS, SCHOLARSHIP_TYPES, STATES } from '../../lib/constants';
import { useCatalogue, useSaveScholarship, type ScholarshipInput } from '../../lib/queries';
import { deadlineLabel, inr, relativeTime } from '../../lib/format';
import { Button, ChipGroup, ChipMulti, Empty, Field, Input, ListSkeleton, Notice, PageTitle, Sheet, Surface, Switch, Tabs, Tag, Textarea, typeTone } from '../../components/ui';

type View = 'live' | 'hidden';

function blank(): ScholarshipInput {
  return {
    provider: '',
    title: '',
    type: 'Government',
    amount: 0,
    amount_description: null,
    degree: [],
    current_year_allowed: [],
    income_limit: null,
    marks_min: null,
    category: [],
    state_domicile: ['All India'],
    gender: [],
    deadline: null,
    required_documents: [],
    selection_process: [],
    aptitude_test_required: false,
    disability_required: false,
    renewal_criteria: null,
    official_source_url: '',
    application_mode: 'external',
    external_portal_url: null,
    application_steps: [],
    description: null,
    exam_pattern: null,
    tags: [],
    active: true,
  };
}

const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const numOrNull = (v: string) => (v === '' ? null : Number(v));

function ScholarshipForm({ value, onChange }: { value: ScholarshipInput; onChange: (v: ScholarshipInput) => void }) {
  const set = <K extends keyof ScholarshipInput>(k: K, v: ScholarshipInput[K]) => onChange({ ...value, [k]: v });
  const states = value.state_domicile;
  return (
    <div className="space-y-6">
      <Field label="Title" htmlFor="title">
        <Input id="title" value={value.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Provider" htmlFor="provider">
        <Input id="provider" value={value.provider} onChange={(e) => set('provider', e.target.value)} />
      </Field>
      <div className="space-y-2.5">
        <div className="pl-1 text-[13px] font-semibold text-ink-2">Type</div>
        <ChipGroup label="Type" options={SCHOLARSHIP_TYPES} value={value.type} onChange={(v) => v && set('type', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)" htmlFor="amount">
          <Input id="amount" type="number" inputMode="numeric" min={0} value={value.amount} onChange={(e) => set('amount', Number(e.target.value) || 0)} />
        </Field>
        <Field label="Deadline" htmlFor="deadline">
          <Input id="deadline" type="date" value={value.deadline ? value.deadline.slice(0, 10) : ''} onChange={(e) => set('deadline', e.target.value ? new Date(`${e.target.value}T23:59:00+05:30`).toISOString() : null)} />
        </Field>
      </div>
      <Field label="Amount details" htmlFor="amount_description">
        <Input id="amount_description" value={value.amount_description ?? ''} onChange={(e) => set('amount_description', e.target.value || null)} placeholder="e.g. ₹50,000 per year for 4 years" />
      </Field>

      <div className="space-y-2.5">
        <div className="pl-1 text-[13px] font-semibold text-ink-2">Eligible levels (none = any)</div>
        <ChipMulti label="Levels" options={DEGREES} value={value.degree} onChange={(v) => set('degree', v)} />
      </div>
      <div className="space-y-2.5">
        <div className="pl-1 text-[13px] font-semibold text-ink-2">Year of study (none = any)</div>
        <ChipMulti label="Years" options={CURRENT_YEARS} value={value.current_year_allowed} onChange={(v) => set('current_year_allowed', v)} />
      </div>
      <div className="space-y-2.5">
        <div className="pl-1 text-[13px] font-semibold text-ink-2">Categories (none = any)</div>
        <ChipMulti label="Categories" options={CATEGORIES} value={value.category} onChange={(v) => set('category', v)} />
      </div>
      <div className="space-y-2.5">
        <div className="pl-1 text-[13px] font-semibold text-ink-2">Gender (none = any)</div>
        <ChipMulti label="Gender" options={GENDERS.filter((g) => g !== 'Prefer not to say')} value={value.gender} onChange={(v) => set('gender', v)} />
      </div>
      <Field label="Domicile" hint="Hold Ctrl / ⌘ to pick several. “All India” means no restriction." htmlFor="states">
        <select
          id="states"
          multiple
          value={states}
          onChange={(e) => set('state_domicile', Array.from(e.target.selectedOptions).map((o) => o.value))}
          className="h-44 w-full rounded-2xl bg-sunken p-2 text-[14px] text-ink shadow-well focus:outline-none"
        >
          {STATES.map((s) => (
            <option key={s} value={s} className="rounded-lg px-2 py-1">
              {s}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Income limit (₹)" htmlFor="income_limit">
          <Input id="income_limit" type="number" inputMode="numeric" min={0} value={value.income_limit ?? ''} onChange={(e) => set('income_limit', numOrNull(e.target.value))} />
        </Field>
        <Field label="Min. marks (%)" htmlFor="marks_min">
          <Input id="marks_min" type="number" inputMode="decimal" min={0} max={100} value={value.marks_min ?? ''} onChange={(e) => set('marks_min', numOrNull(e.target.value))} />
        </Field>
      </div>

      <div className="space-y-2.5">
        <div className="pl-1 text-[13px] font-semibold text-ink-2">Required documents</div>
        <ChipMulti label="Documents" options={DOCUMENT_TYPES} value={value.required_documents} onChange={(v) => set('required_documents', v)} />
      </div>

      <div className="space-y-2.5">
        <div className="pl-1 text-[13px] font-semibold text-ink-2">How students apply</div>
        <ChipGroup
          label="Application mode"
          options={['external', 'native'] as const}
          labels={{ external: 'Official portal', native: 'Through BatchMate' }}
          value={value.application_mode}
          onChange={(v) => v && set('application_mode', v)}
        />
      </div>
      <Field label="Official source URL" htmlFor="official_source_url">
        <Input id="official_source_url" type="url" value={value.official_source_url} onChange={(e) => set('official_source_url', e.target.value)} placeholder="https://" />
      </Field>
      {value.application_mode === 'external' && (
        <Field label="Application portal URL" hint="Leave blank to use the source URL." htmlFor="external_portal_url">
          <Input id="external_portal_url" type="url" value={value.external_portal_url ?? ''} onChange={(e) => set('external_portal_url', e.target.value || null)} placeholder="https://" />
        </Field>
      )}
      <Field label="Application steps" hint="One per line." htmlFor="steps">
        <Textarea id="steps" value={value.application_steps.join('\n')} onChange={(e) => set('application_steps', lines(e.target.value))} />
      </Field>
      <Field label="Selection process" hint="One per line." htmlFor="selection">
        <Textarea id="selection" value={value.selection_process.join('\n')} onChange={(e) => set('selection_process', lines(e.target.value))} />
      </Field>
      <Field label="Renewal: minimum CGPA" htmlFor="renew">
        <Input
          id="renew"
          type="number"
          inputMode="decimal"
          min={0}
          max={10}
          step="0.1"
          value={value.renewal_criteria?.minimumCgpa ?? ''}
          onChange={(e) => {
            const v = numOrNull(e.target.value);
            set('renewal_criteria', v == null ? (value.renewal_criteria?.notes ? { notes: value.renewal_criteria.notes } : null) : { ...(value.renewal_criteria ?? {}), minimumCgpa: v });
          }}
        />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" value={value.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
      </Field>
      <Field label="Tags" hint="Comma separated — helps search." htmlFor="tags">
        <Input id="tags" value={value.tags.join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} />
      </Field>
      <Switch checked={value.aptitude_test_required} onChange={(v) => set('aptitude_test_required', v)} label="Has an aptitude test" description="Shows a mock test in Prep." />
      <Switch checked={value.disability_required} onChange={(v) => set('disability_required', v)} label="Reserved for persons with disabilities" description="Only students who mark a documented disability in their passport are matched." />
      <Switch checked={value.active} onChange={(v) => set('active', v)} label="Live" description="Hidden scholarships never reach students." />
    </div>
  );
}

function validate(v: ScholarshipInput): string | null {
  if (!v.title.trim()) return 'Add a title';
  if (!v.provider.trim()) return 'Add a provider';
  if (!/^https?:\/\//.test(v.official_source_url)) return 'Add a valid official source URL';
  if (v.state_domicile.length === 0) return 'Pick at least one domicile (or All India)';
  return null;
}

export default function AdminCataloguePage() {
  const { data, isLoading, error } = useCatalogue();
  const save = useSaveScholarship();
  const [view, setView] = useState<View>('live');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<ScholarshipInput | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((s) => (view === 'live' ? s.active : !s.active)).filter((s) => !q || `${s.title} ${s.provider}`.toLowerCase().includes(q));
  }, [data, view, query]);

  const edit = (s: ScholarshipRow) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { created_at, updated_at, last_scraped_at, ...rest } = s;
    setDraft(rest);
    setSheetOpen(true);
  };

  const submit = () => {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) {
      toast.error(problem);
      return;
    }
    save.mutate(draft, {
      onSuccess: () => {
        toast.success(draft.id ? 'Saved' : 'Scholarship added');
        setSheetOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div>
      <PageTitle
        kicker={`${(data ?? []).filter((s) => s.active).length} live`}
        title="Catalogue"
        action={
          <Button
            onClick={() => {
              setDraft(blank());
              setSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span>
          </Button>
        }
      />

      <Tabs
        id="catalogue"
        value={view}
        onChange={setView}
        options={[
          { value: 'live', label: 'Live' },
          { value: 'hidden', label: 'Hidden' },
        ]}
      />
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the catalogue" className="rounded-full pl-11" />
      </div>

      <div className="mt-4">
        {error && <Notice tone="rose">{(error as Error).message}</Notice>}
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : list.length === 0 ? (
          <Empty title="Nothing here" />
        ) : (
          <Surface className="divide-y divide-dashed divide-line overflow-hidden">
            {list.map((s) => (
              <button key={s.id} onClick={() => edit(s)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-sunken/60">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <Tag tone={typeTone(s.type)}>{s.type}</Tag>
                    {s.application_mode === 'native' && <Tag tone="lilac">In-app</Tag>}
                  </div>
                  <div className="truncate text-[15px] font-semibold">{s.title}</div>
                  <div className="truncate text-[12.5px] text-ink-3">
                    {s.provider} · edited {relativeTime(s.updated_at)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="num text-[17px] font-semibold">{inr(s.amount)}</div>
                  <div className="text-[12px] text-ink-3">{deadlineLabel(s.deadline).text}</div>
                </div>
              </button>
            ))}
          </Surface>
        )}
      </div>

      <Sheet
        open={sheetOpen && Boolean(draft)}
        onClose={() => setSheetOpen(false)}
        wide
        title={draft?.id ? 'Edit scholarship' : 'New scholarship'}
        subtitle={draft?.id ? draft.title : 'Goes live for matching as soon as you save.'}
        footer={
          <div className="flex gap-2">
            <Button variant="soft" size="lg" className="flex-1" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" className="flex-[2]" onClick={submit} loading={save.isPending}>
              Save
            </Button>
          </div>
        }
      >
        {draft && <ScholarshipForm value={draft} onChange={setDraft} />}
        {draft?.exam_pattern && <p className="mt-6 text-[12.5px] text-ink-3">This scholarship has a structured exam pattern from the source data; it is kept as-is.</p>}
      </Sheet>
    </div>
  );
}
