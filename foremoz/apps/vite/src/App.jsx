import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import WebLandingPage from './pages/WebLandingPage.jsx';
import VerticalLandingPage from './pages/VerticalLandingPage.jsx';
import WebOwnerPage from './pages/WebOwnerPage.jsx';
import AccountPublicPage from './pages/AccountPublicPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import MemberSignUpPage from './pages/MemberSignUpPage.jsx';
import MemberSignInPage from './pages/MemberSignInPage.jsx';
import MemberPortalPage from './pages/MemberPortalPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MemberPage from './pages/MemberPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import SalesProspectNewPage from './pages/SalesProspectNewPage.jsx';
import SalesProspectEditPage from './pages/SalesProspectEditPage.jsx';
import PtPage from './pages/PtPage.jsx';
import { accountPath, getSession } from './lib.js';

function roleHome(session) {
  const role = session?.role || 'admin';
  if (role === 'sales') return accountPath(session, '/sales/dashboard');
  if (role === 'pt') return accountPath(session, '/pt/dashboard');
  if (role === 'cs') return accountPath(session, '/cs/dashboard');
  if (role === 'member') return accountPath(session, '/member/portal');
  return accountPath(session, '/admin/dashboard');
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session?.isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function MemberProtectedRoute({ children }) {
  const session = getSession();
  if (!session?.isAuthenticated) {
    return <Navigate to="/a/tn_001/member/signin" replace />;
  }
  return children;
}

function RoleRoute({ roles, children }) {
  const session = getSession();
  if (!roles.includes(session?.role || 'admin')) {
    return <Navigate to={roleHome(session)} replace />;
  }
  return children;
}

function RequireAdminOnboarding({ children }) {
  const session = getSession();
  const role = session?.role || 'admin';
  if (role === 'admin' && !session?.isOnboarded) {
    return <Navigate to="/web/owner" replace />;
  }
  return children;
}

function OnboardingOnly() {
  return <Navigate to="/web/owner" replace />;
}

function LegacyAdminRedirect() {
  const { account } = useParams();
  return <Navigate to={`/a/${account}/admin/dashboard`} replace />;
}

function LegacyAdminSettingsRedirect() {
  const { account } = useParams();
  return <Navigate to={`/a/${account}/admin/dashboard`} replace />;
}

function LegacyDashboardRedirect() {
  const { account } = useParams();
  return <Navigate to={`/a/${account}/cs/dashboard`} replace />;
}

function LegacyCsRedirect() {
  const { account } = useParams();
  return <Navigate to={`/a/${account}/cs/dashboard`} replace />;
}

function LegacySalesRedirect() {
  const { account } = useParams();
  return <Navigate to={`/a/${account}/sales/dashboard`} replace />;
}

function LegacyPtRedirect() {
  const { account } = useParams();
  return <Navigate to={`/a/${account}/pt/dashboard`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/web" replace />} />
      <Route path="/web" element={<WebLandingPage />} />
      <Route path="/active" element={<VerticalLandingPage />} />
      <Route path="/learning" element={<VerticalLandingPage />} />
      <Route path="/arts" element={<VerticalLandingPage />} />
      <Route path="/tourism" element={<VerticalLandingPage />} />
      <Route path="/performance" element={<VerticalLandingPage />} />
      <Route path="/web/owner" element={<WebOwnerPage />} />
      <Route path="/a/:account" element={<AccountPublicPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/a/:account/member/signup" element={<MemberSignUpPage />} />
      <Route path="/member/signup" element={<Navigate to="/a/tn_001/member/signup" replace />} />
      <Route path="/a/:account/member/signin" element={<MemberSignInPage />} />
      <Route path="/member/signin" element={<Navigate to="/a/tn_001/member/signin" replace />} />
      <Route path="/a/:account/signin" element={<SignInPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/onboarding" element={<OnboardingOnly />} />

      <Route
        path="/a/:account/cs/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['admin', 'owner', 'cs']}>
              <RequireAdminOnboarding>
                <DashboardPage />
              </RequireAdminOnboarding>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/dashboard"
        element={<LegacyDashboardRedirect />}
      />
      <Route
        path="/a/:account/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['admin', 'owner']}>
              <RequireAdminOnboarding>
                <AdminPage />
              </RequireAdminOnboarding>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/a/:account/admin/settings" element={<LegacyAdminRedirect />} />
      <Route path="/a/:account/admin" element={<LegacyAdminSettingsRedirect />} />
      <Route path="/a/:account/cs" element={<LegacyCsRedirect />} />
      <Route path="/a/:account/dashboard/cs" element={<LegacyCsRedirect />} />
      <Route path="/a/:account/dashboard/admin" element={<LegacyAdminRedirect />} />
      <Route
        path="/a/:account/members/:memberId"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['admin', 'owner', 'cs', 'pt']}>
              <RequireAdminOnboarding>
                <MemberPage />
              </RequireAdminOnboarding>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['sales', 'admin', 'owner']}>
              <SalesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/prospects/new"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['sales', 'admin', 'owner']}>
              <SalesProspectNewPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/prospects/:prospectId/edit"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['sales', 'admin', 'owner']}>
              <SalesProspectEditPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/a/:account/sales" element={<LegacySalesRedirect />} />
      <Route path="/a/:account/dashboard/sales" element={<LegacySalesRedirect />} />
      <Route
        path="/a/:account/pt/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['pt', 'admin', 'owner']}>
              <PtPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/a/:account/dashboard/pt" element={<LegacyPtRedirect />} />
      <Route
        path="/a/:account/member"
        element={
          <MemberProtectedRoute>
            <RoleRoute roles={['member']}>
              <MemberPortalPage />
            </RoleRoute>
          </MemberProtectedRoute>
        }
      />
      <Route
        path="/a/:account/member/portal"
        element={
          <MemberProtectedRoute>
            <RoleRoute roles={['member']}>
              <MemberPortalPage />
            </RoleRoute>
          </MemberProtectedRoute>
        }
      />
      <Route path="/member/portal" element={<Navigate to={accountPath(getSession(), '/member/portal')} replace />} />

      <Route path="/dashboard" element={<Navigate to={roleHome(getSession())} replace />} />
      <Route path="/dashboard/admin" element={<Navigate to={accountPath(getSession(), '/admin/dashboard')} replace />} />
      <Route path="/members/:memberId" element={<Navigate to={accountPath(getSession(), '/cs/dashboard')} replace />} />
      <Route path="/sales" element={<Navigate to={accountPath(getSession(), '/sales/dashboard')} replace />} />
      <Route path="/pt" element={<Navigate to={accountPath(getSession(), '/pt/dashboard')} replace />} />

      <Route path="*" element={<Navigate to="/web" replace />} />
    </Routes>
  );
}
