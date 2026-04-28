import { getBackendShellConfig } from '../config/app-config.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const SHELL_CONFIG = getBackendShellConfig();
const SHELL_COPY = SHELL_CONFIG.copy || {};
const SHELL_NAV_ITEMS = Array.isArray(SHELL_CONFIG.navItems) ? SHELL_CONFIG.navItems : [];
const WORKSPACE_ENV_SWITCHER = ['admin', 'cs', 'pt', 'sales'];

function shellCopy(key, fallback = '') {
  return String(SHELL_COPY[key] || fallback || '');
}

export default function BackendWorkspaceShell({
  children,
  eyebrow,
  title,
  subtitle,
  session,
  role,
  userName,
  activeNavId = 'dashboard',
  allowedEnv = [],
  targetEnv = '',
  getEnvironmentLabel,
  onSelectEnv,
  onSignOut,
  navItems,
  primaryActions = null
}) {
  const displayName = userName || session?.user?.fullName || session?.user?.email || role || '-';
  const resolvedNavItems = Array.isArray(navItems) && navItems.length > 0 ? navItems : SHELL_NAV_ITEMS;

  return (
    <main className="backend-shell">
      <aside className="backend-sidebar">
        <div className="backend-sidebar-brand">{shellCopy('brand', 'Foremoz')}</div>
        <div className="backend-sidebar-title-row">
          <h1 className="backend-sidebar-title">{title}</h1>
          <div className="backend-title-env-switcher" aria-label={shellCopy('environmentAria', 'Workspace environment switcher')}>
            {WORKSPACE_ENV_SWITCHER.map((env) => (
              <button
                className={`backend-title-env-btn ${targetEnv === env ? 'active' : ''}`}
                disabled={!allowedEnv.includes(env)}
                key={env}
                type="button"
                onClick={() => onSelectEnv?.(env)}
              >
                {env}
              </button>
            ))}
            <a className={`backend-title-env-btn ${targetEnv === 'host' ? 'active' : ''}`} href="/host/owner">host</a>
          </div>
        </div>
        <nav className="backend-sidebar-nav" aria-label={shellCopy('navigationAria', 'Workspace navigation')}>
          {resolvedNavItems.map((item) => (
            <a
              key={item.id}
              className={item.id === activeNavId ? 'active' : ''}
              href={item.href || `#${item.id}`}
              onClick={item.onClick}
            >
              {item.label || item.id}
            </a>
          ))}
        </nav>
        <div className="backend-sidebar-user">
          <p>{shellCopy('signedInAs', 'Signed in as')}</p>
          <strong>{displayName}</strong>
          <small>{role}</small>
          {onSignOut ? (
            <button className="btn ghost small" type="button" onClick={onSignOut}>
              {shellCopy('signOut', 'Sign out')}
            </button>
          ) : null}
        </div>
      </aside>

      <section className="backend-main">
        <header className="backend-topbar">
          <div className="backend-topbar-actions">
            <LanguageSwitcher compact />
            {primaryActions ? <div className="backend-primary-actions">{primaryActions}</div> : null}
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
