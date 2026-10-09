import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const ScholarshipDetailPage = lazy(() => import('./pages/ScholarshipDetailPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const ExamHubPage = lazy(() => import('./pages/ExamHubPage'));
const ExamTakePage = lazy(() => import('./pages/ExamTakePage'));
const PassportPage = lazy(() => import('./pages/PassportPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Full-screen focus mode for tests (no nav chrome). */}
        <Route
          path="/exams/:scholarshipId/take"
          element={
            <ProtectedRoute>
              <ExamTakePage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/exams" element={<ExamHubPage />} />
          <Route path="/passport" element={<PassportPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute admin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={loading ? <FullPageSpinner /> : <Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
