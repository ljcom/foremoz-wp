export const APP_TIME_ZONE = 'Asia/Jakarta';
export const APP_TIME_ZONE_LABEL = 'WIB';

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE
});

export function formatAppDateTime(value, options = {}) {
  const { fallback = '-', withZone = true } = options;
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const text = dateTimeFormatter.format(date);
  return withZone ? `${text} ${APP_TIME_ZONE_LABEL}` : text;
}
