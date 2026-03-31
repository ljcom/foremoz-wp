const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
const APP_STAGE = typeof __APP_STAGE__ !== 'undefined' ? __APP_STAGE__ : '';
const APP_BUILD_AT = typeof __APP_BUILD_AT__ !== 'undefined' ? __APP_BUILD_AT__ : '';
const APP_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

function formatBuildId(buildId) {
  const normalized = String(buildId || '').trim();
  if (!/^\d{14}$/.test(normalized)) return normalized || 'dev';
  return `${normalized.slice(0, 8)}-${normalized.slice(8)}`;
}

export function getAppBuildMeta() {
  return {
    version: APP_VERSION,
    stage: APP_STAGE,
    builtAt: APP_BUILD_AT,
    buildId: APP_BUILD_ID
  };
}

export function getAppBuildLabel() {
  const meta = getAppBuildMeta();
  const parts = [`v${meta.version}`, `build ${formatBuildId(meta.buildId)}`];
  if (meta.stage) parts.push(`stg${meta.stage}`);
  return parts.join(' | ');
}

export function getAppBuildTitle() {
  const meta = getAppBuildMeta();
  return meta.builtAt
    ? `Built at ${meta.builtAt}`
    : 'Build metadata unavailable';
}
