/**
 * BatchMate UI kit — "soft tactile".
 * Warm paper surfaces, ink pill controls that physically press, pastel tints
 * for meaning. Motion is transform/opacity only so it stays smooth on low-end
 * phones; every animation respects prefers-reduced-motion.
 */
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m, useReducedMotion, type PanInfo } from 'framer-motion';
import clsx from 'clsx';
import { ChevronDown, Loader2, X } from 'lucide-react';
import type { ApplicationStatus, MatchTier, ScholarshipType } from '../../lib/constants';
import { initials } from '../../lib/format';

export const cn = clsx;

// ---------------------------------------------------------------------------
// Tones
// ---------------------------------------------------------------------------

export type Tone = 'neutral' | 'ink' | 'peach' | 'sage' | 'lilac' | 'butter' | 'sky' | 'rose';

const TINT: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2',
  ink: 'bg-primary text-primary-fg',
  peach: 'bg-peach text-peach-ink',
  sage: 'bg-sage text-sage-ink',
  lilac: 'bg-lilac text-lilac-ink',
  butter: 'bg-butter text-butter-ink',
  sky: 'bg-sky text-sky-ink',
  rose: 'bg-rose text-rose-ink',
};

export const tint = (tone: Tone) => TINT[tone];

const TYPE_TONE: Record<ScholarshipType, Tone> = {
  Government: 'sky',
  'State Government': 'sage',
  'Corporate CSR': 'peach',
  Foundation: 'lilac',
  'Merit-Based': 'butter',
  'Need-Based': 'rose',
  Minority: 'lilac',
};

export const typeTone = (type: string): Tone => TYPE_TONE[type as ScholarshipType] ?? 'neutral';

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-key hover:brightness-110 active:shadow-press',
  soft: 'bg-card text-ink border border-line shadow-soft hover:border-ink-3/40 active:shadow-press',
  ghost: 'text-ink-2 hover:text-ink hover:bg-sunken',
  danger: 'bg-rose text-rose-ink hover:brightness-[0.97] active:shadow-press',
  accent: 'bg-accent text-white shadow-key hover:brightness-105 active:shadow-press',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[14px] gap-2',
  lg: 'h-[54px] px-7 text-[15px] gap-2',
};

const ICON_SIZE: Record<ButtonSize, string> = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-[54px] w-[54px]' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
  /** Square, icon-only button. */
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
        'press inline-flex select-none items-center justify-center rounded-full font-semibold disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        iconOnly ? ICON_SIZE[size] : SIZE[size],
        block && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-40',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Surfaces & type
// ---------------------------------------------------------------------------

