import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { MatchReason } from '@shared/types.ts';
import { cn } from './ui';

const ICONS = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle };
const TONES = { pass: 'text-mint', warn: 'text-warn', fail: 'text-danger' };

export default function MatchReasons({ reasons, missing = [] }: { reasons: MatchReason[]; missing?: string[] }) {
  return (
    <ul className="space-y-2.5">
      {reasons.map((r, i) => {
        const Icon = ICONS[r.kind];
        return (
          <li key={i} className="flex items-start gap-3">
            <Icon className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', TONES[r.kind])} aria-hidden />
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.label}</div>
              {r.detail && <div className="text-[12px] text-fg-faint">{r.detail}</div>}
            </div>
          </li>
        );
      })}
      {missing.map((m) => (
        <li key={m} className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-warn" aria-hidden />
          <div className="text-sm font-medium">
            Add <span className="text-warn">{m}</span> to your passport to confirm
          </div>
        </li>
      ))}
    </ul>
  );
}
