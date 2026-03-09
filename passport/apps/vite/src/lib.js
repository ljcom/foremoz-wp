export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3600';
export const IS_MOCK_MODE = (import.meta.env.VITE_APP_MODE || '').toLowerCase() === 'mock';
export const IS_MOCKUP_OPEN_ACCESS = String(import.meta.env.VITE_MOCKUP_OPEN_ACCESS || 'false').toLowerCase() === 'true';

const AUTH_KEY = 'fp.auth';

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

export function requireField(value, name) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${name} is required`);
  }
  return String(value).trim();
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
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
