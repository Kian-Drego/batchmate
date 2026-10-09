import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowUpRight, Hourglass, MailCheck, Send, ShieldCheck } from 'lucide-react';
import { BUSY_WINDOW_MS, clock, useEmailVerification, type VerifyState } from '../lib/verification';
import { tick } from '../lib/haptics';
import { Button, Dial, Sheet, Surface, cn } from './ui';

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-[14.5px] leading-snug">
          <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.07] text-[12.5px] font-semibold dark:bg-white/10">{i + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

const MAIL_SUBJECT = '“Your Magic Link”';

/** The full verification card. Loud when we can send, calm when we can't. */
export function VerifyCard({ className }: { className?: string }) {
  const { state, send, email } = useEmailVerification();

  const onSend = async () => {
    const r = await send();
    if (r === 'sent') {
      tick([8, 30, 8]);
      toast.success('Link sent — check your inbox');
    } else if (r === 'busy') toast('Email is queued up — a new window is open');
    else toast.error('Could not send right now. Try again in a moment.');
  };

  if (state.kind === 'verified') return null;

  if (state.kind === 'busy') {
    const pct = Math.min(100, 100 - (state.secondsLeft * 1000 * 100) / BUSY_WINDOW_MS);
    return (
      <Surface tone="lilac" grain className={cn('p-6', className)}>
        <div className="flex items-center gap-4">
          <Dial value={Math.max(4, pct)} size={72} stroke={6} color="rgb(var(--lilac-ink))" track="rgb(var(--lilac-ink) / 0.15)">
            <Hourglass className="h-6 w-6" />
          </Dial>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold opacity-75">Email verification</div>
            <div className="num text-[34px] font-semibold leading-none">{clock(state.secondsLeft)}</div>
            <div className="mt-1 text-[13px] opacity-80">until the next verification window</div>
          </div>
        </div>
        <p className="mt-4 text-[14.5px] leading-relaxed opacity-90">
          BatchMate is in beta and our email sender has a small hourly limit, so your link is waiting its turn. Nothing is blocked — keep exploring.
          {state.windows > 1 && ' It was still busy last time, so we opened a fresh window.'}
        </p>
        <p className="mt-2 text-[13.5px] opacity-75">When the timer ends, tap “Send verification link”, then open the email titled {MAIL_SUBJECT} and tap “Log In”.</p>
      </Surface>
    );
  }

  if (state.kind === 'sent') {
    return (
      <Surface tone="sage" grain className={cn('p-6', className)}>
        <div className="flex items-start gap-4">
          <m.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-ink shadow-soft">
            <MailCheck className="h-6 w-6" />
          </m.span>
          <div className="min-w-0">
            <h3 className="text-[22px] font-semibold leading-tight">Check your inbox</h3>
            <p className="mt-1 truncate text-[14px] opacity-80">Sent to {email}</p>
          </div>
        </div>
        <Steps
          items={[
            <>Open the email titled <b className="font-semibold">{MAIL_SUBJECT}</b> (it comes from Supabase Auth — peek in Spam or Promotions too).</>,
            <>Tap <b className="font-semibold">“Log In”</b>. It works on any device.</>,
            <>You’ll land back in BatchMate, verified. That’s it.</>,
          ]}
        />
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="https://mail.google.com/mail/u/0/#search/%22magic+link%22" target="_blank" rel="noreferrer">
            <Button size="md">
              Open Gmail <ArrowUpRight className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="soft" size="md" onClick={onSend} disabled={state.canResendIn > 0} className="bg-white/60 dark:bg-black/20">
            {state.canResendIn > 0 ? `Resend in ${clock(state.canResendIn)}` : 'Resend link'}
          </Button>
        </div>
      </Surface>
    );
  }

  // ready / sending — the moment to push.
  return (
    <Surface tone="butter" grain className={cn('relative overflow-hidden p-6', className)}>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-ink shadow-soft">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[22px] font-semibold leading-tight">Verify your email</h3>
          <p className="mt-1 text-[14px] opacity-85">20 seconds. Keeps your account recoverable and lets us trust your documents faster.</p>
        </div>
      </div>
      <Steps
        items={[
          <>Tap the button below — we’ll email {email ? <b className="font-semibold">{email}</b> : 'you'}.</>,
          <>Open the email titled <b className="font-semibold">{MAIL_SUBJECT}</b>.</>,
          <>Tap <b className="font-semibold">“Log In”</b> in it. Done.</>,
        ]}
      />
      <Button size="lg" block className="mt-5" onClick={onSend} loading={state.kind === 'sending'}>
        <Send className="h-4 w-4" /> Send verification link
      </Button>
      <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/30 dark:bg-white/5" aria-hidden />
    </Surface>
  );
}

function nudgeCopy(state: VerifyState): { text: React.ReactNode; tone: string; cta: string } | null {
  switch (state.kind) {
    case 'ready':
    case 'sending':
      return { text: 'Verify your email to secure your account', tone: 'bg-butter text-butter-ink', cta: 'Verify' };
    case 'sent':
      return { text: 'Link sent — tap “Log In” in “Your Magic Link”', tone: 'bg-sage text-sage-ink', cta: 'Help' };
    case 'busy':
      return {
        text: (
          <>
            Email verification opens in <span className="num">{clock(state.secondsLeft)}</span>
          </>
        ),
        tone: 'bg-lilac text-lilac-ink',
        cta: 'Why?',
      };
    default:
      return null;
  }
}

/**
 * Persistent, compact reminder shown across the student app until verified.
 * Also fires the onboarding send once, right after sign-up.
 */
export function VerifyNudge() {
  const { state, send, autoTried, isStudent } = useEmailVerification();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const fired = useRef(false);

  // Onboarding: send the first link automatically (only if we can).
  useEffect(() => {
    if (!isStudent || fired.current || autoTried || state.kind !== 'ready') return;
    fired.current = true;
    void send().then((r) => {
      if (r === 'sent') toast.success('Welcome! We just emailed you a verification link.');
    });
  }, [isStudent, autoTried, state.kind, send]);

  const copy = nudgeCopy(state);
  // The dashboard shows the full card when we can push; keep the strip for the calm (busy) state.
  const onDashboard = location.pathname === '/dashboard' && state.kind !== 'busy';
  if (!isStudent || !copy || onDashboard) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn('press mb-4 flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-[13.5px] font-semibold shadow-soft', copy.tone)}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-30 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
        </span>
        <span className="min-w-0 flex-1 truncate">{copy.text}</span>
        <span className="shrink-0 rounded-full bg-black/[0.07] px-3 py-1 text-[12.5px] dark:bg-white/10">{copy.cta}</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Email verification">
        <VerifyCard />
      </Sheet>
    </>
  );
}
