import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import type { ProfileRow } from '@shared/types.ts';
import { toast } from 'sonner';
import { supabase, toError } from '../lib/supabase';

/** Auth methods that prove the user read their inbox. */
const EMAIL_PROOF = new Set(['otp', 'magiclink', 'recovery', 'email/signup', 'email_change']);

function sessionProvesEmail(session: Session | null): boolean {
  if (!session) return false;
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.amr ?? []).some((m: { method?: string }) => EMAIL_PROOF.has(m.method ?? ''));
  } catch {
    return false;
  }
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  /** True while the user arrived from a password-recovery link. */
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const redirect = (path: string) => `${window.location.origin}${path}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    let row = (data as ProfileRow) ?? null;
    // Arrived via the emailed link: record that the address is verified.
    if (row && !row.email_verified_at) {
      const { data: s } = await supabase.auth.getSession();
      if (sessionProvesEmail(s.session)) {
        const { data: stamp, error } = await supabase.rpc('confirm_email_ownership');
        if (!error && stamp) {
          row = { ...row, email_verified_at: stamp as string };
          toast.success('Email verified — you’re all set.');
        }
      }
    }
    setProfile(row);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        qc.clear();
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Defer: calling supabase inside the callback can deadlock the auth lock.
        setTimeout(() => void loadProfile(next?.user.id), 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, qc]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw await toError(error);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: redirect('/auth/callback') },
    });
    if (error) throw await toError(error);
    return { needsConfirmation: !data.session };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect('/auth/callback') },
    });
    if (error) throw await toError(error);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect('/auth/reset') });
    if (error) throw await toError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw await toError(error);
    setRecovering(false);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      recovering,
      signIn,
      signUp,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      signOut,
      refreshProfile: () => loadProfile(session?.user.id),
    }),
    [session, profile, loading, recovering, signIn, signUp, signInWithGoogle, sendPasswordReset, updatePassword, signOut, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
