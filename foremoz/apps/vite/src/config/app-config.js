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

export function getAdminPageConfig() {
  return asObject(appUiConfig.adminPage);
}

export function getAdminPageOptions(key) {
  return asArray(getAdminPageConfig()[key]).filter((item) => item && typeof item === 'object' && item.value);
}

export function getAdminPageCopy(key, vars = {}) {
  const template = String(asObject(getAdminPageConfig().placeholders)[key] || '');
  return template.replace(/\{(\w+)\}/g, (_, varKey) => String(vars[varKey] ?? ''));
}

export function getAdminFixture(key) {
  return asArray(asObject(getAdminPageConfig().fixtures)[key]);
}

export function getAdminTabsConfig() {
  return asArray(getAdminPageConfig().tabs).filter((item) => item && typeof item === 'object' && item.id);
}

export function getAdminEventTemplatesConfig() {
  return asArray(getAdminPageConfig().eventTemplates).filter((item) => item && typeof item === 'object' && item.id);
}

export function getAdminEventTemplateConfig(templateId) {
  const normalized = String(templateId || 'custom').trim().toLowerCase();
  const templates = getAdminEventTemplatesConfig();
  return templates.find((item) => item.id === normalized) || templates.find((item) => item.id === 'custom') || null;
}

export function getAdminClassTemplatesConfig() {
  return asArray(getAdminPageConfig().classTemplates).filter((item) => item && typeof item === 'object' && item.id);
}

export function getAdminClassTemplateConfig(templateId) {
  const normalized = String(templateId || 'custom').trim().toLowerCase();
  const templates = getAdminClassTemplatesConfig();
  return templates.find((item) => item.id === normalized) || templates.find((item) => item.id === 'custom') || null;
}

export function getAdminDefaultPackageForm() {
  return { ...asObject(getAdminPageConfig().defaultPackageForm) };
}

export function getAdminPackageTypesConfig() {
  return getAdminPageOptions('packageTypes');
}

export function getAdminPackageTypeConfig(packageType) {
  const normalized = String(packageType || getAdminDefaultPackageForm().package_type || '').trim().toLowerCase();
  const packageTypes = getAdminPackageTypesConfig();
  return packageTypes.find((item) => item.value === normalized) || packageTypes[0] || {};
}

export function getAdminPlanLabel(plan, fallbackLabel = '') {
  const labels = asObject(getAdminPageConfig().planDisplayLabels);
  return String(labels[String(plan || '').trim()] || fallbackLabel || '');
}

export function getAdminEventWorkflowConfig() {
  return asObject(getAdminPageConfig().eventWorkflow);
}

export function getAdminEventWorkflowValue(key, fallbackValue = '') {
  return String(getAdminEventWorkflowConfig()[key] || fallbackValue || '');
}

export function isConfiguredAdminEventPublishedStatus(status) {
  const workflowConfig = getAdminEventWorkflowConfig();
  const normalized = String(status || '').trim().toLowerCase();
  return asArray(workflowConfig.publishedStatuses).includes(normalized);
}

export function getAdminEventStatusLabel(status) {
  const workflowConfig = getAdminEventWorkflowConfig();
  const labels = asObject(workflowConfig.statusLabels);
  const normalized = String(status || workflowConfig.defaultStatus || '').trim().toLowerCase();
  return String(labels[normalized] || normalized).toUpperCase();
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

export function getWorkspaceAccessConfigList(key) {
  return asArray(getWorkspaceAccessConfig()[key]);
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
