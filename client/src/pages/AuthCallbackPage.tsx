import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner } from '../components/ui';

/** Handles the Google OAuth redirect: /auth/callback?token=... */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    const oauthError = params.get('error');
    if (oauthError) {
      setError('Google sign-in could not be completed. Try email sign-in instead.');
      return;
    }
    if (!token) {
      setError('Missing authentication token in the redirect.');
      return;
    }
    loginWithToken(token)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setError('Could not complete sign-in. Please try again.'));
  }, [params, loginWithToken, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        {error ? (
          <>
            <Alert tone="danger">{error}</Alert>
            <a href="/login" className="mt-4 inline-block text-sm font-semibold text-lavender-ink underline">
              Return to sign in
            </a>
          </>
        ) : (
          <>
            <Spinner className="mx-auto h-6 w-6" />
            <p className="mt-3 text-sm text-ink-soft">Completing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
