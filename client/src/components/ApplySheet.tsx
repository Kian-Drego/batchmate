import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowUpRight, Check, ChevronRight, PartyPopper, Send } from 'lucide-react';
import type { ApplicationStatus } from '../lib/constants';
import type { ScholarshipRow } from '@shared/types.ts';
import {
  useSetChecklistItem,
  useSubmitApplication,
  useUpdateStatus,
  type ApplicationWithScholarship,
} from '../lib/queries';
import { tick } from '../lib/haptics';
import { relativeTime } from '../lib/format';
import { Alert, Button, Progress, Sheet, StatusBadge, cn } from './ui';

const PIPELINE: ApplicationStatus[] = ['Not Started', 'In Progress', 'Submitted', 'Verification Pending', 'Awarded'];

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

  const advance = (status: ApplicationStatus) =>
    updateStatus.mutate(
      { applicationId: application.id, status },
      {
        onSuccess: () => {
          tick(status === 'Awarded' ? [10, 40, 10] : 10);
          if (status === 'Awarded') toast.success('Congratulations! 🎉 Scholarship awarded');
          else toast.success(`Marked as ${status.toLowerCase()}`);
        },
        onError: (e) => toast.error(e.message),
      }
    );

  const nativeSubmit = () => {
    setBlockers(null);
    submit.mutate(application.id, {
      onSuccess: () => {
        tick([10, 40, 10]);
        toast.success('Application submitted 🚀');
      },
      onError: (e) => {
        setBlockers((e as Error & { details?: typeof blockers }).details ?? null);
        toast.error(e.message);
      },
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={scholarship.title}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <StatusBadge status={application.status} /> updated {relativeTime(application.updated_at)}
        </span>
      }
      footer={
        <div className="space-y-2">
          {application.mode === 'native' && ['Not Started', 'In Progress'].includes(application.status) && (
            <Button block size="lg" onClick={nativeSubmit} loading={submit.isPending}>
              <Send className="h-4 w-4" /> Submit application
            </Button>
          )}
          {application.mode === 'external' && application.status === 'In Progress' && (
            <Button block size="lg" onClick={() => advance('Submitted')} loading={updateStatus.isPending}>
              <Check className="h-4 w-4" /> I&apos;ve submitted on the portal
            </Button>
          )}
          {application.mode === 'external' && application.status === 'Not Started' && (
            <a href={portal} target="_blank" rel="noreferrer" className="block">
              <Button block size="lg">
                Open official portal <ArrowUpRight className="h-4 w-4" />
              </Button>
            </a>
          )}
          {application.status === 'Submitted' && (
            <Button block size="lg" variant="secondary" onClick={() => advance('Verification Pending')} loading={updateStatus.isPending}>
              Mark verification pending
            </Button>
          )}
          {application.status === 'Verification Pending' && (
            <div className="flex gap-2">
              <Button variant="mint" size="lg" className="flex-1" onClick={() => advance('Awarded')} loading={updateStatus.isPending}>
                <PartyPopper className="h-4 w-4" /> Awarded
              </Button>
              <Button variant="danger" size="lg" className="flex-1" onClick={() => advance('Rejected')} disabled={updateStatus.isPending}>
                Rejected
              </Button>
            </div>
          )}
          {['Awarded', 'Rejected'].includes(application.status) && (
            <p className="py-2 text-center text-sm text-fg-muted">
              {application.status === 'Awarded' ? 'Well earned. Your documents stay safe for 6 months.' : 'On to the next one — your documents stay safe for 6 months.'}
            </p>
          )}
        </div>
      }
    >
      {/* Pipeline */}
      <ol className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {PIPELINE.map((s, i) => (
          <li
            key={s}
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold',
              i < stage && 'border-mint/30 bg-mint-soft text-mint',
              i === stage && 'border-accent/40 bg-accent-soft text-accent shadow-glow-sm',
              i > stage && 'border-line text-fg-faint'
            )}
          >
            {i < stage && <Check className="h-3.5 w-3.5" />}
            {s}
          </li>
        ))}
      </ol>

      {blockers && (
        <div className="mt-4">
          <Alert tone="warn">
            <div className="font-semibold">Almost there. Finish these first:</div>
            <ul className="mt-1 list-inside list-disc">
              {blockers.missingProfileFields?.map((f) => <li key={f}>{f} in your passport</li>)}
              {blockers.missingDocuments?.map((d) => <li key={d}>Upload {d}</li>)}
            </ul>
            <Link to="/passport" className="mt-2 inline-block font-bold underline underline-offset-2">
              Go to passport
            </Link>
          </Alert>
        </div>
      )}

      {/* Checklist */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Checklist</h3>
          <span className="font-mono text-[13px] tabular-nums text-fg-muted">
            {done}/{total}
          </span>
        </div>
        <Progress value={pct} tone={pct === 100 ? 'mint' : 'accent'} />
        <ul className="mt-3 space-y-1.5">
          {application.checklist.map((item) => {
            const busy = setItem.isPending && setItem.variables?.itemId === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    tick(6);
                    setItem.mutate(
                      { applicationId: application.id, itemId: item.id, done: !item.done },
                      { onError: (e) => toast.error(e.message) }
                    );
                  }}
                  disabled={busy}
                  className="tap flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-left transition-colors hover:border-line-strong disabled:opacity-60"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors duration-200',
                      item.done ? 'border-mint bg-mint text-[#04140e]' : 'border-line-strong'
                    )}
                  >
                    {item.done && (
                      <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }}>
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </m.span>
                    )}
                  </span>
                  <span className={cn('text-sm font-medium transition-colors', item.done && 'text-fg-faint line-through')}>{item.label}</span>
                  {item.documentType && !item.done && (
                    <Link
                      to="/passport#documents"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto shrink-0 text-[12px] font-semibold text-accent"
                    >
                      Upload
                    </Link>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Portal steps */}
      {application.mode === 'external' && (
        <div className="mt-6">
          <h3 className="mb-2 text-[15px] font-bold">On the official portal</h3>
          <ol className="space-y-2">
            {scholarship.application_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-fg-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono text-[12px] font-bold text-fg">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={portal}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm transition-colors hover:border-accent/40"
          >
            <span className="min-w-0">
              <span className="block font-semibold">{scholarship.provider}</span>
              <span className="block truncate text-[12px] text-fg-faint">{portal}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-fg-faint" />
          </a>
        </div>
      )}
    </Sheet>
  );
}
