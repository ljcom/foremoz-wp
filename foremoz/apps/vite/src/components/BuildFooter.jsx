import { getAppBuildLabel, getAppBuildTitle } from '../build-info.js';

export default function BuildFooter() {
  return (
    <footer className="app-build-footer" aria-label="Build information">
      <small className="app-build-pill" title={getAppBuildTitle()}>
        {getAppBuildLabel()}
      </small>
    </footer>
  );
}
