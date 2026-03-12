import { IS_MOCK_MODE, IS_MOCKUP_OPEN_ACCESS } from './lib.js';

function normalizeBaseUrl(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/+$/, '');
  if (raw.startsWith('/')) return raw.replace(/\/+$/, '');
  if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(raw)) return `http://${raw}`;
  return `https://${raw}`;
}

export const PASSPORT_API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_PASSPORT_API_BASE_URL, 'http://localhost:3600');
export const FOREMOZ_API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, 'http://localhost:3310');

const PASSPORT_AUTH_KEY = 'fp.auth';

export function getPassportSession() {
  try {
    return JSON.parse(localStorage.getItem(PASSPORT_AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setPassportSession(session) {
  localStorage.setItem(PASSPORT_AUTH_KEY, JSON.stringify(session));
}

export function clearPassportSession() {
  localStorage.removeItem(PASSPORT_AUTH_KEY);
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function requirePassportField(value, name) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${name} is required`);
  }
  return String(value).trim();
}

export async function passportApiJson(path, options = {}) {
  const response = await fetch(`${PASSPORT_API_BASE_URL}${path}`, {
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

export async function foremozApiJson(path, options = {}) {
  const response = await fetch(`${FOREMOZ_API_BASE_URL}${path}`, {
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

export function isPassportMockOpen() {
  return IS_MOCK_MODE && IS_MOCKUP_OPEN_ACCESS;
}
