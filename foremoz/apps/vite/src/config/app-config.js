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

export function getWorkspaceAccessConfig() {
  return asObject(appUiConfig.workspaceAccess);
}

export function getRoutePolicy(policyKey) {
  return asObject(asObject(getWorkspaceAccessConfig().routePolicies)[policyKey]);
}

export function getWorkspaceAccessList(policyKey, key) {
  return asArray(getRoutePolicy(policyKey)[key]);
}

export function getWorkspaceAccessValue(policyKey, key) {
  return String(getRoutePolicy(policyKey)[key] || '');
}

export function getWorkspaceConfigList(key, value, fallbackKey = 'default') {
  const accessConfig = getWorkspaceAccessConfig();
  const collection = asObject(accessConfig[key]);
  const normalized = String(value || fallbackKey || '').trim().toLowerCase();
  return asArray(collection[normalized] || collection[fallbackKey] || accessConfig[fallbackKey] || []);
}

export function getWorkspaceConfigMapValue(key, value, fallbackValue = '') {
  const collection = asObject(getWorkspaceAccessConfig()[key]);
  const normalized = String(value || '').trim().toLowerCase();
  return String(collection[normalized] || fallbackValue || normalized);
}

export function normalizeWorkspaceConfigValue(mapKey, value, fallbackValue = '') {
  const accessConfig = getWorkspaceAccessConfig();
  const map = asObject(accessConfig[mapKey]);
  const normalized = String(value || '').trim().toLowerCase();
  return String(map[normalized] || normalized || fallbackValue || '');
}

export function getMappedWorkspacePath(mapKey, value) {
  const accessConfig = getWorkspaceAccessConfig();
  const map = asObject(accessConfig[mapKey]);
  const normalized = String(value || accessConfig.defaultRole || '').trim();
  return String(map[normalized] || map.default || '');
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