export function Surface({
  tone,
  grain,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: Exclude<Tone, 'neutral' | 'ink'>; grain?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-4xl shadow-soft',
        tone ? cn(TINT[tone], 'border border-black/[0.04] dark:border-white/[0.04]') : 'border border-line/70 bg-card',
        grain && 'grainy',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageTitle({ kicker, title, sub, action }: { kicker?: ReactNode; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <div className="mb-1 text-[13px] font-medium text-ink-3">{kicker}</div>}
        <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[44px]">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-2">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionHead({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 mt-9 flex items-baseline justify-between gap-3 px-1', className)}>
      <h2 className="text-[21px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: Exclude<Tone, 'neutral' | 'ink'>; hint?: ReactNode }) {
  return (
    <Surface tone={tone} className="p-4">
      <div className={cn('text-[13px] font-medium', tone ? 'opacity-80' : 'text-ink-3')}>{label}</div>
      <div className="num mt-1 text-[28px] font-semibold leading-none">{value}</div>
      {hint && <div className={cn('mt-1.5 text-[12px]', tone ? 'opacity-75' : 'text-ink-3')}>{hint}</div>}
    </Surface>
  );
}

export function Avatar({ name, src, size = 40, className }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-peach font-display font-semibold text-peach-ink', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export function Tag({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold', TINT[tone], className)}>
      {children}
    </span>
  );
}

export const TIER_META: Record<MatchTier, { tone: Tone; label: string }> = {
  'Highly Eligible': { tone: 'sage', label: 'Strong fit' },
  'Possibly Eligible': { tone: 'sky', label: 'Good fit' },
  'Needs Additional Information': { tone: 'butter', label: 'Needs info' },
};

export function TierTag({ tier }: { tier: MatchTier }) {
  return <Tag tone={TIER_META[tier].tone}>{TIER_META[tier].label}</Tag>;
}

const STATUS_TONE: Record<ApplicationStatus, Tone> = {
  'Not Started': 'neutral',
  'In Progress': 'sky',
  Submitted: 'lilac',
  'Verification Pending': 'butter',
  Awarded: 'sage',
  Rejected: 'rose',
};

export function StatusTag({ status }: { status: ApplicationStatus }) {
  return (
    <Tag tone={STATUS_TONE[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block pl-1 text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error ? <p className="pl-1 text-[12.5px] font-medium text-rose-ink">{error}</p> : hint ? <p className="pl-1 text-[12.5px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

const CONTROL =
  'h-[52px] w-full rounded-2xl border border-transparent bg-sunken px-4 text-[16px] text-ink shadow-well placeholder:text-ink-3 transition-[border-color,background-color,box-shadow] duration-200 focus:border-ink/20 focus:bg-card focus:shadow-soft focus:outline-none';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(CONTROL, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(CONTROL, 'h-auto min-h-[104px] py-3.5 leading-relaxed', className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, 'appearance-none pr-11', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  );
}

const CHIP_BASE = 'press h-10 rounded-full px-4 text-[13.5px] font-semibold';
const CHIP_ON = 'bg-primary text-primary-fg shadow-key';
const CHIP_OFF = 'bg-card text-ink-2 border border-line shadow-soft hover:text-ink';

/** Single-choice chips — faster than a <select> for short lists on mobile. */
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
        const on = value === o;
        return (
          <button key={o} type="button" role="radio" aria-checked={on} onClick={() => onChange(on ? null : o)} className={cn(CHIP_BASE, on ? CHIP_ON : CHIP_OFF)}>
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-choice chips. */
export function ChipMulti<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={cn(CHIP_BASE, on ? CHIP_ON : CHIP_OFF)}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 rounded-3xl bg-sunken px-4 py-3.5 shadow-well">
      <span>
        <span className="block text-[14.5px] font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] text-ink-3">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-8 w-[52px] rounded-full bg-line shadow-well transition-colors duration-300 peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-card shadow-soft transition-transform duration-300 ease-spring peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Meters
// ---------------------------------------------------------------------------

export function Meter({ value, className, tone = 'ink' }: { value: number; className?: string; tone?: 'ink' | 'sage' | 'butter' | 'accent' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-sunken shadow-well', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full w-full origin-left rounded-full transition-transform duration-700 ease-out',
          tone === 'ink' && 'bg-primary',
          tone === 'sage' && 'bg-sage-ink',
          tone === 'butter' && 'bg-butter-ink',
          tone === 'accent' && 'bg-accent'
        )}
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}

/** Circular dial; sweeps once on mount. */
export function Dial({ value, size = 64, stroke = 6, color = 'rgb(var(--ink))', track = 'rgb(var(--ink) / 0.1)', children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
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
          style={{ transition: 'stroke-dashoffset 1000ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

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
      const p = Math.min(1, (t - start) / 700);
      setN(Math.round(begin + (value - begin) * (1 - Math.pow(1 - p, 3))));
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
// States
// ---------------------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-ink-3', className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-breathe rounded-3xl bg-sunken', className)} aria-hidden />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-4xl" />
      ))}
    </div>
  );
}

/** Small pastel pebble composition — a calm, non-generic empty-state mark. */
function Pebbles() {
  return (
    <svg width="96" height="64" viewBox="0 0 96 64" aria-hidden>
      <ellipse cx="34" cy="38" rx="26" ry="20" fill="rgb(var(--peach))" />
      <ellipse cx="62" cy="30" rx="22" ry="18" fill="rgb(var(--lilac))" />
      <circle cx="74" cy="48" r="10" fill="rgb(var(--sage))" />
      <circle cx="20" cy="18" r="5" fill="rgb(var(--accent))" />
    </svg>
  );
}

export function Empty({ title, description, action, icon: Icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ComponentType<{ className?: string }> }) {
  return (
    <Surface className="flex flex-col items-center px-6 py-12 text-center">
      {Icon ? (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-ink-2 shadow-well">
          <Icon className="h-6 w-6" />
        </span>
      ) : (
        <div className="mb-4">
          <Pebbles />
        </div>
      )}
      <h3 className="text-[19px] font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Surface>
  );
}

export function Notice({ tone = 'butter', children, className }: { tone?: Exclude<Tone, 'neutral' | 'ink'>; children: ReactNode; className?: string }) {
  return (
    <div role="status" className={cn('rounded-3xl px-4 py-3.5 text-[14px] leading-relaxed', TINT[tone], className)}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs: a sunken track with a raised, sliding key
// ---------------------------------------------------------------------------

export function Tabs<T extends string>({ options, value, onChange, id }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" className="inline-flex gap-1 rounded-full bg-sunken p-1.5 shadow-well">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(o.value)}
              className={cn('relative h-10 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold transition-colors duration-200', on ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}
            >
              {on && <m.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-full bg-card shadow-soft" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
              <span className="relative inline-flex items-center gap-1.5">
                {o.label}
                {o.count !== undefined && <span className={cn('num text-[12.5px]', on ? 'text-accent' : 'text-ink-3')}>{o.count}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet: bottom sheet on mobile (drag the handle to dismiss), side panel on desktop
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
          <m.div className="absolute inset-0 bg-[rgb(20_16_12/0.38)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={onClose} />
          <m.div
            className={cn(
              'absolute flex flex-col bg-card shadow-lift',
              desktop ? cn('bottom-3 right-3 top-3 w-full rounded-5xl', wide ? 'max-w-2xl' : 'max-w-lg') : 'bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-5xl'
            )}
            initial={desktop ? { x: '105%' } : { y: '100%' }}
            animate={desktop ? { x: 0 } : { y: 0 }}
            exit={desktop ? { x: '105%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
            drag={desktop ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!desktop && (
              <div className="flex justify-center pb-1 pt-3" aria-hidden>
                <span className="h-1.5 w-11 rounded-full bg-line" />
              </div>
            )}
            <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-2 lg:pt-6">
              <div className="min-w-0">
                <div className="font-display text-[22px] font-semibold leading-tight tracking-tight">{title}</div>
                {subtitle && <div className="mt-1 text-[13.5px] text-ink-2">{subtitle}</div>}
              </div>
              <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1 bg-sunken">
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div className="border-t border-line/70 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">{footer}</div>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Staggered entrance for lists (CSS-only; capped so long lists don't lag). */
export function riseDelay(i: number): CSSProperties {
  return { animationDelay: `${Math.min(i, 8) * 45}ms` };
}
