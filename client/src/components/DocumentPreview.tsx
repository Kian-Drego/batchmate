import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, FileText } from 'lucide-react';
import type { PassportDocumentRow } from '@shared/types.ts';
import { signedUrl } from '../lib/queries';
import { bytes } from '../lib/format';
import { Skeleton } from './ui';

/** Inline preview of a private document via a short-lived signed URL. */
export default function DocumentPreview({ doc }: { doc: Pick<PassportDocumentRow, 'storage_key' | 'mime_type' | 'file_name' | 'size_bytes'> }) {
  const { data: url, isLoading, error } = useQuery({
    queryKey: ['signed-url', doc.storage_key],
    queryFn: () => signedUrl(doc.storage_key),
    staleTime: 4 * 60 * 1000,
  });

  const isImage = doc.mime_type.startsWith('image/') && doc.mime_type !== 'image/heic';
  const isPdf = doc.mime_type === 'application/pdf';
  // Android Chrome and some WebViews cannot render PDFs inline.
  const inlinePdf = isPdf && (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled === true;

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-sunken shadow-well">
        {isLoading ? (
          <Skeleton className="h-[360px] rounded-none" />
        ) : error || !url ? (
          <div className="flex h-[200px] items-center justify-center text-[14px] text-rose-ink">Couldn&apos;t load this file.</div>
        ) : isImage ? (
          <img src={url} alt={doc.file_name} className="max-h-[60dvh] w-full object-contain" />
        ) : inlinePdf ? (
          <object data={url} type="application/pdf" className="h-[60dvh] w-full" />
        ) : isPdf ? (
          <a href={url} target="_blank" rel="noreferrer" className="press flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-ink shadow-soft">
              <FileText className="h-6 w-6" />
            </span>
            <span className="font-display text-[18px] font-semibold">Open PDF</span>
            <span className="text-[13px] text-ink-3">Opens in a new tab · link valid for 5 minutes</span>
          </a>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-ink-2">
            <FileText className="h-8 w-8" />
            <span className="text-[14px]">No inline preview for this file type.</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[12.5px] text-ink-3">
        <span className="truncate">
          {doc.file_name} · {bytes(doc.size_bytes)}
        </span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink-2 hover:text-ink">
            Open <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
