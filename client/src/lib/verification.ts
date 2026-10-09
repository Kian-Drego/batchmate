/**
 * Soft email verification (beta).
 *
 * Supabase's free tier sends only a couple of auth emails per hour, so sign-up
 * never waits on email. Instead we send Supabase's stock "magic link" email on
 * demand; opening it signs the user in with an email-proven session and
 * AuthContext records `profiles.email_verified_at`.
 *
 * When Supabase refuses to send (rate limited) we park the user in a cooldown
 * window and show a countdown; when it ends they can try again, and a fresh
 * refusal simply opens a new window.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../context/AuthContext';

/** Fallback wait when Supabase gives no explicit retry time (project-wide hourly cap). */
export const BUSY_WINDOW_MS = 15 * 60 * 1000;
/** Minimum gap between two sends to the same address (Supabase per-user limit). */
const RESEND_GAP_MS = 60 * 1000;
/** Supabase magic links expire after an hour. */
const LINK_LIFETIME_MS = 60 * 60 * 1000;

interface Stored {
  sentAt?: number;
  nextAt?: number;
  busy?: boolean; // the last attempt hit the email rate limit
  autoTried?: boolean; // onboarding send already attempted
  windows?: number; // how many busy windows in a row
}

export type VerifyState =
  | { kind: 'verified' }
  | { kind: 'ready' } // can send now
  | { kind: 'sending' }
  | { kind: 'sent'; sentAt: number; canResendIn: number } // check inbox
  | { kind: 'busy'; secondsLeft: number; windowEndsAt: number; windows: number }; // rate limited

const key = (uid: string) => `bm-verify:${uid}`;

function read(uid: string): Stored {
  try {
    return JSON.parse(localStorage.getItem(key(uid)) ?? '{}') as Stored;
  } catch {
    return {};
  }
}

function write(uid: string, value: Stored) {
  try {
    localStorage.setItem(key(uid), JSON.stringify(value));
  } catch {
    /* storage unavailable: state just won't persist across reloads */
  }
  window.dispatchEvent(new Event('bm-verify'));
}

/** Seconds Supabase asks us to wait, if the error is a rate limit. */
export function rateLimitWait(err: unknown): number | null {
  const e = err as { status?: number; code?: string; message?: string };
  const msg = e?.message ?? '';
  const limited = e?.status === 429 || /rate limit|too many|only request this after/i.test(msg) || e?.code === 'over_email_send_rate_limit';
  if (!limited) return null;
  const secs = /after (\d+) seconds?/i.exec(msg)?.[1];
  return secs ? Number(secs) : BUSY_WINDOW_MS / 1000;
}

export function useEmailVerification() {
  const { user, profile } = useAuth();
  const uid = user?.id ?? '';
  const [stored, setStored] = useState<Stored>(() => (uid ? read(uid) : {}));
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Keep every mounted instance (banner + card) in sync.
  useEffect(() => {
    if (!uid) return;
    setStored(read(uid));
    const sync = () => setStored(read(uid));
    window.addEventListener('bm-verify', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('bm-verify', sync);
      window.removeEventListener('storage', sync);
    };
  }, [uid]);

  const verified = Boolean(profile?.email_verified_at);
  const waiting = !verified && Boolean(stored.nextAt && stored.nextAt > now);

  // Tick once a second only while a countdown is visible.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  const send = useCallback(async (): Promise<'sent' | 'busy' | 'error'> => {
    if (!uid || !user?.email) return 'error';
    setSending(true);
    const prev = read(uid);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?verify=1` },
      });
      if (error) throw error;
      write(uid, { ...prev, sentAt: Date.now(), nextAt: Date.now() + RESEND_GAP_MS, busy: false, windows: 0, autoTried: true });
      return 'sent';
    } catch (err) {
      const wait = rateLimitWait(err);
      if (wait === null) {
        write(uid, { ...prev, autoTried: true });
        return 'error';
      }
      // Rate limited: open (or re-open) a waiting window.
      write(uid, { ...prev, busy: true, nextAt: Date.now() + wait * 1000, windows: (prev.windows ?? 0) + 1, autoTried: true });
      return 'busy';
    } finally {
      setSending(false);
      setNow(Date.now());
    }
  }, [uid, user?.email]);

  let state: VerifyState;
  if (verified) state = { kind: 'verified' };
  else if (sending) state = { kind: 'sending' };
  else if (stored.busy && stored.nextAt && stored.nextAt > now)
    state = { kind: 'busy', secondsLeft: Math.ceil((stored.nextAt - now) / 1000), windowEndsAt: stored.nextAt, windows: stored.windows ?? 1 };
  else if (!stored.busy && stored.sentAt && now - stored.sentAt < LINK_LIFETIME_MS)
    state = { kind: 'sent', sentAt: stored.sentAt, canResendIn: Math.max(0, Math.ceil(((stored.nextAt ?? 0) - now) / 1000)) };
  else state = { kind: 'ready' };

  return { state, send, email: user?.email ?? '', autoTried: Boolean(stored.autoTried), isStudent: profile?.role !== 'admin' };
}

export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
