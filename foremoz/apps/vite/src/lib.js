export const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN || 'https://fitness.foremoz.com';
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
