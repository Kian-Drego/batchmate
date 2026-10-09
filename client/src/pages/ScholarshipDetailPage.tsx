import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Info,
  Repeat,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { evaluateScholarship } from '@shared/matching.ts';
import { useApplications, useDocuments, usePassport, useScholarship, useStartApplication } from '../lib/queries';
import { tick } from '../lib/haptics';
import { deadlineLabel, inr, shortDate } from '../lib/format';
import MatchReasons from '../components/MatchReasons';
import ApplySheet from '../components/ApplySheet';
import { scoreTone } from '../components/ScholarshipCard';
import { Badge, Button, Card, EmptyState, IconButton, Ring, Skeleton, StatusBadge, TierBadge, cn } from '../components/ui';

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
        <Icon className="h-[18px] w-[18px] text-accent" /> {title}
      </h2>
      {children}
    </Card>
  );
}

export default function ScholarshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: s, isLoading, error } = useScholarship(id);
  const passport = usePassport();
  const documents = useDocuments();
  const applications = useApplications();
  const start = useStartApplication();
  const [sheetOpen, setSheetOpen] = useState(false);

  const application = applications.data?.find((a) => a.scholarship_id === id);
  const match = useMemo(
    () => (s && passport.data ? evaluateScholarship(s, passport.data, documents.data ?? []) : null),
    [s, passport.data, documents.data]
  );
  const owned = new Set((documents.data ?? []).map((d) => d.type));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (!s) {
    return <EmptyState icon={Info} title="Scholarship unavailable" description={(error as Error)?.message ?? 'It may have been removed.'} />;
  }

  const dl = deadlineLabel(s.deadline);
  const closed = dl.tone === 'closed';

  const onStart = () =>
    start.mutate(s.id, {
      onSuccess: () => {
        tick(10);
        setSheetOpen(true);
      },
      onError: (e) => toast.error(e.message),
    });

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: s.title, text: `${s.title} — ${inr(s.amount)}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  const criteria = [
    ['Degree', s.degree.join(', ') || 'Any'],
    ['Year', s.current_year_allowed.join(', ') || 'Any'],
    ['Category', s.category.join(', ') || 'Any'],
    ['Domicile', s.state_domicile.join(', ') || 'Any'],
    ['Gender', s.gender.join(', ') || 'Any'],
    ['Income limit', s.income_limit ? inr(s.income_limit) : 'No limit'],
    ['Min. marks', s.marks_min ? `${s.marks_min}%` : 'None'],
  ];

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="tap -ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-fg-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <IconButton label="Share" onClick={share}>
          <Share2 className="h-5 w-5" />
        </IconButton>
      </div>

      {/* Hero */}
      <Card className="relative overflow-hidden rounded-3xl p-5 sm:p-7" glow={match?.tier === 'Highly Eligible'}>
        <div className="flex flex-wrap items-center gap-1.5">
          {match && match.hardMatch && <TierBadge tier={match.tier} />}
          {match && !match.hardMatch && <Badge tone="danger">Not eligible</Badge>}
          <Badge>{s.type}</Badge>
          {s.aptitude_test_required && (
            <Badge tone="accent">
              <GraduationCap className="h-3 w-3" /> Aptitude test
            </Badge>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{s.title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{s.provider}</p>

        <div className="mt-5 flex items-center gap-5">
          {match && (
            <Ring value={match.fitScore} size={76} stroke={7} tone={scoreTone(match.fitScore)}>
              <div className="text-center">
                <div className="font-mono text-lg font-bold leading-none tabular-nums">{match.fitScore}</div>
                <div className="mt-0.5 text-[10px] font-semibold text-fg-faint">FIT</div>
              </div>
            </Ring>
          )}
          <div className="grid flex-1 grid-cols-2 gap-4">
            <div>
              <div className="text-[12px] text-fg-faint">Award</div>
              <div className="font-mono text-xl font-bold tabular-nums text-mint">{inr(s.amount)}</div>
            </div>
            <div>
              <div className="text-[12px] text-fg-faint">Deadline</div>
              <div className={cn('text-[15px] font-bold', dl.tone === 'urgent' && 'text-hot', dl.tone === 'soon' && 'text-warn', closed && 'text-danger')}>
                {dl.text}
              </div>
              <div className="text-[12px] text-fg-faint">{shortDate(s.deadline)}</div>
            </div>
          </div>
        </div>
        {s.amount_description && <p className="mt-4 text-[13px] leading-relaxed text-fg-muted">{s.amount_description}</p>}
      </Card>

      {/* Desktop CTA */}
      <div className="mt-4 hidden gap-2 lg:flex">
        {application ? (
          <Button size="lg" onClick={() => setSheetOpen(true)}>
            <ClipboardCheck className="h-4 w-4" /> Continue application
          </Button>
        ) : (
          <Button size="lg" onClick={onStart} loading={start.isPending} disabled={closed}>
            {closed ? 'Applications closed' : 'Start applying'}
          </Button>
        )}
        {s.aptitude_test_required && (
          <Link to={`/exams/${s.id}/take`}>
            <Button size="lg" variant="secondary">
              <GraduationCap className="h-4 w-4" /> Take mock test
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        {match && (
          <Section icon={ShieldCheck} title="Why you match">
            <MatchReasons reasons={match.reasons} missing={match.missingFields} />
          </Section>
        )}

        <Section icon={Info} title="Eligibility">
          <dl className="divide-y divide-line">
            {criteria.map(([k, v]) => (
              <div key={k} className="flex gap-4 py-2.5 text-sm">
                <dt className="w-28 shrink-0 text-fg-faint">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={FileCheck2} title="Documents needed">
          <ul className="flex flex-wrap gap-2">
            {s.required_documents.map((d) => (
              <li key={d}>
                <Badge tone={owned.has(d) ? 'mint' : 'neutral'}>
                  {owned.has(d) && '✓ '}
                  {d}
                </Badge>
              </li>
            ))}
          </ul>
          {s.required_documents.some((d) => !owned.has(d)) && (
            <Link to="/passport#documents" className="mt-3 inline-block text-[13px] font-semibold text-accent">
              Upload missing documents →
            </Link>
          )}
        </Section>

        {s.selection_process.length > 0 && (
          <Section icon={CalendarClock} title="Selection process">
            <ol className="space-y-2">
              {s.selection_process.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-fg-muted">
                  <span className="font-mono font-bold text-accent">{String(i + 1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {s.renewal_criteria && (
          <Section icon={Repeat} title="Keeping it">
            <ul className="space-y-1.5 text-sm text-fg-muted">
              {s.renewal_criteria.minimumCgpa != null && <li>Maintain CGPA ≥ <b className="text-fg">{s.renewal_criteria.minimumCgpa}</b></li>}
              {s.renewal_criteria.minimumAttendance != null && (
                <li>Attendance ≥ <b className="text-fg">{s.renewal_criteria.minimumAttendance}%</b></li>
              )}
              {s.renewal_criteria.notes && <li>{s.renewal_criteria.notes}</li>}
            </ul>
          </Section>
        )}

        {s.description && (
          <Section icon={Info} title="About">
            <p className="text-sm leading-relaxed text-fg-muted">{s.description}</p>
          </Section>
        )}
      </div>

      <a
        href={s.official_source_url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-[13px] text-fg-muted transition-colors hover:border-line-strong"
      >
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-mint" /> Verified source · refreshed {shortDate(s.last_scraped_at)}
        </span>
        <ArrowUpRight className="h-4 w-4" />
      </a>

      {/* Mobile sticky CTA (above the tab bar) */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          {s.aptitude_test_required && (
            <Link to={`/exams/${s.id}/take`} aria-label="Take mock test">
              <Button size="lg" variant="secondary" iconOnly>
                <GraduationCap className="h-5 w-5" />
              </Button>
            </Link>
          )}
          {application ? (
            <Button size="lg" className="flex-1" onClick={() => setSheetOpen(true)}>
              Continue · <StatusBadge status={application.status} />
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={onStart} loading={start.isPending} disabled={closed}>
              {closed ? 'Applications closed' : 'Start applying'}
            </Button>
          )}
        </div>
      </div>

      <ApplySheet open={sheetOpen} onClose={() => setSheetOpen(false)} scholarship={s} application={application} />
    </div>
  );
}
