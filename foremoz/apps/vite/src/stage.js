const DEFAULT_STAGE = 4;

function resolveStageRaw() {
  if (typeof __APP_STAGE__ !== 'undefined') return __APP_STAGE__;
  return import.meta.env?.VITE_STAGE || '';
}

export function getAppStage() {
  const parsed = Number.parseInt(String(resolveStageRaw() || '').trim(), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_STAGE;
  if (parsed < 1) return 1;
  if (parsed > 4) return 4;
  return parsed;
}

export function isAllVerticalsEnabled() {
  return getAppStage() >= 2;
}

export function isPassportEventsEnabled() {
  return getAppStage() >= 3;
}

export function isLanguageEnabled() {
  return getAppStage() >= 4;
}

export function getRootHomePath() {
  const stage = getAppStage();
  if (stage <= 1) return '/fitness';
  if (stage === 2) return '/host';
  return '/events';
}

export function getPublicHomePath() {
  return isPassportEventsEnabled() ? '/events' : '/fitness';
}
