export const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN || 'https://foremoz.com';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3300';
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
  const plan = String(value || '').trim().toLowerCase();
  if (plan === 'basic') return 'starter';
  if (plan === 'pro') return 'growth';
  return plan;
}

export function getSessionPackagePlan(session) {
  const setup = getOwnerSetup();
  const sessionTenantId = session?.tenant?.id;
  const setupPlan = setup?.tenant_id && sessionTenantId && setup.tenant_id === sessionTenantId
    ? setup.package_plan
    : '';
  const plan = normalizePackagePlan(session?.tenant?.package_plan || session?.tenant?.packagePlan || setupPlan);
  return plan || 'starter';
}

export function isFreeSinglePlan(session) {
  return getSessionPackagePlan(session) === 'free';
}

export function getAllowedEnvironments(session, roleInput) {
  const role = String(roleInput || session?.role || 'admin').toLowerCase();
  const plan = getSessionPackagePlan(session);

  const planAllowed = (() => {
    if (plan === 'free') return ['admin'];
    if (plan === 'starter') return ['admin', 'cs'];
    if (plan === 'growth' || plan === 'multi_branch' || plan === 'enterprise') {
      return ['admin', 'cs', 'pt', 'sales'];
    }
    return ['admin', 'cs', 'pt', 'sales'];
  })();

  const roleAllowed = (() => {
    if (role === 'owner' || role === 'admin') return ['admin', 'cs', 'pt', 'sales'];
    if (role === 'cs') return ['cs'];
    if (role === 'pt') return ['pt'];
    if (role === 'sales') return ['sales'];
    return [];
  })();

  return roleAllowed.filter((env) => planAllowed.includes(env));
}

export function getAdminTabsByPlan(session) {
  const plan = getSessionPackagePlan(session);
  if (plan === 'free') return ['event', 'member'];
  if (plan === 'starter') return ['event', 'class', 'product', 'member', 'transaction'];
  if (plan === 'growth' || plan === 'multi_branch' || plan === 'enterprise') {
    return ['event', 'class', 'product', 'package_creation', 'trainer', 'sales', 'member', 'transaction'];
  }
  return ['event', 'class', 'product', 'package_creation', 'trainer', 'sales', 'member', 'transaction'];
}

export function requireField(value, name) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${name} is required`);
  }
  return String(value).trim();
}

export function getAccountSlug(session) {
  return session?.tenant?.account_slug || session?.tenant?.id || 'foremoz-gym';
}

export function accountPath(session, suffix) {
  return `/a/${getAccountSlug(session)}${suffix}`;
}

export async function apiJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'FAIL') {
    throw new Error(payload.message || `request failed: ${response.status}`);
  }

  return payload;
}
