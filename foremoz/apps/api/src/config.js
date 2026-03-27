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
  jwtIssuer: process.env.JWT_ISSUER || 'foremoz-core-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'foremoz-core-member',
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
  emailSmtpIgnoreTlsErrors: parseBoolean(process.env.EMAIL_SMTP_IGNORE_TLS_ERRORS, false),
  turnstileEnabled: parseBoolean(process.env.TURNSTILE_ENABLED, false),
  turnstileSecretKey: String(process.env.TURNSTILE_SECRET_KEY || '').trim(),
  pexelsApiKey: String(process.env.PEXELS_API_KEY || '').trim(),
  s3UploadEnabled: parseBoolean(process.env.S3_UPLOAD_ENABLED, false),
  s3Region: String(process.env.S3_REGION || '').trim(),
  s3Bucket: String(process.env.S3_BUCKET || '').trim(),
  s3AccessKeyId: String(process.env.S3_ACCESS_KEY_ID || '').trim(),
  s3SecretAccessKey: String(process.env.S3_SECRET_ACCESS_KEY || '').trim(),
  s3Endpoint: String(process.env.S3_ENDPOINT || '').trim(),
  s3PublicBaseUrl: normalizeBaseUrl(process.env.S3_PUBLIC_BASE_URL, ''),
  s3ForcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE, false)
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (config.turnstileEnabled && !config.turnstileSecretKey) {
  throw new Error('TURNSTILE_SECRET_KEY is required when TURNSTILE_ENABLED=true');
}

if (config.s3UploadEnabled) {
  if (!config.s3Region) throw new Error('S3_REGION is required when S3_UPLOAD_ENABLED=true');
  if (!config.s3Bucket) throw new Error('S3_BUCKET is required when S3_UPLOAD_ENABLED=true');
  if (!config.s3AccessKeyId) throw new Error('S3_ACCESS_KEY_ID is required when S3_UPLOAD_ENABLED=true');
  if (!config.s3SecretAccessKey) throw new Error('S3_SECRET_ACCESS_KEY is required when S3_UPLOAD_ENABLED=true');
}
