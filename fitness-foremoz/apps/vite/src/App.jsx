import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MemberPage from './pages/MemberPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { getSession } from './lib.js';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session?.isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function RequireOnboarding({ children }) {
  const session = getSession();
  if (session?.isAuthenticated && !session?.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function OnboardingOnly({ children }) {
  const session = getSession();
  if (!session?.isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  if (session?.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/onboarding"
        element={
          <OnboardingOnly>
            <OnboardingPage />
          </OnboardingOnly>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RequireOnboarding>
              <DashboardPage />
            </RequireOnboarding>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:memberId"
        element={
          <ProtectedRoute>
            <RequireOnboarding>
              <MemberPage />
            </RequireOnboarding>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RequireOnboarding>
              <AdminPage />
            </RequireOnboarding>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute>
            <RequireOnboarding>
              <AdminPage />
            </RequireOnboarding>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
