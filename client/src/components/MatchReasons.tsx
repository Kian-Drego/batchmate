import { AlertTriangle, Check } from 'lucide-react';
import type { MatchReason } from '../lib/types';

/**
 * Transparent match-reason breakdown. Each line states exactly why a
 * scholarship matched, or what is still required.
 */
export function MatchReasonList({ reasons }: { reasons: MatchReason[] }) {
  return (
    <ul className="space-y-1.5">
      {reasons.map((reason, i) => {
        const isWarn = reason.kind === 'warn';
        const isFail = reason.kind === 'fail';
        const Icon = isWarn || isFail ? AlertTriangle : Check;
        const color = isFail ? 'text-stop' : isWarn ? 'text-caution' : 'text-eligible';
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
            <span className="text-ink-soft">
              {reason.label}
              {reason.detail && (
                <span className="ml-1 text-ink-faint">· {reason.detail}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
