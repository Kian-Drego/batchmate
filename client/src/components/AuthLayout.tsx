import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { ThemeButton } from './AppShell';
import { cn } from './ui';

const STACK = [
  { title: 'Post-Matric for SC students', meta: '₹1.2L · Government', tone: 'bg-sky text-sky-ink', rotate: -7, x: -18, y: 10 },
  { title: 'TCS Ignite Scholarship', meta: '₹1L · Corporate CSR', tone: 'bg-peach text-peach-ink', rotate: 5, x: 22, y: -4 },
  { title: 'Central Sector Scheme', meta: '₹20k · Merit-based', tone: 'bg-butter text-butter-ink', rotate: -1.5, x: 0, y: 0 },
];

/** A loose, hand-dealt stack of scholarship cards — the brand's signature image. */
function CardStack() {
  return (
    <div className="relative mx-auto h-[150px] w-[260px] sm:h-[190px] sm:w-[320px]" aria-hidden>
      {STACK.map((c, i) => (
        <m.div
          key={c.title}
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          animate={{ opacity: 1, y: c.y, x: c.x, rotate: c.rotate }}
          transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.1 + i * 0.09 }}
          className={cn('grainy absolute inset-x-0 top-4 mx-auto w-[230px] rounded-[26px] p-4 shadow-lift sm:w-[280px] sm:p-5', c.tone)}
          style={{ zIndex: i }}
        >
          {/* Only the front card carries text; the others read as paper edges. */}
          <div className={cn(i !== STACK.length - 1 && 'invisible')}>
            <div className="flex items-center justify-between">
              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
              <span className="text-[11px] font-semibold opacity-70">92% fit</span>
            </div>
            <div className="mt-6 font-display text-[17px] font-semibold leading-tight sm:mt-9 sm:text-[19px]">{c.title}</div>
            <div className="mt-1 text-[12.5px] font-medium opacity-75">{c.meta}</div>
          </div>
        </m.div>
      ))}
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] lg:px-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-[11px] shadow-soft" />
          <span className="font-display text-[19px] font-semibold tracking-tight">batchmate</span>
        </div>
        <ThemeButton />
      </div>

      <div className="flex flex-1 flex-col gap-8 pt-6 lg:flex-row lg:items-center lg:gap-16 lg:pt-0">
        <section className="lg:flex-1">
          <h1 className="text-[40px] font-semibold leading-[0.98] sm:text-[56px] lg:text-[68px]">
            Scholarships that
            <br />
            <span className="italic text-accent">actually</span> fit you.
          </h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-2">
            One passport. Every government, state and CSR scholarship you qualify for — with the reasons why.
          </p>
          <div className="mt-8 lg:mt-14">
            <CardStack />
          </div>
        </section>

        <m.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="surface w-full p-6 sm:p-8 lg:max-w-[440px]"
        >
          <h2 className="text-[26px] font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-[14.5px] text-ink-2">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </m.section>
      </div>
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
        className="press flex h-[52px] w-full items-center justify-center gap-3 rounded-full border border-line bg-card text-[14.5px] font-semibold shadow-soft disabled:opacity-60"
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      <div className="my-5 flex items-center gap-3 text-[12.5px] font-medium text-ink-3">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
