import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUpRight, Check, GraduationCap, Share } from 'lucide-react';
import { evaluateScholarship } from '@shared/matching.ts';
import { useApplications, useDocuments, usePassport, useScholarship, useStartApplication } from '../lib/queries';
import { tick } from '../lib/haptics';
import { deadlineLabel, inr, shortDate } from '../lib/format';
import MatchReasons from '../components/MatchReasons';
import ApplySheet from '../components/ApplySheet';
import { fitColor } from '../components/ScholarshipCard';
import { Button, Dial, Empty, IconButton, Skeleton, Surface, Tag, TierTag, cn, tint, typeTone } from '../components/ui';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Surface className="p-6">
      <h2 className="mb-4 text-[19px] font-semibold">{title}</h2>
      {children}
    </Surface>
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
  const match = useMemo(() => (s && passport.data ? evaluateScholarship(s, passport.data, documents.data ?? []) : null), [s, passport.data, documents.data]);
  const owned = new Set((documents.data ?? []).map((d) => d.type));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-72 rounded-5xl" />
        <Skeleton className="h-44 rounded-4xl" />
      </div>
    );
  }
  if (!s) return <Empty title="Scholarship unavailable" description={(error as Error)?.message ?? 'It may have been removed.'} />;

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
      /* cancelled */
    }
  };

  const criteria: [string, string][] = [
    ['Degree', s.degree.join(', ') || 'Any'],
    ['Year', s.current_year_allowed.join(', ') || 'Any'],
    ['Category', s.category.join(', ') || 'Any'],
    ['Domicile', s.state_domicile.join(', ') || 'Any'],
    ['Gender', s.gender.join(', ') || 'Any'],
    ['Income limit', s.income_limit ? inr(s.income_limit) : 'No limit'],
    ['Minimum marks', s.marks_min ? `${s.marks_min}%` : 'None'],
  ];

  const cta = application ? (
    <Button size="lg" className="flex-1" onClick={() => setSheetOpen(true)}>
      Continue · {application.status}
    </Button>
  ) : (
    <Button size="lg" className="flex-1" onClick={onStart} loading={start.isPending} disabled={closed}>
      {closed ? 'Applications closed' : 'Start applying'}
    </Button>
  );

  return (
    <div className="pb-4 lg:pb-0">
      <div className="mb-4 flex items-center justify-between">
        <IconButton label="Back" onClick={() => navigate(-1)} className="border border-line bg-card shadow-soft">
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <IconButton label="Share" onClick={share} className="border border-line bg-card shadow-soft">
          <Share className="h-[18px] w-[18px]" />
        </IconButton>
      </div>

      {/* Hero, tinted by scholarship type */}
      <div className={cn('grainy relative overflow-hidden rounded-5xl p-6 shadow-soft sm:p-9', tint(typeTone(s.type)))}>
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
          <span className="opacity-80">{s.type}</span>
          <span className="opacity-40">/</span>
          <span className="opacity-80">{s.provider}</span>
        </div>
        <h1 className="mt-4 max-w-2xl text-[32px] font-semibold leading-[1.04] sm:text-[46px]">{s.title}</h1>

        <div className="mt-7 grid grid-cols-2 gap-4 sm:flex sm:items-end sm:gap-10">
          <div>
            <div className="text-[12.5px] font-semibold opacity-70">Award</div>
            <div className="num text-[34px] font-semibold leading-none">{inr(s.amount)}</div>
          </div>
          <div>
            <div className="text-[12.5px] font-semibold opacity-70">Deadline</div>
            <div className="num text-[22px] font-semibold leading-tight">{dl.text}</div>
            <div className="text-[12.5px] opacity-70">{shortDate(s.deadline)}</div>
          </div>
          {match && (
            <div className="col-span-2 flex items-center gap-3 rounded-full bg-white/55 p-1.5 pr-4 dark:bg-black/20 sm:col-span-1">
              <Dial value={match.fitScore} size={50} stroke={5} color={fitColor(match.fitScore)} track="rgb(var(--ink) / 0.08)">
                <span className="num text-[14px] font-semibold text-ink">{match.fitScore}</span>
              </Dial>
              <div className="text-ink">
                <div className="text-[13px] font-semibold">{match.hardMatch ? 'Your fit' : 'Not eligible'}</div>
                {match.hardMatch ? <TierTag tier={match.tier} /> : <span className="text-[12.5px] text-ink-2">See below</span>}
              </div>
            </div>
          )}
        </div>
        {s.amount_description && <p className="mt-6 max-w-xl text-[14.5px] leading-relaxed opacity-85">{s.amount_description}</p>}
      </div>

      <div className="mt-4 hidden gap-2 lg:flex">
        <div className="flex w-[360px]">{cta}</div>
        {s.aptitude_test_required && (
          <Link to={`/exams/${s.id}/take`}>
            <Button size="lg" variant="soft">
              <GraduationCap className="h-4 w-4" /> Practise the test
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
        {match && (
          <Block title="Why you match">
            <MatchReasons reasons={match.reasons} missing={match.missingFields} />
          </Block>
        )}

        <Block title="Who can apply">
          <dl className="divide-y divide-dashed divide-line">
            {criteria.map(([k, v]) => (
              <div key={k} className="flex gap-4 py-3 text-[14.5px]">
                <dt className="w-32 shrink-0 text-ink-3">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block title="Documents">
          <ul className="space-y-2">
            {s.required_documents.map((d) => (
              <li key={d} className="flex items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-3 shadow-well">
                <span className="text-[14.5px] font-medium">{d}</span>
                {owned.has(d) ? (
                  <Tag tone="sage">
                    <Check className="h-3.5 w-3.5" /> Uploaded
                  </Tag>
                ) : (
                  <Link to="/passport#documents" className="text-[13px] font-semibold text-accent">
                    Upload
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Block>

        {s.selection_process.length > 0 && (
          <Block title="How selection works">
            <ol className="space-y-3">
              {s.selection_process.map((step, i) => (
                <li key={i} className="flex gap-3 text-[14.5px]">
                  <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken text-[13px] font-semibold">{i + 1}</span>
                  <span className="pt-0.5 text-ink-2">{step}</span>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {s.renewal_criteria && (
          <Block title="Keeping it">
            <ul className="space-y-2 text-[14.5px] text-ink-2">
              {s.renewal_criteria.minimumCgpa != null && (
                <li>
                  Maintain a CGPA of at least <b className="text-ink">{s.renewal_criteria.minimumCgpa}</b>
                </li>
              )}
              {s.renewal_criteria.minimumAttendance != null && (
                <li>
                  Attendance of at least <b className="text-ink">{s.renewal_criteria.minimumAttendance}%</b>
                </li>
              )}
              {s.renewal_criteria.notes && <li>{s.renewal_criteria.notes}</li>}
            </ul>
          </Block>
        )}

        {s.description && (
          <Block title="About">
            <p className="text-[14.5px] leading-relaxed text-ink-2">{s.description}</p>
          </Block>
        )}
      </div>

      <a
        href={s.official_source_url}
        target="_blank"
        rel="noreferrer"
        className="press mt-3 flex items-center justify-between gap-3 rounded-full border border-line bg-card px-5 py-3.5 text-[13.5px] text-ink-2 shadow-soft"
      >
        <span>Official source · checked {shortDate(s.last_scraped_at)}</span>
        <ArrowUpRight className="h-4 w-4" />
      </a>

      {/* Mobile action bar (the dock is hidden on detail screens) */}
      <div className="fixed inset-x-0 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 px-4 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2 rounded-full border border-line/70 bg-card p-1.5 shadow-lift">
          {s.aptitude_test_required && (
            <Link to={`/exams/${s.id}/take`} aria-label="Practise the test">
              <Button size="lg" variant="soft" iconOnly className="shadow-none">
                <GraduationCap className="h-5 w-5" />
              </Button>
            </Link>
          )}
          {cta}
        </div>
      </div>

      <ApplySheet open={sheetOpen} onClose={() => setSheetOpen(false)} scholarship={s} application={application} />
    </div>
  );
}
