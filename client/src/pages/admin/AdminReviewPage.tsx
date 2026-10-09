import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, RotateCcw, X } from 'lucide-react';
import type { PassportDocumentRow } from '@shared/types.ts';
import { useReviewDocument, useReviewQueue, type ReviewDocument } from '../../lib/queries';
import { relativeTime, shortDate } from '../../lib/format';
import { tick } from '../../lib/haptics';
import DocumentPreview from '../../components/DocumentPreview';
import { Avatar, Button, Empty, Field, ListSkeleton, Notice, PageTitle, Sheet, Surface, Tabs, Tag, Textarea, riseDelay } from '../../components/ui';

type Status = PassportDocumentRow['status'];

const QUICK_REASONS = ['Image is blurry or cut off', 'Wrong document type', 'Document has expired', 'Name does not match the account'];

export default function AdminReviewPage() {
  const [status, setStatus] = useState<Status>('pending_review');
  const queue = useReviewQueue(status);
  const review = useReviewDocument();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState('');

  const list = queue.data ?? [];
  const current = list.find((d) => d.id === openId) ?? null;

  useEffect(() => setNote(current?.review_note ?? ''), [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (d: ReviewDocument) => {
    setOpenId(d.id);
    setSheetOpen(true);
  };

  const decide = (next: Status) => {
    if (!current) return;
    if (next === 'rejected' && !note.trim()) {
      toast.error('Add a short reason so the student knows what to fix');
      return;
    }
    const idx = list.findIndex((d) => d.id === current.id);
    const following = list[idx + 1] ?? list[idx - 1] ?? null;
    review.mutate(
      { id: current.id, status: next, note: next === 'verified' ? note.trim() || undefined : note.trim() },
      {
        onSuccess: () => {
          tick(8);
          toast.success(next === 'verified' ? 'Verified' : next === 'rejected' ? 'Sent back to the student' : 'Moved back to the queue');
          // Pending queue: glide straight to the next document.
          if (status === 'pending_review' && following) setOpenId(following.id);
          else setSheetOpen(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div>
      <PageTitle kicker="Document verification" title="Review" sub="Check each upload against its type. Rejections need a reason — the student sees it on their passport." />

      <Tabs
        id="review"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'pending_review', label: 'Waiting', count: status === 'pending_review' ? list.length : undefined },
          { value: 'verified', label: 'Verified' },
          { value: 'rejected', label: 'Sent back' },
        ]}
      />

      <div className="mt-4">
        {queue.error && <Notice tone="rose">{(queue.error as Error).message}</Notice>}
        {queue.isLoading ? (
          <ListSkeleton rows={4} />
        ) : list.length === 0 ? (
          <Empty title={status === 'pending_review' ? 'All caught up' : 'Nothing here'} description={status === 'pending_review' ? 'New uploads land here the moment students add them.' : undefined} />
        ) : (
          <ul className="space-y-2.5">
            {list.map((d, i) => (
              <li key={d.id} style={riseDelay(i)} className="animate-rise">
                <button onClick={() => open(d)} className="press flex w-full items-center gap-4 rounded-4xl border border-line/70 bg-card p-4 text-left shadow-soft hover:shadow-lift">
                  <Avatar name={d.profile?.name || d.profile?.email} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{d.type}</div>
                    <div className="truncate text-[13px] text-ink-3">
                      {d.profile?.name || 'Unnamed'} · {d.profile?.email}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[12.5px] text-ink-3">
                    {status === 'pending_review' ? relativeTime(d.uploaded_at) : relativeTime(d.reviewed_at)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        open={sheetOpen && Boolean(current)}
        onClose={() => setSheetOpen(false)}
        wide
        title={current?.type ?? ''}
        subtitle={current ? `${current.profile?.name || 'Unnamed'} · uploaded ${shortDate(current.uploaded_at)}` : undefined}
        footer={
          current &&
          (current.status === 'pending_review' ? (
            <div className="flex gap-2">
              <Button variant="danger" size="lg" className="flex-1" onClick={() => decide('rejected')} loading={review.isPending && review.variables?.status === 'rejected'}>
                <X className="h-4 w-4" /> Send back
              </Button>
              <Button size="lg" className="flex-[1.4]" onClick={() => decide('verified')} loading={review.isPending && review.variables?.status === 'verified'}>
                <Check className="h-4 w-4" /> Verify
              </Button>
            </div>
          ) : (
            <Button variant="soft" size="lg" block onClick={() => decide('pending_review')} loading={review.isPending}>
              <RotateCcw className="h-4 w-4" /> Reopen for review
            </Button>
          ))
        }
      >
        {current && (
          <div className="space-y-5">
            <DocumentPreview doc={current} />

            <Surface className="divide-y divide-dashed divide-line p-0 text-[14px]">
              {[
                ['Student', `${current.profile?.name || 'Unnamed'}`],
                ['Email', current.profile?.email ?? '—'],
                ['Declared as', current.type],
                ['Status', current.status === 'pending_review' ? 'Waiting' : current.status === 'verified' ? 'Verified' : 'Sent back'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4 px-5 py-3">
                  <span className="w-28 shrink-0 text-ink-3">{k}</span>
                  <span className="min-w-0 truncate font-medium">{v}</span>
                </div>
              ))}
            </Surface>

            {current.status === 'pending_review' ? (
              <div>
                <Field label="Note to the student" hint="Required when sending back. Optional when verifying." htmlFor="review-note">
                  <Textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. The bottom half of the certificate is cut off." />
                </Field>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_REASONS.map((r) => (
                    <button key={r} type="button" onClick={() => setNote(r)} className="press rounded-full border border-line bg-card px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 shadow-soft hover:text-ink">
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              current.review_note && (
                <Notice tone={current.status === 'rejected' ? 'rose' : 'sage'}>
                  <b className="font-semibold">Note:</b> {current.review_note}
                </Notice>
              )
            )}
            {current.status !== 'pending_review' && <Tag>Reviewed {relativeTime(current.reviewed_at)}</Tag>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
