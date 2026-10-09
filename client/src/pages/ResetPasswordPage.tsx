import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AuthLayout from '../components/AuthLayout';
import { Notice, Button, Field, Input, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      toast.success('Password updated');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password">
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : !session ? (
        <Notice tone="butter">This reset link is invalid or has expired. Request a new one from the sign-in page.</Notice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Notice tone="rose">{error}</Notice>}
          <Field label="New password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" block loading={busy} disabled={!password}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
