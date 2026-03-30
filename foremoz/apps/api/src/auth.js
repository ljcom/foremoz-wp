import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { config } from './config.js';

const scryptAsync = promisify(crypto.scrypt);

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function parseJwtPart(token, index, partName) {
  const part = token.split('.')[index] || '';
  if (!part) {
    throw new Error(`JWT ${partName} is missing`);
  }
  return part;
}

function signHs256(input, secret) {
  return crypto.createHmac('sha256', secret).update(input).digest();
}

function safeBufferEqual(left, right) {
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function normalizeEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return normalized;
  if (!/^[^\s@]+@[^\s@]+$/.test(normalized)) {
    throw new Error('email format is invalid');
  }
  return normalized;
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

function signJwt(payload) {
  const headerJson = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const payloadJson = JSON.stringify(payload);
  const header = base64UrlEncode(headerJson);
  const body = base64UrlEncode(payloadJson);
  const signingInput = `${header}.${body}`;
  const signature = base64UrlEncode(signHs256(signingInput, config.jwtSecret));
  return `${signingInput}.${signature}`;
}

function verifyJwt(token) {
  const headerPart = parseJwtPart(token, 0, 'header');
  const payloadPart = parseJwtPart(token, 1, 'payload');
  const signaturePart = parseJwtPart(token, 2, 'signature');

  const header = JSON.parse(base64UrlDecode(headerPart));
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('JWT algorithm is not supported');
  }

  const signingInput = `${headerPart}.${payloadPart}`;
  const expectedSig = signHs256(signingInput, config.jwtSecret);
  const actualSig = Buffer.from(
    signaturePart.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );

  if (!safeBufferEqual(expectedSig, actualSig)) {
    throw new Error('JWT signature is invalid');
  }

  const payload = JSON.parse(base64UrlDecode(payloadPart));
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== config.jwtIssuer) {
    throw new Error('JWT issuer mismatch');
  }

  if (payload.aud !== config.jwtAudience) {
    throw new Error('JWT audience mismatch');
  }

  if (payload.exp && now >= Number(payload.exp)) {
    throw new Error('JWT expired');
  }

  return payload;
}

export function signMemberJwt({ tenantId, memberId, email }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: memberId,
    tenant_id: tenantId,
    role: 'member',
    email,
    token_use: 'access',
    iss: config.jwtIssuer,
    aud: config.jwtAudience,
    iat: now,
    exp: now + config.jwtExpiresInSec
  };
  return { token: signJwt(payload), payload };
}

export function signTenantJwt({ tenantId, userId, email, role }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    tenant_id: tenantId,
    role,
    email,
    token_use: 'access',
    iss: config.jwtIssuer,
    aud: config.jwtAudience,
    iat: now,
    exp: now + config.jwtExpiresInSec
  };
  return { token: signJwt(payload), payload };
}

export function signTenantActivationToken({ tenantId, userId, email, role }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    tenant_id: tenantId,
    role,
    email,
    token_use: 'activation',
    iss: config.jwtIssuer,
    aud: config.jwtAudience,
    iat: now,
    exp: now + config.activationTokenExpiresInSec
  };
  return { token: signJwt(payload), payload };
}

export function verifyMemberJwt(token) {
  const payload = verifyJwt(token);

  if (!payload.sub || !payload.tenant_id || payload.role !== 'member') {
    throw new Error('JWT payload is incomplete');
  }

  if (payload.token_use && payload.token_use !== 'access') {
    throw new Error('JWT payload is incomplete');
  }

  return payload;
}

export function verifyTenantJwt(token) {
  const payload = verifyJwt(token);
  if (!payload.sub || !payload.tenant_id || !payload.role || payload.role === 'member') {
    throw new Error('JWT payload is incomplete');
  }
  if (payload.token_use && payload.token_use !== 'access') {
    throw new Error('JWT payload is incomplete');
  }
  return payload;
}

export function verifyTenantActivationToken(token) {
  const payload = verifyJwt(token);
  if (!payload.sub || !payload.tenant_id || !payload.role || payload.role === 'member') {
    throw new Error('activation token payload is incomplete');
  }
  if (payload.token_use !== 'activation') {
    throw new Error('activation token is invalid');
  }
  return payload;
}

export function readBearerToken(req) {
  const raw = req.header('authorization') || '';
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}
