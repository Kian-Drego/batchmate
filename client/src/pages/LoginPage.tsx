import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout, { GoogleButton } from '../components/AuthLayout';
import { Notice, Button, Field, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function friendly(message: string): string {
  if (/invalid login/i.test(message)) return 'Wrong email or password.';
  if (/not confirmed/i.test(message)) return 'Confirm your email first — check your inbox.';
  return message;
}

export default function LoginPage() {
  const { user, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendly((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see your matches.">
      <GoogleButton onClick={() => signInWithGoogle().catch((e: Error) => toast.error(e.message))} />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Notice tone="rose">{error}</Notice>}
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
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink-3 hover:text-ink"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-[13px] font-semibold text-accent">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" block loading={busy} disabled={!email || !password}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        New here?{' '}
        <Link to="/register" className="font-semibold text-accent">
          Create your passport
        </Link>
      </p>
    </AuthLayout>
  );
}
