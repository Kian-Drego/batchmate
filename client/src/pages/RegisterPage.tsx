import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Field, TextInput } from '../components/ui';
import ThemeToggle from '../components/ThemeToggle';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/passport', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
      <ThemeToggle className="absolute right-5 top-5 z-10" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-card border border-line bg-inverse text-inverse-fg">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-serif text-lg font-semibold">BatchMate</span>
        </div>

        <h2 className="text-2xl font-semibold text-ink">Create your passport</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Two minutes now saves repeated form-filling later.
        </p>

        {error && (
          <div className="mt-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Full name" htmlFor="name">
            <TextInput
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As printed on your marksheet"
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password" htmlFor="password" hint="Minimum 8 characters.">
            <TextInput
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-4 text-xs text-ink-faint">
          We never ask for Aadhaar, PAN or any government identifier. Only academic and demographic
          metadata needed for eligibility checks.
        </p>

        <p className="mt-6 text-sm text-ink-soft">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-lavender-ink underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
