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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminReviewPage = lazy(() => import('./pages/admin/AdminReviewPage'));
const AdminApplicationsPage = lazy(() => import('./pages/admin/AdminApplicationsPage'));
const AdminStudentsPage = lazy(() => import('./pages/admin/AdminStudentsPage'));
const AdminCataloguePage = lazy(() => import('./pages/admin/AdminCataloguePage'));
const AdminInsightsPage = lazy(() => import('./pages/admin/AdminInsightsPage'));
const AdminSourcesPage = lazy(() => import('./pages/admin/AdminSourcesPage'));
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'));
const AdminMorePage = lazy(() => import('./pages/admin/AdminMorePage'));

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

function Home() {
  const { user, profile, loading } = useAuth();
  if (loading || (user && !profile)) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

export default function App() {
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
            <ProtectedRoute student>
              <AppShell variant="student" />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/exams" element={<ExamHubPage />} />
          <Route path="/passport" element={<PassportPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute admin>
              <AppShell variant="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="review" element={<AdminReviewPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="catalogue" element={<AdminCataloguePage />} />
          <Route path="insights" element={<AdminInsightsPage />} />
          <Route path="sources" element={<AdminSourcesPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route path="more" element={<AdminMorePage />} />
        </Route>

        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
