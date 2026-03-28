import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, '../.env');

dotenv.config({ path: envPath });

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

export const config = {
  port: Number(process.env.PORT || 3500),
  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: parseBoolean(process.env.DB_SSL, false),
  defaultTenantId: process.env.DEFAULT_TENANT_ID || 'tn_001',
  defaultActorId: process.env.DEFAULT_ACTOR_ID || 'passport_system',
  eventGenesisPrevHash: process.env.EVENT_GENESIS_PREV_HASH || 'GENESIS',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}
