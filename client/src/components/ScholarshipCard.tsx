import { Link } from 'react-router-dom';
import { ChevronRight, GraduationCap } from 'lucide-react';
import type { MatchTier } from '@shared/constants.ts';
import type { ScholarshipRow } from '@shared/types.ts';
import { deadlineLabel, inr } from '../lib/format';
import { Badge, Ring, TierBadge, cn } from './ui';

const DEADLINE_TONE = { calm: 'neutral', soon: 'warn', urgent: 'hot', closed: 'danger' } as const;
const SCORE_TEXT = { mint: 'text-mint', accent: 'text-accent', warn: 'text-warn' } as const;

export function scoreTone(score: number): 'mint' | 'accent' | 'warn' {
  return score >= 80 ? 'mint' : score >= 55 ? 'accent' : 'warn';
}

export default function ScholarshipCard({
  scholarship: s,
  tier,
  fitScore,
  compact,
}: {
  scholarship: ScholarshipRow;
  tier?: MatchTier;
  fitScore?: number;
  compact?: boolean;
}) {
  const dl = deadlineLabel(s.deadline);
  return (
    <Link
      to={`/scholarships/${s.id}`}
      className={cn(
        'tap card group flex items-center gap-4 p-4 transition-[border-color,box-shadow] duration-200 hover:border-accent/40 hover:shadow-glow-sm',
        compact && 'h-full flex-col items-start'
      )}
    >
      {fitScore !== undefined && !compact && (
        <Ring value={fitScore} size={56} stroke={5} tone={scoreTone(fitScore)}>
          <span className="font-mono text-[15px] font-bold tabular-nums">{fitScore}</span>
        </Ring>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {tier && <TierBadge tier={tier} />}
          <Badge tone={DEADLINE_TONE[dl.tone]}>{dl.text}</Badge>
          {s.aptitude_test_required && (
            <Badge tone="accent">
              <GraduationCap className="h-3 w-3" /> Test
            </Badge>
          )}
        </div>
        <h3 className={cn('mt-2 font-bold leading-snug', compact ? 'line-clamp-2 text-[15px]' : 'line-clamp-2 text-[15px] sm:text-base')}>
          {s.title}
        </h3>
        <p className="mt-0.5 truncate text-[13px] text-fg-muted">{s.provider}</p>
      </div>
      <div className={cn('shrink-0 text-right', compact && 'mt-auto flex w-full items-end justify-between pt-3 text-left')}>
        <div>
          <div className="font-mono text-base font-bold tabular-nums text-fg">{inr(s.amount)}</div>
          <div className="text-[11px] font-medium text-fg-faint">award</div>
        </div>
        {compact && fitScore !== undefined ? (
          <div className="text-right">
            <div className={cn('font-mono text-base font-bold tabular-nums', SCORE_TEXT[scoreTone(fitScore)])}>{fitScore}%</div>
            <div className="text-[11px] font-medium text-fg-faint">fit</div>
          </div>
        ) : (
          !compact && <ChevronRight className="ml-auto mt-1 h-4 w-4 text-fg-faint transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </Link>
  );
}
