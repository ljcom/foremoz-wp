import settings from './industry-jargon.settings.json';

const DEFAULT_VERTICAL_ORDER = ['fitness', 'sport', 'learning', 'performance', 'arts', 'tourism'];

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeVerticalSlug(value, fallback = 'fitness') {
  const normalized = normalizeSlug(value);
  if (!normalized) return fallback;
  if (normalized === 'active') return 'fitness';
  return normalized;
}

export function getIndustryJargonSettings() {
  return settings;
}

export function listVerticalSlugs() {
  const keys = Object.keys(settings?.verticals || {});
  const ordered = DEFAULT_VERTICAL_ORDER.filter((slug) => keys.includes(slug));
  const rest = keys.filter((slug) => !ordered.includes(slug));
  return [...ordered, ...rest];
}

export function getVerticalConfig(verticalSlug) {
  const slug = normalizeVerticalSlug(verticalSlug);
  const all = settings?.verticals || {};
  return all[slug] || null;
}

export function listVerticalConfigs() {
  return listVerticalSlugs()
    .map((slug) => ({ slug, ...(getVerticalConfig(slug) || {}) }))
    .filter((item) => item.label);
}

export function getVerticalLabel(slug, fallback = 'Fitness') {
  return getVerticalConfig(slug)?.label || fallback;
}

export function findVerticalByLabel(label, fallbackSlug = 'fitness') {
  const normalized = String(label || '').trim().toLowerCase();
  const found = listVerticalConfigs().find((item) => normalizeSlug(item.label) === normalized);
  return found?.slug || normalizeVerticalSlug(fallbackSlug, 'fitness');
}

export function guessVerticalSlugByEventText(eventItem, fallbackSlug = 'fitness') {
  const text = `${eventItem?.event_name || ''} ${eventItem?.location || ''}`.toLowerCase();
  for (const item of listVerticalConfigs()) {
    const labelToken = String(item.label || '').toLowerCase();
    const experienceTypes = Array.isArray(item.experience_types) ? item.experience_types : [];
    if (labelToken && text.includes(labelToken)) return item.slug;
    if (experienceTypes.some((type) => text.includes(String(type).toLowerCase()))) return item.slug;
  }
  return normalizeVerticalSlug(fallbackSlug, 'fitness');
}

export function guessVerticalSlugByText(value, fallbackSlug = 'fitness') {
  const text = String(value || '').toLowerCase();
  if (!text) return normalizeVerticalSlug(fallbackSlug, 'fitness');
  for (const item of listVerticalConfigs()) {
    const labelToken = String(item.label || '').toLowerCase();
    const experienceTypes = Array.isArray(item.experience_types) ? item.experience_types : [];
    if (labelToken && text.includes(labelToken)) return item.slug;
    if (experienceTypes.some((type) => text.includes(String(type).toLowerCase()))) return item.slug;
  }
  return normalizeVerticalSlug(fallbackSlug, 'fitness');
}

export function describeVerticalByJargon(slug) {
  const config = getVerticalConfig(slug);
  if (!config) return '';
  const creator = config?.vocabulary?.creator || 'Creator';
  const participant = config?.vocabulary?.participant || 'Participant';
  const experience = config?.vocabulary?.experience || 'Experience';
  const place = config?.vocabulary?.place || 'Place';
  return `${creator} menjalankan ${experience} untuk ${participant} di ${place} dengan pola ${config.participation_pattern}.`;
}
