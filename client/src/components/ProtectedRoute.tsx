import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/**
 * `admin`   — admins only; students are sent to their dashboard.
 * `student` — students only; admins are sent to the console.
 * Neither   — any signed-in user (e.g. the full-screen exam runner).
 * Role-gated routes wait for the profile so nobody flashes the wrong app.
 */
export default function ProtectedRoute({ children, admin, student }: { children: ReactNode; admin?: boolean; student?: boolean }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const needsRole = admin || student;

  if (loading || (user && needsRole && !profile)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (student && profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
