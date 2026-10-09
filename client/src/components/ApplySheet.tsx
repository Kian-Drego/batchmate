import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowUpRight, Check } from 'lucide-react';
import type { ApplicationStatus } from '../lib/constants';
import type { ScholarshipRow } from '@shared/types.ts';
import { useSetChecklistItem, useSubmitApplication, useUpdateStatus, type ApplicationWithScholarship } from '../lib/queries';
import { tick } from '../lib/haptics';
import { relativeTime } from '../lib/format';
import { Button, Meter, Notice, Sheet, StatusTag, cn } from './ui';

const PIPELINE: ApplicationStatus[] = ['Not Started', 'In Progress', 'Submitted', 'Verification Pending', 'Awarded'];
const SHORT: Record<string, string> = {
  'Not Started': 'Start',
  'In Progress': 'Prep',
  Submitted: 'Sent',
  'Verification Pending': 'Review',
  Awarded: 'Won',
};

export default function ApplySheet({
  open,
  onClose,
  scholarship,
  application,
}: {
  open: boolean;
  onClose: () => void;
  scholarship: ScholarshipRow;
  application: ApplicationWithScholarship | undefined;
}) {
  const setItem = useSetChecklistItem();
  const updateStatus = useUpdateStatus();
  const submit = useSubmitApplication();
  const [blockers, setBlockers] = useState<{ missingProfileFields?: string[]; missingDocuments?: string[] } | null>(null);

  if (!application) return null;
  const done = application.checklist.filter((c) => c.done).length;
  const total = application.checklist.length;
  const pct = total ? (done / total) * 100 : 0;
  const stage = application.status === 'Rejected' ? -1 : PIPELINE.indexOf(application.status);
  const portal = scholarship.external_portal_url ?? scholarship.official_source_url;
  const lastNote = [...application.history].reverse().find((h) => h.note && (h as { by?: string }).by === 'admin');

  const advance = (status: ApplicationStatus) =>
    updateStatus.mutate(
      { applicationId: application.id, status },
      {
        onSuccess: () => {
          tick(10);
          toast.success(status === 'Submitted' ? 'Marked as submitted' : `Moved to ${status.toLowerCase()}`);
        },
        onError: (e) => toast.error(e.message),
      }
    );

  const nativeSubmit = () => {
    setBlockers(null);
    submit.mutate(application.id, {
      onSuccess: () => {
        tick([10, 40, 10]);
        toast.success('Application sent');
      },
      onError: (e) => {
        setBlockers((e as Error & { details?: typeof blockers }).details ?? null);
        toast.error(e.message);
      },
    });
  };

  const canStudentAdvance = application.mode === 'external';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={scholarship.title}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <StatusTag status={application.status} /> updated {relativeTime(application.updated_at)}
        </span>
      }
      footer={
        <div className="space-y-2">
          {application.mode === 'native' && ['Not Started', 'In Progress'].includes(application.status) && (
            <Button block size="lg" onClick={nativeSubmit} loading={submit.isPending}>
              Send application
            </Button>
          )}
          {canStudentAdvance && application.status === 'Not Started' && (
            <a href={portal} target="_blank" rel="noreferrer" className="block">
              <Button block size="lg">
                Open the official portal <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>
          )}
          {canStudentAdvance && application.status === 'In Progress' && (
            <Button block size="lg" onClick={() => advance('Submitted')} loading={updateStatus.isPending}>
              I&apos;ve submitted on the portal
            </Button>
          )}
          {canStudentAdvance && application.status === 'Submitted' && (
            <Button block size="lg" variant="soft" onClick={() => advance('Verification Pending')} loading={updateStatus.isPending}>
              The provider is reviewing it
            </Button>
          )}
          {canStudentAdvance && application.status === 'Verification Pending' && (
            <div className="flex gap-2">
              <Button size="lg" className="flex-1" onClick={() => advance('Awarded')} loading={updateStatus.isPending}>
                I won it
              </Button>
              <Button variant="danger" size="lg" className="flex-1" onClick={() => advance('Rejected')} disabled={updateStatus.isPending}>
                Not this time
              </Button>
            </div>
          )}
          {!canStudentAdvance && ['Submitted', 'Verification Pending'].includes(application.status) && (
            <p className="py-1 text-center text-[14px] text-ink-2">Sent. Our team reviews native applications — you&apos;ll see the decision here.</p>
          )}
          {['Awarded', 'Rejected'].includes(application.status) && (
            <p className="py-1 text-center text-[14px] text-ink-2">
              {application.status === 'Awarded' ? 'Congratulations — well earned.' : 'On to the next one.'} Your documents stay safe for 6 months.
            </p>
          )}
        </div>
      }
    >
      {/* Pipeline as a row of stepping stones */}
      <ol className="grid grid-cols-5 gap-1.5">
        {PIPELINE.map((s, i) => (
          <li key={s} className="text-center">
            <div className={cn('h-2 rounded-full transition-colors duration-500', i <= stage ? 'bg-primary' : 'bg-sunken shadow-well', application.status === 'Rejected' && 'bg-rose')} />
            <div className={cn('mt-1.5 text-[11.5px] font-semibold', i === stage ? 'text-ink' : 'text-ink-3')}>{SHORT[s]}</div>
          </li>
        ))}
      </ol>

      {lastNote && (
        <Notice tone={application.status === 'Rejected' ? 'rose' : 'sage'} className="mt-4">
          <b className="font-semibold">Note from the BatchMate team:</b> {lastNote.note}
        </Notice>
      )}

      {blockers && (
        <Notice tone="butter" className="mt-4">
          <div className="font-semibold">Almost there. First:</div>
          <ul className="mt-1 list-inside list-disc">
            {blockers.missingProfileFields?.map((f) => <li key={f}>add your {f.toLowerCase()}</li>)}
            {blockers.missingDocuments?.map((d) => <li key={d}>upload your {d}</li>)}
          </ul>
          <Link to="/passport" className="mt-2 inline-block font-semibold underline underline-offset-4">
            Open passport
          </Link>
        </Notice>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[18px] font-semibold">Checklist</h3>
          <span className="num text-[14px] text-ink-3">
            {done} of {total}
          </span>
        </div>
        <Meter value={pct} tone={pct === 100 ? 'sage' : 'ink'} />
        <ul className="mt-4 space-y-2">
          {application.checklist.map((item) => {
            const busy = setItem.isPending && setItem.variables?.itemId === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    tick(6);
                    setItem.mutate({ applicationId: application.id, itemId: item.id, done: !item.done }, { onError: (e) => toast.error(e.message) });
                  }}
                  disabled={busy}
                  className="press flex min-h-[56px] w-full items-center gap-3 rounded-3xl bg-sunken px-4 py-3 text-left shadow-well disabled:opacity-60"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-spring',
                      item.done ? 'bg-primary text-primary-fg shadow-key' : 'border-2 border-line bg-card'
                    )}
                  >
                    {item.done && (
                      <m.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </m.span>
                    )}
                  </span>
                  <span className={cn('text-[14.5px] font-medium transition-colors', item.done && 'text-ink-3 line-through decoration-ink-3/50')}>{item.label}</span>
                  {item.documentType && !item.done && (
                    <Link to="/passport#documents" onClick={(e) => e.stopPropagation()} className="ml-auto shrink-0 text-[13px] font-semibold text-accent">
                      Upload
                    </Link>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {application.mode === 'external' && scholarship.application_steps.length > 0 && (
        <div className="mt-7">
          <h3 className="mb-3 text-[18px] font-semibold">On the official portal</h3>
          <ol className="space-y-3">
            {scholarship.application_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[14.5px] text-ink-2">
                <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken text-[13px] font-semibold text-ink">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={portal}
            target="_blank"
            rel="noreferrer"
            className="press mt-4 flex items-center justify-between gap-3 rounded-3xl border border-line bg-card px-4 py-3.5 shadow-soft"
          >
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold">{scholarship.provider}</span>
              <span className="block truncate text-[12.5px] text-ink-3">{portal}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3" />
          </a>
        </div>
      )}
    </Sheet>
  );
}
