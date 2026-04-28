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
import ActivateAccountPage from './pages/ActivateAccountPage.jsx';
import VerifyPasswordPage from './pages/VerifyPasswordPage.jsx';
import MemberSignUpPage from './pages/MemberSignUpPage.jsx';
import MemberSignInPage from './pages/MemberSignInPage.jsx';
import MemberPortalPage from './pages/MemberPortalPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MemberPage from './pages/MemberPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import SalesProspectNewPage from './pages/SalesProspectNewPage.jsx';
import SalesProspectEditPage from './pages/SalesProspectEditPage.jsx';
import PtPage from './pages/PtPage.jsx';
import PrelaunchPage, { ReadMorePlaceholderPage } from './pages/PrelaunchPage.jsx';
import { accountPath, getAllowedEnvironments, getSession } from './lib.js';
import { getPassportSession } from './passport-client.js';
import BuildFooter from './components/BuildFooter.jsx';
import PageErrorBoundary from './components/PageErrorBoundary.jsx';
import {
  getMappedWorkspacePath,
  getPageErrorBoundaryConfig,
  getRoutePolicy,
  getWorkspaceAccessConfig,
  getWorkspaceAccessList,
  getWorkspaceAccessValue
} from './config/app-config.js';
import { getAppStage, getRootHomePath, isHostLandingEnabled, isPassportEventsEnabled, isPrelaunchEnabled } from './stage.js';

const WORKSPACE_ACCESS_CONFIG = getWorkspaceAccessConfig();

function getSessionRole(session) {
  return session?.role || WORKSPACE_ACCESS_CONFIG.defaultRole || 'admin';
}

function getSessionAccount(session) {
  return session?.tenant?.account_slug || session?.tenant?.id || WORKSPACE_ACCESS_CONFIG.defaultAccount || 'tn_001';
}

function roleHome(session) {
  const rolePath = getMappedWorkspacePath('roleHomePaths', getSessionRole(session));
  return accountPath(session, rolePath);
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session?.isAuthenticated) {
    return <Navigate to={WORKSPACE_ACCESS_CONFIG.signinPath || '/signin'} replace state={{ from: location.pathname }} />;
  }

  return children;
}

function MemberProtectedRoute({ children }) {
  const session = getSession();
  if (!session?.isAuthenticated) {
    return <Navigate to={WORKSPACE_ACCESS_CONFIG.memberSigninPath || '/a/tn_001/member/signin'} replace />;
  }
  return children;
}

function RoleRoute({ policy, roles, children }) {
  const session = getSession();
  const allowedRoles = roles || getWorkspaceAccessList(policy, 'roles');
  if (!allowedRoles.includes(getSessionRole(session))) {
    return <Navigate to={roleHome(session)} replace />;
  }
  return children;
}

function envHomePath(session) {
  const account = getSessionAccount(session);
  const allowed = getAllowedEnvironments(session, getSessionRole(session));
  if (allowed.length === 0) return '';
  const env = allowed[0] || WORKSPACE_ACCESS_CONFIG.defaultRole || 'admin';
  const envPath = getMappedWorkspacePath('environmentHomePaths', env);
  return `/a/${account}${envPath}`;
}

function EnvRoute({ policy, env, children }) {
  const session = getSession();
  const account = getSessionAccount(session);
  const requestedEnv = env || getWorkspaceAccessValue(policy, 'env');
  const allowed = getAllowedEnvironments(session, getSessionRole(session));
  if (!allowed.includes(requestedEnv)) {
    const home = envHomePath(session);
    return <Navigate to={home || `/a/${account}/signin`} replace />;
  }
  return children;
}

function RequireAdminOnboarding({ children }) {
  const session = getSession();
  const role = getSessionRole(session);
  if (role === WORKSPACE_ACCESS_CONFIG.adminOnboardingRole && !session?.isOnboarded) {
    return <Navigate to={WORKSPACE_ACCESS_CONFIG.adminOnboardingPath || '/host/owner'} replace />;
  }
  return children;
}

function OnboardingOnly() {
  return <Navigate to={WORKSPACE_ACCESS_CONFIG.adminOnboardingPath || '/host/owner'} replace />;
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
  if (!isPassportEventsEnabled()) return <Navigate to={getRootHomePath()} replace />;
  const location = useLocation();
  const session = getPassportSession();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  if (!session?.isAuthenticated) {
    return <Navigate to={`${authBase}/signin${location.search || ''}`} replace state={{ from: `${location.pathname}${location.search || ''}` }} />;
  }
  return children;
}

function PassportRequireOnboarding({ children }) {
  if (!isPassportEventsEnabled()) return <Navigate to={getRootHomePath()} replace />;
  const location = useLocation();
  const session = getPassportSession();
  const authBase = location.pathname.startsWith('/passport') ? '/passport' : '/events';
  if (!session?.isAuthenticated) return <Navigate to={`${authBase}/signin`} replace />;
  if (!session?.isOnboarded) return <Navigate to={`${authBase}/onboarding`} replace />;
  return children;
}

