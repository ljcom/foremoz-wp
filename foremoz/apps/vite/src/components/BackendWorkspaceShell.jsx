import { useState } from 'react';
import { getBackendShellConfig } from '../config/app-config.js';
import BackendSidebarSettings from './BackendSidebarSettings.jsx';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = userName || session?.user?.fullName || session?.user?.email || role || '-';
  const resolvedNavItems = Array.isArray(navItems) && navItems.length > 0 ? navItems : SHELL_NAV_ITEMS;

  return (
    <main className={`backend-shell ${mobileMenuOpen ? 'backend-mobile-menu-open' : ''}`}>
      <button
        className="backend-mobile-menu-btn"
        type="button"
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(true)}
      >
        <i className="fa-solid fa-bars" aria-hidden="true" />
      </button>
      {mobileMenuOpen ? (
        <button
          className="backend-mobile-sidebar-backdrop"
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}
      <aside className="backend-sidebar">
        <div className="backend-sidebar-brand">{shellCopy('brand', 'Foremoz')}</div>
        <div className="backend-sidebar-title-row">
          <h1 className="backend-sidebar-title">{title}</h1>
          <div
            aria-label={shellCopy('environmentAria', 'Workspace environment switcher')}
            className="backend-title-env-menu"
          >
            <button className="backend-title-env-trigger" type="button" aria-haspopup="menu">
              &gt;
            </button>
            <div className="backend-title-env-popover" role="menu">
              {WORKSPACE_ENV_SWITCHER.map((env) => (
                <button
                  className={`backend-title-env-option ${targetEnv === env ? 'active' : ''}`}
                  disabled={!allowedEnv.includes(env)}
                  key={env}
                  type="button"
                  onClick={() => {
                    onSelectEnv?.(env);
                    setMobileMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  {env}
                </button>
              ))}
              <a className={`backend-title-env-option ${targetEnv === 'host' ? 'active' : ''}`} href="/host/owner" role="menuitem">host</a>
            </div>
          </div>
        </div>
        <nav className="backend-sidebar-nav" aria-label={shellCopy('navigationAria', 'Workspace navigation')}>
          {resolvedNavItems.map((item) => (
            <a
              key={item.id}
              className={item.id === activeNavId ? 'active' : ''}
              href={item.href || `#${item.id}`}
              onClick={(event) => {
                item.onClick?.(event);
                setMobileMenuOpen(false);
              }}
            >
              {item.label || item.id}
            </a>
          ))}
        </nav>
        <div className="backend-sidebar-user">
          <p>{shellCopy('signedInAs', 'Signed in as')}</p>
          <strong>{displayName}</strong>
          <small>{role}</small>
          <div className="backend-sidebar-user-actions">
            <BackendSidebarSettings />
            {onSignOut ? (
              <button className="btn ghost small" type="button" onClick={onSignOut}>
                {shellCopy('signOut', 'Sign out')}
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="backend-main">
        {primaryActions ? (
          <header className="backend-topbar">
            <div className="backend-topbar-actions">
              <div className="backend-primary-actions">{primaryActions}</div>
            </div>
          </header>
        ) : null}

        {children}
      </section>
    </main>
  );
}
