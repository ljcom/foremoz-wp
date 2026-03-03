export const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN || 'https://fitness.foremoz.com';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3300';

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
