import appUiConfig from './app-ui.json';

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getPageErrorBoundaryConfig(variant) {
  const boundaryConfig = asObject(appUiConfig.pageErrorBoundary);
  const defaults = asObject(boundaryConfig.defaults);
  const variants = asObject(boundaryConfig.variants);
  return {
    ...defaults,
    ...asObject(variants[variant])
  };
}

export function getDashboardOrderConfig() {
  return asObject(asObject(appUiConfig.csDashboard).orders);
}

export function getConfiguredOptions(config, key) {
  return asArray(asObject(config)[key]).filter((item) => item && typeof item === 'object' && item.value);
}

export function getConfiguredOption(config, key, value) {
  const options = getConfiguredOptions(config, key);
  return options.find((item) => item.value === value) || options[0] || null;
}

export function normalizeConfiguredOptionValue(config, key, value, fallbackValue) {
  const options = getConfiguredOptions(config, key);
  const raw = String(value || '').trim().toLowerCase();
  const match = options.find((item) => String(item.value || '').toLowerCase() === raw);
  return match?.value || fallbackValue || options[0]?.value || '';
}

export function getConfigCopy(config, key) {
  return String(asObject(asObject(config).copy)[key] || '');
}
