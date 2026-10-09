import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import PassportPage from './pages/PassportPage';
import MatchesPage from './pages/MatchesPage';
import ScholarshipDetailPage from './pages/ScholarshipDetailPage';
import ApplicationsPage from './pages/ApplicationsPage';
import ExamHubPage from './pages/ExamHubPage';
import ExamTakePage from './pages/ExamTakePage';
import InsightsPage from './pages/InsightsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/passport" element={<PassportPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/exams" element={<ExamHubPage />} />
        <Route path="/exams/:scholarshipId/take" element={<ExamTakePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route
        path="/"
        element={
          loading ? null : <Navigate to={user ? '/dashboard' : '/login'} replace />
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
