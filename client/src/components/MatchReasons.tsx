import { Check, Minus, X } from 'lucide-react';
import type { MatchReason } from '@shared/types.ts';
import { cn } from './ui';

const STYLE = {
  pass: { icon: Check, cls: 'bg-sage text-sage-ink' },
  warn: { icon: Minus, cls: 'bg-butter text-butter-ink' },
  fail: { icon: X, cls: 'bg-rose text-rose-ink' },
};

export default function MatchReasons({ reasons, missing = [] }: { reasons: MatchReason[]; missing?: string[] }) {
  return (
    <ul className="space-y-3">
      {reasons.map((r, i) => {
        const { icon: Icon, cls } = STYLE[r.kind];
        return (
          <li key={i} className="flex items-start gap-3">
            <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', cls)}>
              <Icon className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <div className="text-[14.5px] font-medium leading-snug">{r.label}</div>
              {r.detail && <div className="mt-0.5 text-[12.5px] text-ink-3">{r.detail}</div>}
            </div>
          </li>
        );
      })}
      {missing.map((m) => (
        <li key={m} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-butter text-butter-ink">
            <Minus className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <div className="text-[14.5px] font-medium">Add your {m.toLowerCase()} to confirm</div>
        </li>
      ))}
    </ul>
  );
}
