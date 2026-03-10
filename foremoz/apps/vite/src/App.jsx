import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import WebLandingPage from './pages/WebLandingPage.jsx';
import VerticalLandingPage from './pages/VerticalLandingPage.jsx';
import PassportLandingPage from './pages/PassportLandingPage.jsx';
import PassportSignUpPage from './pages/PassportSignUpPage.jsx';
import PassportSignInPage from './pages/PassportSignInPage.jsx';
import PassportOnboardingPage from './pages/PassportOnboardingPage.jsx';
import PassportDashboardPage from './pages/PassportDashboardPage.jsx';
import PassportPublicPage from './pages/PassportPublicPage.jsx';
import EventCheckoutPage from './pages/EventCheckoutPage.jsx';
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
import { accountPath, getAllowedEnvironments, getSession } from './lib.js';
import { getPassportSession } from './passport-client.js';

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

function envHomePath(session) {
  const account = session?.tenant?.account_slug || session?.tenant?.id || 'tn_001';
  const allowed = getAllowedEnvironments(session, session?.role || 'admin');
  if (allowed.length === 0) return '';
  const env = allowed[0] || 'admin';
  if (env === 'sales') return `/a/${account}/sales/dashboard`;
  if (env === 'pt') return `/a/${account}/pt/dashboard`;
  if (env === 'cs') return `/a/${account}/cs/dashboard`;
  return `/a/${account}/admin/dashboard`;
}

function EnvRoute({ env, children }) {
  const session = getSession();
  const account = session?.tenant?.account_slug || session?.tenant?.id || 'tn_001';
  const allowed = getAllowedEnvironments(session, session?.role || 'admin');
  if (!allowed.includes(env)) {
    const home = envHomePath(session);
    return <Navigate to={home || `/a/${account}/signin`} replace />;
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

function PassportProtectedRoute({ children }) {
  const location = useLocation();
  const session = getPassportSession();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  if (!session?.isAuthenticated) {
    return <Navigate to={`${authBase}/signin`} replace state={{ from: location.pathname }} />;
  }
  return children;
}

function PassportRequireOnboarding({ children }) {
  const location = useLocation();
  const session = getPassportSession();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  if (!session?.isAuthenticated) return <Navigate to={`${authBase}/signin`} replace />;
  if (!session?.isOnboarded) return <Navigate to={`${authBase}/onboarding`} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/web" replace />} />
      <Route path="/web" element={<WebLandingPage />} />
      <Route path="/events" element={<PassportLandingPage />} />
      <Route path="/passport" element={<PassportLandingPage />} />
      <Route path="/p/:account" element={<PassportPublicPage />} />
      <Route path="/events/signup" element={<PassportSignUpPage />} />
      <Route path="/passport/signup" element={<PassportSignUpPage />} />
      <Route path="/events/signin" element={<PassportSignInPage />} />
      <Route path="/passport/signin" element={<PassportSignInPage />} />
      <Route path="/events/register" element={<EventCheckoutPage />} />
      <Route path="/passport/register" element={<EventCheckoutPage />} />
      <Route
        path="/events/onboarding"
        element={
          <PassportProtectedRoute>
            <PassportOnboardingPage />
          </PassportProtectedRoute>
        }
      />
      <Route
        path="/passport/onboarding"
        element={
          <PassportProtectedRoute>
            <PassportOnboardingPage />
          </PassportProtectedRoute>
        }
      />
      <Route
        path="/events/dashboard"
        element={
          <PassportProtectedRoute>
            <PassportRequireOnboarding>
              <PassportDashboardPage />
            </PassportRequireOnboarding>
          </PassportProtectedRoute>
        }
      />
      <Route
        path="/passport/dashboard"
        element={
          <PassportProtectedRoute>
            <PassportRequireOnboarding>
              <PassportDashboardPage />
            </PassportRequireOnboarding>
          </PassportProtectedRoute>
        }
      />
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
              <EnvRoute env="cs">
                <RequireAdminOnboarding>
                  <DashboardPage />
                </RequireAdminOnboarding>
              </EnvRoute>
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
              <EnvRoute env="sales">
                <SalesPage />
              </EnvRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/prospects/new"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['sales', 'admin', 'owner']}>
              <EnvRoute env="sales">
                <SalesProspectNewPage />
              </EnvRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/prospects/:prospectId/edit"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['sales', 'admin', 'owner']}>
              <EnvRoute env="sales">
                <SalesProspectEditPage />
              </EnvRoute>
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
              <EnvRoute env="pt">
                <PtPage />
              </EnvRoute>
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
