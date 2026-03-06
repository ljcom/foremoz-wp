export const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN || 'https://coach.foremoz.com';

const AUTH_KEY = 'fc.auth';
const USERS_KEY = 'fc.users';

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

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function requireField(value, name) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${name} is required`);
  }
  return String(value).trim();
}

export function createCoachUser({ fullName, email, password }) {
  const users = readUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('email already registered');
  }

  const user = {
    userId: `coach_${Date.now()}`,
    fullName,
    email: normalizedEmail,
    password,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeUsers(users);
  return user;
}

export function signInCoachUser({ email, password }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = readUsers().find((u) => u.email === normalizedEmail);
  if (!user || user.password !== password) {
    throw new Error('invalid email or password');
  }
  return user;
}

export function coachPath(session, suffix) {
  const handle = session?.coach?.handle || 'coach-demo';
  return `/c/${handle}${suffix}`;
}
