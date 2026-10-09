import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Target, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Alert, Button, Field, TextInput } from '../components/ui';
import ThemeToggle from '../components/ThemeToggle';

const CAPABILITIES = [
  { icon: Target, text: 'Eligibility-matched scholarships, scored against your passport' },
  { icon: FileText, text: 'Guided application checklists with document tracking' },
  { icon: GraduationCap, text: 'Aptitude mock tests with readiness analytics' },
  { icon: ShieldCheck, text: 'No national ID collected — non-identifying metadata only' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    api
      .get<{ google: boolean }>('/auth/providers')
      .then((p) => setGoogleEnabled(p.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: string })?.from ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      <ThemeToggle className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6" />

      <div className="grid w-full max-w-6xl overflow-hidden rounded-card border border-line shadow-hard lg:min-h-[36rem] lg:grid-cols-[1.1fr_1fr]">
        {/* Left: product framing with precise, utility-first language. */}
        <section className="relative hidden flex-col justify-between border-line bg-ink p-10 text-paper dark:bg-paper-raised dark:text-ink lg:flex lg:border-r">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-card border border-paper/30 dark:border-line">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-serif text-lg font-semibold">BatchMate</span>
          </div>

          <div className="max-w-md">
            <div className="label-eyebrow !text-paper/60 dark:!text-ink-faint">One profile, ranked matches</div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Find the scholarships you actually qualify for.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-paper/70 dark:text-ink-soft">
              Fill your passport once. We apply hard eligibility filters and a weighted fit score to
              every listed scheme, then show you exactly why you matched — and what is still missing.
            </p>
            <ul className="mt-8 space-y-3">
              {CAPABILITIES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-paper/80 dark:text-ink-soft">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-paper/60 dark:text-ink-faint" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-xs uppercase tracking-[0.15em] text-paper/50 dark:text-ink-faint">
            Catalogue refreshed daily at 00:00 IST
          </p>
        </section>

        {/* Right: auth form */}
        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-card border border-line bg-inverse text-inverse-fg">
                  <GraduationCap className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-serif text-lg font-semibold">BatchMate</span>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-ink">Sign in</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Use your email account to open your passport.
            </p>

            {error && (
              <div className="mt-4">
                <Alert tone="danger">{error}</Alert>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
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
              <Field label="Password" htmlFor="password">
                <TextInput
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Button type="submit" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>

            {googleEnabled && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
                  <span className="h-px flex-1 bg-line-faint" />
                  or
                  <span className="h-px flex-1 bg-line-faint" />
                </div>
                <a href="/api/auth/google">
                  <Button variant="secondary" className="w-full">
                    Continue with Google
                  </Button>
                </a>
              </>
            )}

            <p className="mt-6 text-sm text-ink-soft">
              No account?{' '}
              <Link to="/register" className="font-semibold text-lavender-ink underline">
                Create a passport
              </Link>
            </p>

            <div className="mt-8 rounded-card border border-line-faint bg-paper-sunken px-3 py-2.5 text-xs text-ink-soft">
              <span className="font-semibold text-ink">Demo credentials:</span> student@example.com ·
              password123
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
