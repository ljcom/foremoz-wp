import {
  getWorkspaceAccessConfig,
  getWorkspaceConfigList,
  getWorkspaceConfigMapValue,
  normalizeWorkspaceConfigValue
} from './config/app-config.js';

function normalizeBaseUrl(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/+$/, '');
  if (raw.startsWith('/')) return raw.replace(/\/+$/, '');
  if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(raw)) return `http://${raw}`;
  return `https://${raw}`;
}

export const APP_ORIGIN = normalizeBaseUrl(import.meta.env.VITE_APP_ORIGIN, 'https://foremoz.com');
export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, 'http://localhost:3300');
export const IS_MOCK_MODE = (import.meta.env.VITE_APP_MODE || '').toLowerCase() === 'mock';
export const IS_MOCKUP_OPEN_ACCESS = String(import.meta.env.VITE_MOCKUP_OPEN_ACCESS || 'false').toLowerCase() === 'true';

const AUTH_KEY = 'ff.auth';
const OWNER_SETUP_KEY = 'ff.owner_setup';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function getOwnerSetup() {
  try {
    return JSON.parse(localStorage.getItem(OWNER_SETUP_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setOwnerSetup(payload) {
  localStorage.setItem(OWNER_SETUP_KEY, JSON.stringify(payload));
}

export function normalizePackagePlan(value) {
  return normalizeWorkspaceConfigValue('packagePlanAliases', value);
}

export function getSessionPackagePlan(session) {
  const setup = getOwnerSetup();
  const sessionTenantId = session?.tenant?.id;
  const setupPlan = setup?.tenant_id && sessionTenantId && setup.tenant_id === sessionTenantId
    ? setup.package_plan
    : '';
  const plan = normalizePackagePlan(session?.tenant?.package_plan || session?.tenant?.packagePlan || setupPlan);
  return plan || getWorkspaceAccessConfig().defaultPlan || 'starter';
}

export function isFreeSinglePlan(session) {
  return getSessionPackagePlan(session) === 'free';
}

export function getAllowedEnvironments(session, roleInput) {
  const accessConfig = getWorkspaceAccessConfig();
  const role = String(roleInput || session?.role || accessConfig.defaultRole || 'admin').toLowerCase();
  const plan = getSessionPackagePlan(session);
  const planAllowed = getWorkspaceConfigList('planEnvironments', plan, 'defaultEnvironments');
  const roleAllowed = getWorkspaceConfigList('roleEnvironments', role);

  return roleAllowed.filter((env) => planAllowed.includes(env));
}

export function getEnvironmentLabel(env) {
  const value = String(env || '').trim().toLowerCase();
  return getWorkspaceConfigMapValue('environmentLabels', value, value);
}

export function getAdminTabsByPlan(session) {
  const plan = getSessionPackagePlan(session);
  return getWorkspaceConfigList('adminTabsByPlan', plan);
}

export function requireField(value, name) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${name} is required`);
  }
  return String(value).trim();
}

export function getAccountSlug(session) {
  return session?.tenant?.account_slug || session?.tenant?.id || getWorkspaceAccessConfig().defaultAccount || 'tn_001';
}

export function accountPath(session, suffix) {
  return `/a/${getAccountSlug(session)}${suffix}`;
}

export async function apiJson(path, options = {}) {
  const session = getSession();
  const authToken = String(session?.auth?.accessToken || '').trim();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'FAIL') {
    const error = new Error(payload.message || `request failed: ${response.status}`);
    error.errorCode = payload.error_code || null;
    error.payload = payload;
    throw error;
  }

  return payload;
}
