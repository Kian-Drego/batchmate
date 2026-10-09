import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

/** Landing for email confirmation + OAuth redirects (PKCE code exchange is automatic). */
export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const error = new URLSearchParams(window.location.search).get('error_description');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  if (error || (timedOut && !loading && !user)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold">Sign-in didn&apos;t complete</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">{error ?? 'The link may have expired or already been used.'}</p>
        <Link to="/login" className="mt-6 font-semibold text-accent">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-fg-muted">Signing you in…</p>
    </div>
  );
}
