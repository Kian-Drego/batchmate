import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { Lock, Sparkles, Zap } from 'lucide-react';

const PERKS = [
  { icon: Sparkles, text: 'Matches ranked by real eligibility' },
  { icon: Zap, text: 'Track every application in one place' },
  { icon: Lock, text: 'No Aadhaar. No PAN. Ever.' },
];

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:flex-row lg:items-center lg:gap-16 lg:px-10">
      <section className="lg:flex-1">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-[11px]" />
          <span className="text-lg font-extrabold tracking-tight">BatchMate</span>
        </div>
        <h1 className="mt-8 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          <span className="gradient-text">Scholarships</span>
          <br />
          that actually fit you.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fg-muted">
          Build your passport once. We match it against government, state and CSR scholarships and tell you exactly why
          you qualify.
        </p>
        <ul className="mt-6 hidden flex-wrap gap-2 sm:flex">
          {PERKS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-fg-muted"
            >
              <Icon className="h-4 w-4 text-accent" /> {text}
            </li>
          ))}
        </ul>
      </section>

      <m.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="card mt-8 w-full p-5 sm:p-7 lg:mt-0 lg:max-w-md"
      >
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </m.section>
    </div>
  );
}

export function GoogleButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  if (import.meta.env.VITE_GOOGLE_AUTH !== 'true') return null;
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="tap flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface-2 text-sm font-semibold transition-colors hover:border-line-strong disabled:opacity-60"
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      <div className="my-5 flex items-center gap-3 text-[12px] font-medium text-fg-faint">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
