export const APP_TIME_ZONE = 'Asia/Jakarta';
export const APP_TIME_ZONE_LABEL = 'WIB';

const APP_UTC_OFFSET_HOURS = 7;
const APP_UTC_OFFSET_MINUTES = APP_UTC_OFFSET_HOURS * 60;
const APP_UTC_OFFSET_MS = APP_UTC_OFFSET_MINUTES * 60 * 1000;
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeZone: APP_TIME_ZONE
});

const longDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: APP_TIME_ZONE
});

function normalizeRaw(value) {
  return String(value || '').trim();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function buildAppIso({ year, month, day, hour = 0, minute = 0, second = 0 }) {
  const utcMs = Date.UTC(
    year,
    month - 1,
    day,
    hour - APP_UTC_OFFSET_HOURS,
    minute,
    second
  );
  return new Date(utcMs).toISOString();
}

function toDate(value) {
  const raw = normalizeRaw(value);
  if (!raw) return null;

  const dateMatch = raw.match(DATE_INPUT_PATTERN);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(
      buildAppIso({
        year: Number(year),
        month: Number(month),
        day: Number(day)
      })
    );
  }

  const dateTimeMatch = raw.match(DATETIME_INPUT_PATTERN);
  if (dateTimeMatch && !/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) {
    const [, year, month, day, hour, minute, second = '0'] = dateTimeMatch;
    return new Date(
      buildAppIso({
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: Number(hour),
        minute: Number(minute),
        second: Number(second)
      })
    );
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getAppDateParts(value) {
  const date = toDate(value);
  if (!date) return null;
  const shifted = new Date(date.getTime() + APP_UTC_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds()
  };
}

export function formatAppDateTime(value, options = {}) {
  const { fallback = '-', withZone = true } = options;
  const raw = normalizeRaw(value);
  if (!raw) return fallback;
  const date = toDate(raw);
  if (!date) return raw;
  const text = dateTimeFormatter.format(date);
  return withZone ? `${text} ${APP_TIME_ZONE_LABEL}` : text;
}

export function formatAppDate(value, options = {}) {
  const { fallback = '-' } = options;
  const raw = normalizeRaw(value);
  if (!raw) return fallback;
  const date = toDate(raw);
  if (!date) return raw;
  return dateFormatter.format(date);
}

export function formatAppLongDate(value, options = {}) {
  const { fallback = '-' } = options;
  const raw = normalizeRaw(value);
  if (!raw) return fallback;
  const date = toDate(raw);
  if (!date) return raw;
  return longDateFormatter.format(date);
}

export function getAppDateTimeInputValue(value) {
  const parts = getAppDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function getAppDateInputValue(value) {
  const parts = getAppDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function getAppNowDateTimeInput() {
  return getAppDateTimeInputValue(new Date().toISOString());
}

export function getAppTodayDateInput() {
  return getAppDateInputValue(new Date().toISOString());
}

export function getAppDateKey(value) {
  return getAppDateInputValue(value);
}

export function toAppIsoFromDateTimeInput(value) {
  const raw = normalizeRaw(value);
  if (!raw) return null;
  const match = raw.match(DATETIME_INPUT_PATTERN);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0'] = match;
  return buildAppIso({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second)
  });
}

export function toAppIsoFromDateInput(value) {
  const raw = normalizeRaw(value);
  if (!raw) return null;
  const match = raw.match(DATE_INPUT_PATTERN);
  if (!match) return null;
  const [, year, month, day] = match;
  return buildAppIso({
    year: Number(year),
    month: Number(month),
    day: Number(day)
  });
}
