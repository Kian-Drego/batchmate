import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Info,
  Layers,
  ListChecks,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Application, Match, Scholarship } from '../lib/types';
import { deadlineLabel, inr, shortDate } from '../lib/format';
import { MatchReasonList } from '../components/MatchReasons';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Panel,
  Progress,
  SectionHeader,
  Spinner,
  StatusBadge,
  TierBadge,
} from '../components/ui';

interface DetailResponse {
  scholarship: Scholarship;
  match: Match;
  profileCompleteness: { percent: number; missing: string[] };
}

const PIPELINE = ['Not Started', 'In Progress', 'Submitted', 'Verification Pending', 'Awarded'];

function GuidedDrawer({
  open,
  onClose,
  scholarship,
  application,
  onApplicationChange,
}: {
  open: boolean;
  onClose: () => void;
  scholarship: Scholarship;
  application: Application | null;
  onApplicationChange: (a: Application) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = async (itemId: string, done: boolean) => {
    if (!application) return;
    setBusyId(itemId);
    try {
      const data = await api.patch<{ application: Application }>(
        `/applications/${application._id}/checklist/${itemId}`,
        { done }
      );
      onApplicationChange(data.application);
    } finally {
      setBusyId(null);
    }
  };

  const advance = async (status: string) => {
    if (!application) return;
    setNote(null);
    try {
      const data = await api.patch<{ application: Application }>(
        `/applications/${application._id}/status`,
        { status }
      );
      onApplicationChange(data.application);
    } catch (err) {
      setNote((err as Error).message);
    }
  };

  const nativeSubmit = async () => {
    if (!application) return;
    setSubmitting(true);
    setNote(null);
    try {
      const data = await api.post<{ application: Application }>(
        `/applications/${application._id}/submit`
      );
      onApplicationChange(data.application);
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const done = application ? application.checklist.filter((c) => c.done).length : 0;
  const total = application?.checklist.length ?? 0;
  const pct = total ? (done / total) * 100 : 0;
  const currentStageIndex = application ? PIPELINE.indexOf(application.status) : -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-3xl flex-col border-l border-line bg-paper"
            role="dialog"
            aria-label="Guided application"
          >
            <div className="flex items-center justify-between border-b border-line bg-paper-raised px-5 py-3">
              <div className="min-w-0">
                <div className="label-eyebrow">Guided application</div>
                <div className="truncate font-semibold text-ink">{scholarship.title}</div>
              </div>
              <button
                onClick={onClose}
                className="rounded-card border border-line p-2 hover:bg-paper-sunken"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 overflow-hidden lg:grid-cols-2">
              {/* Left: interactive checklist + tracker */}
              <div className="overflow-y-auto border-line p-5 lg:border-r">
                <div className="mb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-lavender" aria-hidden />
                  <h3 className="font-semibold">Application checklist</h3>
                </div>
                <Progress value={pct} label={`${done}/${total} steps complete`} tone={pct === 100 ? 'eligible' : 'lavender'} />

                {note && (
                  <div className="mt-3">
                    <Alert tone="warn">{note}</Alert>
                  </div>
                )}

                <ul className="mt-4 space-y-1">
                  {application?.checklist.map((item) => (
                    <li key={item._id}>
                      <button
                        onClick={() => toggle(item._id, !item.done)}
                        disabled={busyId === item._id}
                        className="flex w-full items-start gap-3 rounded-card border border-transparent px-2 py-2 text-left hover:border-line-faint hover:bg-paper-sunken disabled:opacity-60"
                      >
                        {item.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-eligible" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                        )}
                        <span className={`text-sm ${item.done ? 'text-ink-faint line-through' : 'text-ink-soft'}`}>
                          {item.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t border-line-faint pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-lavender" aria-hidden />
                    <h3 className="font-semibold">Status tracker</h3>
                  </div>
                  <ol className="space-y-2">
                    {PIPELINE.map((stage, i) => (
                      <li key={stage} className="flex items-center gap-3 text-sm">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-pill border text-[10px] font-bold ${
                            i <= currentStageIndex
                              ? 'border-eligible bg-eligible text-paper'
                              : 'border-line-faint text-ink-faint'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className={i <= currentStageIndex ? 'font-medium text-ink' : 'text-ink-faint'}>
                          {stage}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {application && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-ink-faint">Current:</span>
                      <StatusBadge status={application.status} />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: external portal */}
              <div className="flex flex-col overflow-y-auto bg-paper-sunken/50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-lavender" aria-hidden />
                  <h3 className="font-semibold">Official portal</h3>
                </div>

                <Panel flat className="p-4">
                  <div className="label-eyebrow">Provider</div>
                  <div className="mt-1 font-medium text-ink">{scholarship.provider}</div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Source verified · last scraped {shortDate(scholarship.lastScrapedAt)}
                  </div>
                  <a
                    href={scholarship.externalPortalUrl ?? scholarship.officialSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block"
                  >
                    <Button className="w-full">
                      Open official portal <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </a>
                  <p className="mt-2 break-all text-xs text-ink-faint">
                    {scholarship.externalPortalUrl ?? scholarship.officialSourceUrl}
                  </p>
                </Panel>

                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-lavender" aria-hidden />
                    <h4 className="text-sm font-semibold">Provider application steps</h4>
                  </div>
                  <ol className="space-y-2">
                    {scholarship.applicationSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-lavender" aria-hidden />
                    <h4 className="text-sm font-semibold">Documents to carry</h4>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {scholarship.requiredDocuments.map((d) => (
                      <li key={d}>
                        <Badge tone="neutral">{d}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>

                {application && (
                  <div className="mt-6 space-y-2 border-t border-line-faint pt-4">
                    {application.status === 'In Progress' && application.mode === 'external' && (
                      <Button className="w-full" onClick={() => advance('Submitted')}>
                        Mark as submitted on portal
                      </Button>
                    )}
                    {application.status === 'Submitted' && (
                      <Button variant="secondary" className="w-full" onClick={() => advance('Verification Pending')}>
                        Mark verification pending
                      </Button>
                    )}
                    {application.status === 'Verification Pending' && (
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={() => advance('Awarded')}>
                          Mark awarded
                        </Button>
                        <Button variant="danger" className="flex-1" onClick={() => advance('Rejected')}>
                          Mark rejected
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ScholarshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<DetailResponse>(`/scholarships/${id}`),
      api.get<{ applications: Application[] }>('/applications'),
    ])
      .then(([d, apps]) => {
        setDetail(d);
        setApplication(apps.applications.find((a) => a.scholarship?._id === id) ?? null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const scholarship = detail?.scholarship;
  const match = detail?.match;

  const startApplication = async () => {
    if (!id) return;
    setStarting(true);
    setError(null);
    try {
      const data = await api.post<{ application: Application }>('/applications', {
        scholarshipId: id,
      });
      setApplication(data.application);
      setDrawerOpen(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const nativeSubmit = async () => {
    if (!application) return;
    setError(null);
    try {
      const data = await api.post<{ application: Application }>(
        `/applications/${application._id}/submit`
      );
      setApplication(data.application);
    } catch (err) {
      const e = err as Error & { details?: { missingProfileFields?: string[]; missingDocuments?: string[] } };
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!scholarship || !match) {
    return (
      <EmptyState
        icon={Info}
        title="Scholarship unavailable"
        description={error ?? 'This record could not be loaded.'}
      />
    );
  }

  const dl = deadlineLabel(scholarship.deadline);
  const criteria: { label: string; value: string }[] = [
    { label: 'Degree', value: scholarship.degree.join(', ') || 'Any' },
    { label: 'Current year', value: scholarship.currentYearAllowed.join(', ') || 'Any' },
    { label: 'Category', value: scholarship.category.join(', ') || 'Any' },
    { label: 'Domicile', value: scholarship.stateDomicile.join(', ') || 'Any' },
    { label: 'Gender', value: scholarship.gender.join(', ') || 'Any' },
    { label: 'Income limit', value: scholarship.incomeLimit ? inr(scholarship.incomeLimit) : 'No limit' },
    { label: 'Minimum marks', value: scholarship.marksMin ? `${scholarship.marksMin}%` : 'None specified' },
  ];

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-2 inline-flex min-h-[2.5rem] items-center gap-1.5 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to matches
      </button>

      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {/* Header */}
      <Panel className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={match.tier} />
          <Badge tone="neutral">{scholarship.type}</Badge>
          <Badge tone={dl.tone === 'urgent' ? 'stop' : dl.tone === 'soon' ? 'caution' : 'neutral'}>
            {dl.text}
          </Badge>
          {scholarship.aptitudeTestRequired && (
            <Badge tone="lavender">
              <GraduationCap className="h-3 w-3" /> Aptitude test
            </Badge>
          )}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">{scholarship.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{scholarship.provider}</p>

        <div className="mt-5 grid grid-cols-2 gap-5 border-t border-line-faint pt-5 sm:grid-cols-4">
          <div>
            <div className="label-eyebrow">Award value</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{inr(scholarship.amount)}</div>
          </div>
          <div>
            <div className="label-eyebrow">Fit score</div>
            <div
              className={`mt-1 font-mono text-2xl font-semibold ${
                match.fitScore >= 80 ? 'text-eligible' : 'text-caution'
              }`}
            >
              {match.fitScore}/100
            </div>
          </div>
          <div>
            <div className="label-eyebrow">Deadline</div>
            <div className="mt-1 text-sm font-semibold">{shortDate(scholarship.deadline)}</div>
          </div>
          <div>
            <div className="label-eyebrow">Source</div>
            <a
              href={scholarship.officialSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 py-2 text-sm font-semibold text-lavender-ink underline"
            >
              Official <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {scholarship.amountDescription && (
          <p className="mt-4 text-sm text-ink-soft">{scholarship.amountDescription}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line-faint pt-5">
          {!application ? (
            <Button onClick={startApplication} loading={starting}>
              {scholarship.applicationMode === 'native' ? 'Start application' : 'Start guided application'}
            </Button>
          ) : (
            <>
              <Button onClick={() => setDrawerOpen(true)}>
                {scholarship.applicationMode === 'native' ? 'Continue application' : 'Open guided application'}
              </Button>
              {scholarship.applicationMode === 'native' && application.status !== 'Submitted' && (
                <Button variant="secondary" onClick={nativeSubmit}>
                  <Send className="h-4 w-4" /> Submit application
                </Button>
              )}
            </>
          )}
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Match transparency */}
          <Panel className="p-5">
            <h3 className="mb-3 text-lg font-semibold">Why you matched</h3>
            <MatchReasonList reasons={match.reasons} />
            {match.missingFields.length > 0 && (
              <div className="mt-4">
                <Alert tone="warn">
                  Missing for verification: {match.missingFields.join(', ')}
                </Alert>
              </div>
            )}
          </Panel>

          {/* Eligibility */}
          <Panel className="p-5">
            <h3 className="mb-3 text-lg font-semibold">Eligibility criteria</h3>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {criteria.map((c) => (
                <div key={c.label} className="flex items-center justify-between border-b border-line-faint py-2.5">
                  <dt className="text-sm text-ink-faint">{c.label}</dt>
                  <dd className="max-w-[60%] text-right text-sm font-medium text-ink">{c.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {/* Selection process */}
          <Panel className="p-5">
            <h3 className="mb-3 text-lg font-semibold">Selection process</h3>
            <ol className="space-y-3">
              {scholarship.selectionProcess.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-card border border-line bg-paper-sunken font-mono text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-sm text-ink-soft">{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Documents */}
          <Panel className="p-5">
            <h3 className="mb-3 text-lg font-semibold">Required documents</h3>
            <ul className="space-y-2">
              {scholarship.requiredDocuments.map((d) => (
                <li key={d} className="flex items-center gap-2 text-sm text-ink-soft">
                  <ChevronRight className="h-4 w-4 text-ink-faint" /> {d}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">
              Upload these on your passport to raise your document-readiness score.
            </p>
          </Panel>

          {/* Renewal */}
          {scholarship.renewalCriteria && (
            <Panel className="p-5">
              <h3 className="mb-3 text-lg font-semibold">Renewal conditions</h3>
              <ul className="space-y-2 text-sm text-ink-soft">
                {scholarship.renewalCriteria.minimumCgpa !== undefined && (
                  <li>Minimum CGPA: {scholarship.renewalCriteria.minimumCgpa}</li>
                )}
                {scholarship.renewalCriteria.minimumAttendance !== undefined && (
                  <li>Minimum attendance: {scholarship.renewalCriteria.minimumAttendance}%</li>
                )}
                {scholarship.renewalCriteria.notes && <li>{scholarship.renewalCriteria.notes}</li>}
              </ul>
              {scholarship.aptitudeTestRequired && (
                <a
                  href={`/exams/${scholarship._id}/take`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lavender-ink underline"
                >
                  Prepare with a mock test <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </Panel>
          )}
        </div>
      </div>

      <GuidedDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        scholarship={scholarship}
        application={application}
        onApplicationChange={setApplication}
      />
    </div>
  );
}
