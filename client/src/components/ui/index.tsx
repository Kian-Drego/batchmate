/**
 * BatchMate UI kit. Dark-first tokens (src/index.css), static glows, and
 * transform/opacity-only motion so it stays smooth on low-end phones.
 */
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m, useReducedMotion, type PanInfo } from 'framer-motion';
import clsx from 'clsx';
import { ChevronDown, Loader2, X } from 'lucide-react';
import type { ApplicationStatus, MatchTier } from '../../lib/constants';

export const cn = clsx;

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'mint';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg shadow-glow-sm hover:shadow-glow',
  secondary: 'bg-surface-2 text-fg border border-line hover:border-line-strong hover:bg-surface-3',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger border border-danger/30 hover:border-danger/60',
  mint: 'bg-mint text-[#04140e] shadow-glow-mint',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-[52px] w-[52px] rounded-2xl',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-[52px] px-6 text-[15px] gap-2 rounded-2xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
  /** Square, icon-only button (no horizontal padding). */
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, block, iconOnly, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'tap inline-flex select-none items-center justify-center font-semibold transition-[box-shadow,background-color,border-color,color,transform] duration-150 disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        iconOnly ? ICON_SIZES[size] : BUTTON_SIZES[size],
        block && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'tap inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Surfaces & typography
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
  glow,
  as: As = 'div',
  ...rest
}: { className?: string; children: ReactNode; glow?: boolean; as?: 'div' | 'section' | 'article' | 'li' } & Record<string, unknown>) {
  return (
    <As className={cn('card', glow && 'border-accent/40 shadow-glow-sm', className)} {...rest}>
      {children}
    </As>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'accent' | 'mint' | 'warn' | 'hot' }) {
  return (
    <div className="card p-4">
      <div className="text-[12px] font-medium text-fg-faint">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight',
          tone === 'accent' && 'text-accent',
          tone === 'mint' && 'text-mint',
          tone === 'warn' && 'text-warn',
          tone === 'hot' && 'text-hot'
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[12px] text-fg-muted">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export type Tone = 'neutral' | 'accent' | 'mint' | 'warn' | 'danger' | 'hot';

const BADGE_TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted border-line',
  accent: 'bg-accent-soft text-accent border-accent/30',
  mint: 'bg-mint-soft text-mint border-mint/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  hot: 'bg-hot-soft text-hot border-hot/30',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-semibold',
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export const TIER_META: Record<MatchTier, { tone: Tone; short: string }> = {
  'Highly Eligible': { tone: 'mint', short: 'Strong match' },
  'Possibly Eligible': { tone: 'accent', short: 'Good match' },
  'Needs Additional Information': { tone: 'warn', short: 'Needs info' },
};

export function TierBadge({ tier }: { tier: MatchTier }) {
  return <Badge tone={TIER_META[tier].tone}>{TIER_META[tier].short}</Badge>;
}

const STATUS_TONE: Record<ApplicationStatus, Tone> = {
  'Not Started': 'neutral',
  'In Progress': 'accent',
  Submitted: 'hot',
  'Verification Pending': 'warn',
  Awarded: 'mint',
  Rejected: 'danger',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-fg-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-fg-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'h-12 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-[16px] text-fg placeholder:text-fg-faint transition-[border-color,box-shadow] duration-150 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cn(CONTROL, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref
) {
  return <textarea ref={ref} className={cn(CONTROL, 'h-auto min-h-[96px] py-3', className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, 'appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" aria-hidden />
    </div>
  );
}

/** Single-choice chips — faster than a <select> for short option lists on mobile. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  labels,
  label,
}: {
  options: readonly T[];
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  labels?: Record<string, string>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : o)}
            className={cn(
              'tap h-10 rounded-full border px-4 text-[13px] font-semibold transition-colors duration-150',
              active
                ? 'border-accent bg-accent-soft text-accent shadow-glow-sm'
                : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg'
            )}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] text-fg-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-surface-3 transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/30" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function Progress({ value, tone = 'accent', className }: { value: number; tone?: 'accent' | 'mint' | 'warn'; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full w-full origin-left rounded-full transition-transform duration-700 ease-out',
          tone === 'accent' && 'bg-accent',
          tone === 'mint' && 'bg-mint',
          tone === 'warn' && 'bg-warn'
        )}
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}

/** Circular progress. Animates stroke-dashoffset once on mount. */
export function Ring({
  value,
  size = 64,
  stroke = 6,
  tone = 'accent',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'accent' | 'mint' | 'warn' | 'hot';
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const color = { accent: 'rgb(var(--accent))', mint: 'rgb(var(--mint))', warn: 'rgb(var(--warn))', hot: 'rgb(var(--hot))' }[tone];
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface-3))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Animated number (rAF, ~600ms). Respects reduced motion. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(begin + (value - begin) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return (
    <>
      {n}
      {suffix}
    </>
  );
}

// ---------------------------------------------------------------------------
// Feedback states
// ---------------------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-accent', className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-surface-2', className)} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-glow-sm">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'warn' | 'mint' | 'accent'; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        tone === 'danger' && 'border-danger/30 bg-danger-soft text-danger',
        tone === 'warn' && 'border-warn/30 bg-warn-soft text-warn',
        tone === 'mint' && 'border-mint/30 bg-mint-soft text-mint',
        tone === 'accent' && 'border-accent/30 bg-accent-soft text-accent'
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented control with a sliding pill (shared layout animation)
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div role="tablist" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1 rounded-2xl border border-line bg-surface p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'relative h-10 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-semibold transition-colors duration-150',
                active ? 'text-fg' : 'text-fg-muted hover:text-fg'
              )}
            >
              {active && (
                <m.span
                  layoutId={`seg-${id}`}
                  className="absolute inset-0 rounded-xl border border-accent/40 bg-accent-soft shadow-glow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {o.label}
                {o.count !== undefined && (
                  <span className={cn('font-mono text-[12px] tabular-nums', active ? 'text-accent' : 'text-fg-faint')}>{o.count}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet: bottom sheet on mobile (drag to dismiss), side panel on desktop.
// ---------------------------------------------------------------------------

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return desktop;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const desktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <m.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <m.div
            className={cn(
              'absolute flex flex-col border-line bg-surface',
              desktop
                ? cn('right-0 top-0 h-full w-full border-l', wide ? 'max-w-3xl' : 'max-w-lg')
                : 'bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-3xl border-t'
            )}
            initial={desktop ? { x: '100%' } : { y: '100%' }}
            animate={desktop ? { x: 0 } : { y: 0 }}
            exit={desktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }}
            drag={desktop ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!desktop && (
              <div className="flex justify-center pb-1 pt-3" aria-hidden>
                <span className="h-1.5 w-10 rounded-full bg-line-strong" />
              </div>
            )}
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2 lg:pt-5">
              <div className="min-w-0">
                <div className="text-lg font-bold leading-snug">{title}</div>
                {subtitle && <div className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</div>}
              </div>
              <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div className="border-t border-line px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">{footer}</div>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
