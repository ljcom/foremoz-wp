import dotenv from 'dotenv';

dotenv.config();

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeBaseUrl(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw.replace(/\/+$/, '');
}

export const config = {
  port: Number(process.env.PORT || 3300),
  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: parseBoolean(process.env.DB_SSL, false),
  defaultTenantId: process.env.DEFAULT_TENANT_ID || 'tn_001',
  defaultActorId: process.env.DEFAULT_ACTOR_ID || 'staff_system',
  passportApiBaseUrl: process.env.PASSPORT_API_BASE_URL || 'http://localhost:3600',
  eventGenesisPrevHash: process.env.EVENT_GENESIS_PREV_HASH || 'GENESIS',
  jwtSecret: process.env.JWT_SECRET || 'dev-change-this-secret',
  jwtIssuer: process.env.JWT_ISSUER || 'foremoz-fitness-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'foremoz-fitness-member',
  jwtExpiresInSec: parseNumber(process.env.JWT_EXPIRES_IN_SEC, 86400),
  activationTokenExpiresInSec: parseNumber(process.env.ACTIVATION_TOKEN_EXPIRES_IN_SEC, 259200),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  appOrigin: normalizeBaseUrl(process.env.APP_ORIGIN, 'http://localhost:5173'),
  emailEnabled: parseBoolean(process.env.EMAIL_ENABLED, false),
  emailFromAddress: String(process.env.EMAIL_FROM_ADDRESS || '').trim(),
  emailFromName: String(process.env.EMAIL_FROM_NAME || 'Foremoz').trim() || 'Foremoz',
  emailReplyTo: String(process.env.EMAIL_REPLY_TO || '').trim(),
  emailSmtpHost: String(process.env.EMAIL_SMTP_HOST || '').trim(),
  emailSmtpPort: parseNumber(process.env.EMAIL_SMTP_PORT, 587),
  emailSmtpSecure: parseBoolean(process.env.EMAIL_SMTP_SECURE, false),
  emailSmtpUser: String(process.env.EMAIL_SMTP_USER || '').trim(),
  emailSmtpPass: String(process.env.EMAIL_SMTP_PASS || '').trim(),
  emailSmtpIgnoreTlsErrors: parseBoolean(process.env.EMAIL_SMTP_IGNORE_TLS_ERRORS, false)
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}
