import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { MatchTier } from '@shared/constants.ts';
import type { ScholarshipRow } from '@shared/types.ts';
import { deadlineLabel, inr } from '../lib/format';
import { Dial, Tag, TierTag, cn, tint, typeTone, riseDelay } from './ui';

export function fitColor(score: number): string {
  return score >= 80 ? 'rgb(var(--sage-ink))' : score >= 55 ? 'rgb(var(--ink))' : 'rgb(var(--butter-ink))';
}

/** Full-width list card. */
export default function ScholarshipCard({ scholarship: s, tier, fitScore, index = 0 }: { scholarship: ScholarshipRow; tier?: MatchTier; fitScore?: number; index?: number }) {
  const dl = deadlineLabel(s.deadline);
  const tone = typeTone(s.type);
  return (
    <Link
      to={`/scholarships/${s.id}`}
      style={riseDelay(index)}
      className="press group block animate-rise rounded-4xl border border-line/70 bg-card p-5 shadow-soft hover:shadow-lift"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag tone={tone}>{s.type}</Tag>
            {tier && <TierTag tier={tier} />}
          </div>
          <h3 className="mt-3 line-clamp-2 text-[19px] font-semibold leading-snug">{s.title}</h3>
          <p className="mt-1 truncate text-[13.5px] text-ink-3">{s.provider}</p>
        </div>
        {fitScore !== undefined && (
          <Dial value={fitScore} size={58} stroke={5} color={fitColor(fitScore)}>
            <span className="num text-[16px] font-semibold">{fitScore}</span>
          </Dial>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-dashed border-line pt-3.5">
        <div>
          <div className="num text-[22px] font-semibold leading-none">{inr(s.amount)}</div>
          <div className="mt-1 text-[12px] text-ink-3">award</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-[13px] font-semibold', dl.tone === 'urgent' ? 'text-accent' : dl.tone === 'closed' ? 'text-rose-ink' : 'text-ink-2')}>{dl.text}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-ink-2 transition-transform duration-300 ease-spring group-hover:rotate-45">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Compact pastel card for horizontal shelves. */
export function ScholarshipTile({ scholarship: s, fitScore }: { scholarship: ScholarshipRow; fitScore?: number }) {
  const dl = deadlineLabel(s.deadline);
  return (
    <Link
      to={`/scholarships/${s.id}`}
      className={cn('press grainy flex h-full min-h-[184px] flex-col rounded-4xl p-5 shadow-soft hover:shadow-lift', tint(typeTone(s.type)))}
    >
      <div className="flex items-center justify-between text-[12.5px] font-semibold opacity-80">
        <span>{s.type}</span>
        <span>{dl.text}</span>
      </div>
      <h3 className="mt-auto line-clamp-3 pt-6 text-[20px] font-semibold leading-tight">{s.title}</h3>
      <div className="mt-3 flex items-end justify-between">
        <span className="num text-[18px] font-semibold">{inr(s.amount)}</span>
        {fitScore !== undefined && <span className="rounded-full bg-black/[0.07] px-2.5 py-1 text-[12px] font-bold dark:bg-white/10">{fitScore}% fit</span>}
      </div>
    </Link>
  );
}