function LegacyMemberPortalRedirect() {
  const session = getSession();
  const account = getSessionAccount(session);
  return <Navigate to={`/a/${account}/member/portal`} replace />;
}

function WorkspacePolicy({ policy, children }) {
  const routePolicy = getRoutePolicy(policy);
  return (
    <RoleRoute roles={routePolicy.roles}>
      {routePolicy.env ? <EnvRoute env={routePolicy.env}>{children}</EnvRoute> : children}
    </RoleRoute>
  );
}

export default function App() {
  const location = useLocation();
  const stage = getAppStage();
  const eventsEnabled = isPassportEventsEnabled();
  const prelaunchEnabled = isPrelaunchEnabled();
  const rootHome = getRootHomePath();
  const isPrelaunchDarkRoute =
    prelaunchEnabled && ['/', '/why-foremoz', '/manifesto'].includes(String(location?.pathname || ''));
  const shouldMirrorToStage =
    !prelaunchEnabled &&
    typeof window !== 'undefined' &&
    ['foremoz.com', 'www.foremoz.com'].includes(String(window.location.hostname || '').toLowerCase());

  if (shouldMirrorToStage) {
    const target = `https://stg${stage}.foremoz.com${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (window.location.href !== target) {
      window.location.replace(target);
    }
    return null;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={prelaunchEnabled ? <PrelaunchPage /> : <Navigate to={rootHome} replace />} />
        <Route path="/why-foremoz" element={<ReadMorePlaceholderPage />} />
        <Route path="/manifesto" element={<ReadMorePlaceholderPage />} />
        <Route path="/host" element={isHostLandingEnabled() ? <WebLandingPage /> : <Navigate to="/fitness" replace />} />
        <Route path="/newevent" element={<Navigate to="/host" replace />} />
        <Route path="/web" element={<Navigate to="/host" replace />} />
        <Route path="/events" element={eventsEnabled ? <PassportLandingPage /> : <Navigate to={rootHome} replace />} />
        <Route path="/passport" element={eventsEnabled ? <PassportLandingPage /> : <Navigate to={rootHome} replace />} />
        <Route
          path="/p/:account"
          element={
            eventsEnabled ? (
              <PageErrorBoundary
                {...getPageErrorBoundaryConfig('passportPublic')}
              >
                <PassportPublicPage />
              </PageErrorBoundary>
            ) : <Navigate to={rootHome} replace />
          }
        />
        <Route path="/events/signup" element={eventsEnabled ? <PassportSignUpPage /> : <Navigate to={rootHome} replace />} />
        <Route path="/passport/signup" element={eventsEnabled ? <PassportSignUpPage /> : <Navigate to={rootHome} replace />} />
        <Route path="/events/signin" element={eventsEnabled ? <PassportSignInPage /> : <Navigate to={rootHome} replace />} />
        <Route path="/passport/signin" element={eventsEnabled ? <PassportSignInPage /> : <Navigate to={rootHome} replace />} />
        <Route path="/events/forgot-password" element={eventsEnabled ? <ForgotPasswordPage /> : <Navigate to={rootHome} replace />} />
        <Route path="/passport/forgot-password" element={eventsEnabled ? <ForgotPasswordPage /> : <Navigate to={rootHome} replace />} />
        <Route
          path="/events/register"
          element={
            eventsEnabled ? (
              <PageErrorBoundary
                {...getPageErrorBoundaryConfig('eventCheckout')}
              >
                <EventCheckoutPage />
              </PageErrorBoundary>
            ) : <Navigate to={rootHome} replace />
          }
        />
        <Route
          path="/passport/register"
          element={
            eventsEnabled ? (
              <PageErrorBoundary
                {...getPageErrorBoundaryConfig('eventCheckout')}
              >
                <EventCheckoutPage />
              </PageErrorBoundary>
            ) : <Navigate to={rootHome} replace />
          }
        />
        <Route
          path="/e/:eventId"
          element={
            eventsEnabled ? (
              <PageErrorBoundary
                {...getPageErrorBoundaryConfig('eventCheckout')}
              >
                <EventCheckoutPage />
              </PageErrorBoundary>
            ) : <Navigate to={rootHome} replace />
          }
        />
      <Route
        path="/a/:account/e/:eventId"
        element={
          <PageErrorBoundary
            {...getPageErrorBoundaryConfig('accountEventCheckout')}
          >
            <EventCheckoutPage />
          </PageErrorBoundary>
        }
      />
      <Route path="/a/:account/events" element={<PassportLandingPage />} />
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
                <PageErrorBoundary
                  {...getPageErrorBoundaryConfig('passportDashboard')}
                >
                  <PassportDashboardPage />
                </PageErrorBoundary>
              </PassportRequireOnboarding>
          </PassportProtectedRoute>
        }
      />
      <Route
        path="/passport/dashboard"
        element={
          <PassportProtectedRoute>
              <PassportRequireOnboarding>
                <PageErrorBoundary
                  {...getPageErrorBoundaryConfig('passportDashboard')}
                >
                  <PassportDashboardPage />
                </PageErrorBoundary>
              </PassportRequireOnboarding>
          </PassportProtectedRoute>
        }
      />
      <Route path="/active" element={<Navigate to="/fitness" replace />} />
      <Route path="/fitness" element={<VerticalLandingPage />} />
      <Route path="/sport" element={<VerticalLandingPage />} />
      <Route path="/learning" element={<VerticalLandingPage />} />
      <Route path="/arts" element={<VerticalLandingPage />} />
      <Route path="/tourism" element={<VerticalLandingPage />} />
      <Route path="/performance" element={<VerticalLandingPage />} />
      <Route path="/host/owner" element={<WebOwnerPage />} />
      <Route path="/newevent/owner" element={<Navigate to="/host/owner" replace />} />
      <Route path="/web/owner" element={<Navigate to="/host/owner" replace />} />
      <Route path="/a/:account" element={<AccountPublicPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/verify-password" element={<VerifyPasswordPage />} />
      <Route path="/activate" element={<ActivateAccountPage />} />
      <Route path="/a/:account/member/signup" element={<MemberSignUpPage />} />
      <Route path="/member/signup" element={<Navigate to="/a/tn_001/member/signup" replace />} />
      <Route path="/a/:account/member/signin" element={<MemberSignInPage />} />
      <Route path="/member/signin" element={<Navigate to="/a/tn_001/member/signin" replace />} />
      <Route path="/a/:account/member/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/member/forgot-password" element={<Navigate to="/a/tn_001/member/forgot-password" replace />} />
      <Route path="/a/:account/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/a/:account/signin" element={<SignInPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/onboarding" element={<OnboardingOnly />} />

      <Route
        path="/a/:account/cs/dashboard"
        element={
          <ProtectedRoute>
            <WorkspacePolicy policy="csDashboard">
              <RequireAdminOnboarding>
                <DashboardPage />
              </RequireAdminOnboarding>
            </WorkspacePolicy>
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
            <WorkspacePolicy policy="adminDashboard">
              <RequireAdminOnboarding>
                <AdminPage />
              </RequireAdminOnboarding>
            </WorkspacePolicy>
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
            <WorkspacePolicy policy="memberDetail">
              <RequireAdminOnboarding>
                <MemberPage />
              </RequireAdminOnboarding>
            </WorkspacePolicy>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/dashboard"
        element={
          <ProtectedRoute>
            <WorkspacePolicy policy="salesDashboard">
              <SalesPage />
            </WorkspacePolicy>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/prospects/new"
        element={
          <ProtectedRoute>
            <WorkspacePolicy policy="salesProspectNew">
              <SalesProspectNewPage />
            </WorkspacePolicy>
          </ProtectedRoute>
        }
      />
      <Route
        path="/a/:account/sales/prospects/:prospectId/edit"
        element={
          <ProtectedRoute>
            <WorkspacePolicy policy="salesProspectEdit">
              <SalesProspectEditPage />
            </WorkspacePolicy>
          </ProtectedRoute>
        }
      />
      <Route path="/a/:account/sales" element={<LegacySalesRedirect />} />
      <Route path="/a/:account/dashboard/sales" element={<LegacySalesRedirect />} />
      <Route
        path="/a/:account/pt/dashboard"
        element={
          <ProtectedRoute>
            <WorkspacePolicy policy="ptDashboard">
              <PtPage />
            </WorkspacePolicy>
          </ProtectedRoute>
        }
      />
      <Route path="/a/:account/dashboard/pt" element={<LegacyPtRedirect />} />
      <Route
        path="/a/:account/member"
        element={
          <MemberProtectedRoute>
            <WorkspacePolicy policy="memberPortal">
              <MemberPortalPage />
            </WorkspacePolicy>
          </MemberProtectedRoute>
        }
      />
      <Route
        path="/a/:account/member/portal"
        element={
          <MemberProtectedRoute>
            <WorkspacePolicy policy="memberPortal">
              <MemberPortalPage />
            </WorkspacePolicy>
          </MemberProtectedRoute>
        }
      />
      <Route path="/member/portal" element={<LegacyMemberPortalRedirect />} />

      <Route path="/dashboard" element={<Navigate to={roleHome(getSession())} replace />} />
      <Route path="/dashboard/admin" element={<Navigate to={accountPath(getSession(), '/admin/dashboard')} replace />} />
      <Route path="/members/:memberId" element={<Navigate to={accountPath(getSession(), '/cs/dashboard')} replace />} />
      <Route path="/sales" element={<Navigate to={accountPath(getSession(), '/sales/dashboard')} replace />} />
      <Route path="/pt" element={<Navigate to={accountPath(getSession(), '/pt/dashboard')} replace />} />

      <Route path="*" element={<Navigate to={rootHome} replace />} />
      </Routes>
      <BuildFooter tone={isPrelaunchDarkRoute ? 'dark' : 'default'} />
    </>
  );
}
