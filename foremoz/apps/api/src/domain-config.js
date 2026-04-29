import { readFileSync } from 'node:fs';

const domainConfig = JSON.parse(
  readFileSync(new URL('../config/domain.json', import.meta.url), 'utf8')
);

function asStringArray(value, path) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${path} must be a non-empty string array`);
  }
  return value.map((item) => item.trim().toLowerCase());
}

function asString(value, path) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    throw new Error(`${path} must be configured`);
  }
  return normalized;
}

function buildClassBookingPolicy(config) {
  const rawPolicy = config.class_booking || {};
  return {
    status: {
      default: asString(rawPolicy.status?.default, 'class_booking.status.default'),
      active: asStringArray(rawPolicy.status?.active, 'class_booking.status.active'),
      canceled: asString(rawPolicy.status?.canceled, 'class_booking.status.canceled'),
      creationAllowed: asStringArray(rawPolicy.status?.creation_allowed, 'class_booking.status.creation_allowed')
    },
    activeUntil: {
      completionColumns: asStringArray(
        rawPolicy.active_until?.completion_columns,
        'class_booking.active_until.completion_columns'
      )
    }
  };
}

export const classBookingPolicy = buildClassBookingPolicy(domainConfig);
