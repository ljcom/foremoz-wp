import { getAppBuildLabel, getAppBuildTitle } from '../build-info.js';

export default function BuildFooter({ tone = 'default' }) {
  const isDark = tone === 'dark';
  return (
    <footer className={`app-build-footer${isDark ? ' dark' : ''}`} aria-label="Build information">
      <small className="app-build-pill" title={getAppBuildTitle()}>
        {getAppBuildLabel()}
      </small>
    </footer>
  );
}
