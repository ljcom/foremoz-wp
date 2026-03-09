import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import WebLandingPage from './pages/WebLandingPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
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
  if (!session?.isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  if (!session?.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WebLandingPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
