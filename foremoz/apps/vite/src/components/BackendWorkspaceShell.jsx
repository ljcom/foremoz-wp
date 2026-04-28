import { getBackendShellConfig } from '../config/app-config.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const SHELL_CONFIG = getBackendShellConfig();
const SHELL_COPY = SHELL_CONFIG.copy || {};
const SHELL_NAV_ITEMS = Array.isArray(SHELL_CONFIG.navItems) ? SHELL_CONFIG.navItems : [];

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
  primaryActions = null
}) {
  const displayName = userName || session?.user?.fullName || session?.user?.email || role || '-';

  return (
    <main className="backend-shell">
      <aside className="backend-sidebar">
        <div className="backend-sidebar-brand">{shellCopy('brand', 'Foremoz')}</div>
        <nav className="backend-sidebar-nav" aria-label={shellCopy('navigationAria', 'Workspace navigation')}>
          {SHELL_NAV_ITEMS.map((item) => (
            <a key={item.id} className={item.id === activeNavId ? 'active' : ''} href={item.href || `#${item.id}`}>
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
          <div>
            <p className="eyebrow">{eyebrow || shellCopy('topbarEyebrow', 'Foremoz Admin')}</p>
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <div className="backend-topbar-actions">
            {allowedEnv.length > 0 ? (
              <div className="backend-env-switcher" aria-label={shellCopy('environmentAria', 'Workspace environment switcher')}>
                {allowedEnv.map((env) => (
                  <button
                    className={`btn ghost small ${targetEnv === env ? 'active' : ''}`}
                    key={env}
                    type="button"
                    onClick={() => onSelectEnv?.(env)}
                  >
                    {getEnvironmentLabel?.(env) || env}
                  </button>
                ))}
              </div>
            ) : null}
            <LanguageSwitcher compact />
            {primaryActions ? <div className="backend-primary-actions">{primaryActions}</div> : null}
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
