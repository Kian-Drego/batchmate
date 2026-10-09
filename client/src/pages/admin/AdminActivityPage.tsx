import { useAudit, type AuditWithActor } from '../../lib/queries';
import { relativeTime, shortDate } from '../../lib/format';
import { Empty, ListSkeleton, Notice, PageTitle, Surface, Tag, type Tone } from '../../components/ui';

const ACTIONS: Record<string, { text: string; tone: Tone }> = {
  'document.verified': { text: 'verified a document', tone: 'sage' },
  'document.rejected': { text: 'sent back a document', tone: 'rose' },
  'document.pending_review': { text: 'reopened a document', tone: 'neutral' },
  'application.verification_pending': { text: 'moved an application to review', tone: 'butter' },
  'application.awarded': { text: 'awarded an application', tone: 'sage' },
  'application.rejected': { text: 'declined an application', tone: 'rose' },
  'user.role_admin': { text: 'made someone an admin', tone: 'lilac' },
  'user.role_student': { text: 'removed admin access', tone: 'neutral' },
  'scholarship.insert': { text: 'added a scholarship', tone: 'sky' },
  'scholarship.update': { text: 'edited a scholarship', tone: 'sky' },
  'scholarship.delete': { text: 'deleted a scholarship', tone: 'rose' },
};

export function describeAction(a: AuditWithActor): string {
  const base = ACTIONS[a.action]?.text ?? a.action;
  const d = a.details as Record<string, string | null>;
  if (a.target_type === 'document' && d.type) return `${base} — ${d.type}`;
  if (a.target_type === 'scholarship' && d.title) return `${base} — ${d.title}`;
  if (a.target_type === 'user' && d.email) return `${base} — ${d.email}`;
  return base;
}

export default function AdminActivityPage() {
  const { data, isLoading, error } = useAudit();

  return (
    <div>
      <PageTitle kicker="Every admin action, newest first" title="Activity" />
      {error && <Notice tone="rose">{(error as Error).message}</Notice>}
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !data?.length ? (
        <Empty title="No activity yet" description="Reviews, decisions, role changes and catalogue edits are logged here." />
      ) : (
        <Surface className="divide-y divide-dashed divide-line overflow-hidden">
          {data.map((a) => {
            const meta = ACTIONS[a.action];
            const note = (a.details as { note?: string | null }).note;
            return (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-[14.5px]">
                    <span className="font-semibold">{a.actor?.name || a.actor?.email || 'Someone'}</span> <span className="text-ink-2">{describeAction(a)}</span>
                  </div>
                  <Tag tone={meta?.tone ?? 'neutral'} className="shrink-0">
                    {a.target_type}
                  </Tag>
                </div>
                {note && <p className="mt-1.5 text-[13.5px] italic text-ink-2">“{note}”</p>}
                <div className="mt-1 text-[12.5px] text-ink-3" title={shortDate(a.created_at)}>
                  {relativeTime(a.created_at)}
                </div>
              </div>
            );
          })}
        </Surface>
      )}
    </div>
  );
}
