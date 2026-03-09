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

export const config = {
  port: Number(process.env.PORT || 3300),
  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: parseBoolean(process.env.DB_SSL, false),
  defaultTenantId: process.env.DEFAULT_TENANT_ID || 'tn_001',
  defaultActorId: process.env.DEFAULT_ACTOR_ID || 'staff_system',
  eventGenesisPrevHash: process.env.EVENT_GENESIS_PREV_HASH || 'GENESIS',
  jwtSecret: process.env.JWT_SECRET || 'dev-change-this-secret',
  jwtIssuer: process.env.JWT_ISSUER || 'foremoz-fitness-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'foremoz-fitness-member',
  jwtExpiresInSec: parseNumber(process.env.JWT_EXPIRES_IN_SEC, 86400),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}
