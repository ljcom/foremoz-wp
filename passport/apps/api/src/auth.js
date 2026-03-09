import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

function safeBufferEqual(left, right) {
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, encodedHash) {
  const [scheme, salt, expected] = String(encodedHash || '').split('$');
  if (scheme !== 'scrypt' || !salt || !expected) {
    return false;
  }
  const derived = await scryptAsync(password, salt, 64);
  return safeBufferEqual(Buffer.from(expected, 'hex'), Buffer.from(derived));
}
