import { getStageLayoutConfig, getStageLayoutMap } from './config/app-config.js';

const STAGE_LAYOUT_CONFIG = getStageLayoutConfig();

function normalizeStage(value, fallbackStage = STAGE_LAYOUT_CONFIG.defaultBuildStage || 4) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  const fallback = Number.parseInt(String(fallbackStage || 4), 10);
  if (!Number.isFinite(parsed)) return Number.isFinite(fallback) ? fallback : 4;
  if (parsed < 1) return 1;
  if (parsed > 4) return 4;
  return parsed;
}

function resolveStageRaw() {
  if (typeof __APP_STAGE__ !== 'undefined') return __APP_STAGE__;
  return import.meta.env?.VITE_STAGE || '';
}

export function getAppStage() {
  return normalizeStage(resolveStageRaw(), STAGE_LAYOUT_CONFIG.defaultBuildStage);
}

export function getAppLayoutStage() {
  const buildStage = getAppStage();
  const layoutStageByBuildStage = getStageLayoutMap('layoutStageByBuildStage');
  return normalizeStage(
    layoutStageByBuildStage[String(buildStage)],
    STAGE_LAYOUT_CONFIG.defaultLayoutStage || buildStage
  );
}

export function isStageFeatureEnabled(featureKey) {
  const minimumLayoutStage = getStageLayoutMap('featureMinimumLayoutStage')[featureKey];
  return getAppLayoutStage() >= normalizeStage(minimumLayoutStage, 4);
}

export function isAllVerticalsEnabled() {
  return isStageFeatureEnabled('allVerticals');
}

export function isPassportEventsEnabled() {
  return isStageFeatureEnabled('passportEvents');
}

export function isLanguageEnabled() {
  return isStageFeatureEnabled('language');
}

export function isHostLandingEnabled() {
  return isStageFeatureEnabled('hostLanding');
}

export function getRootHomePath() {
  const rootHomePathByLayoutStage = getStageLayoutMap('rootHomePathByLayoutStage');
  const layoutStage = getAppLayoutStage();
  return String(rootHomePathByLayoutStage[String(layoutStage)] || rootHomePathByLayoutStage.default || '/events');
}

export function getPublicHomePath() {
  const publicHomePathByFeature = getStageLayoutMap('publicHomePathByFeature');
  return isPassportEventsEnabled()
    ? String(publicHomePathByFeature.passportEvents || publicHomePathByFeature.default || getRootHomePath())
    : String(publicHomePathByFeature.default || getRootHomePath());
}

function resolvePrelaunchRaw() {
  if (typeof __APP_PRELAUNCH__ !== 'undefined') return __APP_PRELAUNCH__;
  return import.meta.env?.VITE_PRELAUNCH || import.meta.env?.PRELAUNCH || '';
}

export function isPrelaunchEnabled() {
  const raw = String(resolvePrelaunchRaw() || '').trim().toLowerCase();
  if (!raw) return Boolean(STAGE_LAYOUT_CONFIG.defaultPrelaunch);
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}
