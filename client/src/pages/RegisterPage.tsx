import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MailCheck } from 'lucide-react';
import AuthLayout, { GoogleButton } from '../components/AuthLayout';
import { Notice, Button, Field, Input, cn } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw) || /[^\w]/.test(pw)) s += 1;
  return s;
}

const STRENGTH = ['Too short', 'Weak', 'Okay', 'Strong', 'Very strong'];
const STRENGTH_BAR = ['bg-rose-ink', 'bg-rose-ink', 'bg-butter-ink', 'bg-sage-ink', 'bg-sage-ink'];

export default function RegisterPage() {
  const { user, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (user) return <Navigate to="/dashboard" replace />;

  const score = strength(password);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      if (needsConfirmation) setSentTo(email);
      else navigate('/passport?welcome=1', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={
          <>
            We sent a confirmation link to <b className="text-ink">{sentTo}</b>.
          </>
        }
      >
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-sage text-sage-ink shadow-soft">
            <MailCheck className="h-7 w-7" />
          </span>
          <p className="mt-5 text-sm text-ink-2">
            Tap the link on this device to finish setting up your passport. Didn&apos;t get it? Check spam.
          </p>
          <Link to="/login" className="mt-6 text-sm font-semibold text-accent">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your passport" subtitle="Takes about 2 minutes. Free forever.">
      <GoogleButton onClick={() => signInWithGoogle().catch((e: Error) => toast.error(e.message))} />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Notice tone="rose">{error}</Notice>}
        <Field label="Your name" htmlFor="name">
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aarav Sharma"
            maxLength={120}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@college.edu"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          {password && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', i < score ? STRENGTH_BAR[score] : 'bg-sunken')}
                  />
                ))}
              </div>
              <span className="text-[12px] font-medium text-ink-3">{STRENGTH[score]}</span>
            </div>
          )}
        </Field>
        <Button type="submit" size="lg" block loading={busy} disabled={!name || !email || !password}>
          Create account
        </Button>
        <p className="text-center text-[12px] text-ink-3">We never ask for Aadhaar, PAN or any government ID.</p>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
