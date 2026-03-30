import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function WorkspaceHeader({
  eyebrow,
  title,
  subtitle,
  allowedEnv = [],
  targetEnv = '',
  onSelectEnv,
  getEnvironmentLabel,
  extraActions = null,
  onSignOut = null,
  signOutLabel = 'Sign out'
}) {
  return (
    <header className="dash-head card">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="meta">
        <LanguageSwitcher compact />
        {allowedEnv.length > 0 ? (
          <div className="env-switcher">
            <label className="env-lookup">
              Environment
              <select
                value={targetEnv}
                onChange={(event) => {
                  onSelectEnv?.(event.target.value);
                }}
              >
                {allowedEnv.map((env) => (
                  <option key={env} value={env}>
                    {getEnvironmentLabel?.(env) || env}
                  </option>
                ))}
              </select>
            </label>
            <div className="env-buttons" role="group" aria-label="Environment">
              {allowedEnv.map((env) => (
                <button
                  key={env}
                  type="button"
                  className={`btn ghost small ${targetEnv === env ? 'active' : ''}`}
                  onClick={() => onSelectEnv?.(env)}
                >
                  {getEnvironmentLabel?.(env) || env}
                </button>
              ))}
              {extraActions}
            </div>
          </div>
        ) : null}
        {allowedEnv.length === 0 ? extraActions : null}
        {onSignOut ? (
          <button className="btn ghost" type="button" onClick={onSignOut}>
            {signOutLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
}
