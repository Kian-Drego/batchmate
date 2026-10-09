import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Info, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex min-h-[2.5rem] items-center justify-center gap-2 font-semibold rounded-card border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  const variants: Record<string, string> = {
    primary: 'bg-inverse text-inverse-fg border-line hover:opacity-90',
    secondary: 'bg-paper-raised text-ink border-line hover:bg-paper-sunken',
    ghost: 'bg-transparent text-ink border-transparent hover:bg-paper-sunken',
    danger: 'bg-stop text-paper border-stop hover:opacity-90',
  };
  return (
    <button
      className={`${base} ${sizes} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'eligible' | 'caution' | 'stop' | 'lavender';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-paper-sunken text-ink border-line-faint',
    eligible: 'bg-eligible-soft text-eligible border-eligible/30',
    caution: 'bg-caution-soft text-caution border-caution/30',
    stop: 'bg-stop-soft text-stop border-stop/30',
    lavender: 'bg-lavender-soft text-lavender-ink border-lavender/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  if (tier === 'Highly Eligible') return <Badge tone="eligible">Highly eligible</Badge>;
  if (tier === 'Possibly Eligible') return <Badge tone="caution">Possibly eligible</Badge>;
  return <Badge tone="neutral">Needs info</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'Awarded'
      ? 'eligible'
      : status === 'Rejected'
        ? 'stop'
        : status === 'Submitted' || status === 'Verification Pending'
          ? 'lavender'
          : 'neutral';
  return <Badge tone={tone as never}>{status}</Badge>;
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------
export function Panel({
  children,
  className = '',
  flat,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  flat?: boolean;
  as?: React.ElementType;
}) {
  return <Tag className={`${flat ? 'panel-flat' : 'panel'} ${className}`}>{children}</Tag>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow && <div className="label-eyebrow mb-1">{eyebrow}</div>}
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
export function Progress({
  value,
  tone = 'lavender',
  label,
}: {
  value: number;
  tone?: 'lavender' | 'eligible' | 'caution';
  label?: string;
}) {
  const colors: Record<string, string> = {
    lavender: 'bg-lavender',
    eligible: 'bg-eligible',
    caution: 'bg-caution',
  };
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-ink-soft">
          <span>{label}</span>
          <span className="data-value">{Math.round(value)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-pill border border-line-faint bg-paper-sunken"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className={`h-full ${colors[tone]}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Select({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`input ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function TextInput({ className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />;
}

// ---------------------------------------------------------------------------
// Feedback helpers
// ---------------------------------------------------------------------------
export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'danger' | 'success';
  children: React.ReactNode;
}) {
  const map = {
    info: { cls: 'border-lavender/30 bg-lavender-soft text-lavender-ink', Icon: Info },
    warn: { cls: 'border-caution/30 bg-caution-soft text-caution', Icon: AlertTriangle },
    danger: { cls: 'border-stop/30 bg-stop-soft text-stop', Icon: AlertTriangle },
    success: { cls: 'border-eligible/30 bg-eligible-soft text-eligible', Icon: Check },
  } as const;
  const { cls, Icon } = map[tone];
  return (
    <div className={`flex items-start gap-2 rounded-card border px-3 py-2.5 text-sm ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel flat className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-card border border-line-faint bg-paper-sunken">
        <Icon className="h-5 w-5 text-ink-soft" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Panel>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-ink-faint ${className}`} aria-hidden />;
}

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: 'default' | 'eligible' | 'caution';
}) {
  const valueColor =
    tone === 'eligible' ? 'text-eligible' : tone === 'caution' ? 'text-caution' : 'text-ink';
  return (
    <div className="border-l-2 border-line pl-3">
      <div className="label-eyebrow">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}
