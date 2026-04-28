import appUiConfig from './app-ui.json';

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function interpolateConfigValue(value, vars = {}) {
  if (Array.isArray(value)) {
    return value.map((item) => interpolateConfigValue(item, vars));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateConfigValue(item, vars)])
    );
  }
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (_, varKey) => String(vars[varKey] ?? ''));
}

function requireConfigObject(config, path) {
  const value = path.split('.').reduce((current, key) => asObject(current)[key], config);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid app-ui config: ${path} must be an object`);
  }
  return value;
}

function requireConfigArray(config, path) {
  const value = path.split('.').reduce((current, key) => asObject(current)[key], config);
  if (!Array.isArray(value)) {
    throw new Error(`Invalid app-ui config: ${path} must be an array`);
  }
  return value;
}

function requireConfigOptionArray(config, path, keyName = 'value') {
  const options = requireConfigArray(config, path);
  options.forEach((item, index) => {
    if (!item || typeof item !== 'object' || !String(item[keyName] || '').trim()) {
      throw new Error(`Invalid app-ui config: ${path}[${index}] must include ${keyName}`);
    }
  });
}

function requireConfigStringArray(config, path) {
  const options = requireConfigArray(config, path);
  options.forEach((item, index) => {
    if (!String(item || '').trim()) {
      throw new Error(`Invalid app-ui config: ${path}[${index}] must be a non-empty string`);
    }
  });
}

function requireConfigCopy(config, path, keys) {
  const copy = requireConfigObject(config, path);
  keys.forEach((key) => {
    if (!String(copy[key] || '').trim()) {
      throw new Error(`Invalid app-ui config: ${path}.${key} is required`);
    }
  });
}

export function validateAppUiConfig(config = appUiConfig) {
  requireConfigObject(config, 'stageLayout');
  requireConfigObject(config, 'stageLayout.layoutStageByBuildStage');
  requireConfigObject(config, 'stageLayout.rootHomePathByLayoutStage');
  requireConfigObject(config, 'stageLayout.publicHomePathByFeature');
  requireConfigObject(config, 'stageLayout.featureMinimumLayoutStage');
  requireConfigObject(config, 'pageErrorBoundary.defaults');
  requireConfigObject(config, 'pageErrorBoundary.variants');
  requireConfigObject(config, 'backendShell.copy');
  requireConfigObject(config, 'backendShell.navItemsByWorkspace');
  requireConfigObject(config, 'workspaceAccess.routePolicies');
  requireConfigObject(config, 'workspaceAccess.roleHomePaths');
  requireConfigObject(config, 'workspaceAccess.environmentHomePaths');
  requireConfigObject(config, 'workspaceAccess.adminTabsByPlan');
  requireConfigObject(config, 'adminPage.copy');
  requireConfigObject(config, 'adminPage.localizedCopy.id');
  requireConfigObject(config, 'adminPage.localizedCopy.en');
  requireConfigObject(config, 'adminPage.fixtures');
  requireConfigObject(config, 'adminPage.eventWorkflow');
  requireConfigObject(config, 'adminPage.memberUpload');
  requireConfigObject(config, 'csDashboard.orders');
  requireConfigObject(config, 'salesWorkspace.copy');

  [
    'workspaceAccess.workspaceSwitcherEnvironments',
    'workspaceAccess.defaultEnvironments'
  ].forEach((path) => requireConfigStringArray(config, path));

  [
    'adminPage.eventDurationUnits',
    'adminPage.classWeekdays',
    'adminPage.activityValidityUnitOptions',
    'adminPage.activityLimitedDurationUnitOptions',
    'adminPage.activityValidityAnchorOptions',
    'adminPage.activityUsagePeriodOptions',
    'adminPage.durationModeOptions',
    'adminPage.usageModeOptions',
    'adminPage.packageTypes',
    'adminPage.userRoles',
    'adminPage.registrationFieldTypes',
    'adminPage.productCategories',
    'adminPage.transactionStatusFilters',
    'adminPage.transactionLinkFilters',
    'adminPage.transactionCurrencies',
    'adminPage.transactionMethods',
    'adminPage.transactionActions',
    'adminPage.saasExtensionMonths',
    'csDashboard.orders.orderTypes',
    'csDashboard.orders.paymentMethods',
    'csDashboard.orders.settlements',
    'salesWorkspace.stageFilters'
  ].forEach((path) => requireConfigOptionArray(config, path));

  [
    'adminPage.tabs',
    'adminPage.eventTemplates',
    'adminPage.classTemplates',
    'backendShell.navItems',
    'backendShell.navItemsByWorkspace.cs',
    'backendShell.navItemsByWorkspace.sales',
    'backendShell.navItemsByWorkspace.admin',
    'backendShell.navItemsByWorkspace.coach',
    'backendShell.navItemsByWorkspace.host',
    'salesWorkspace.navItems'
  ].forEach((path) => requireConfigOptionArray(config, path, 'id'));

  requireConfigOptionArray(config, 'salesWorkspace.quickGuide', 'text');

  [
    'adminPage.productTableColumns',
    'adminPage.packageTableColumns',
    'adminPage.trainerPackageTableColumns',
    'adminPage.salesMemberTableColumns',
    'adminPage.ptUserTableColumns',
    'adminPage.salesUserTableColumns',
    'adminPage.memberTableColumns',
    'adminPage.transactionTableColumns'
  ].forEach((path) => requireConfigOptionArray(config, path));

  requireConfigCopy(config, 'adminPage.copy', [
    'addNew',
    'backToList',
    'saving',
    'saveEvent',
    'saveProgram',
    'saveTransaction',
    'eventNameRequired',
    'classNameRequired',
    'transactionListTitle',
    'memberUploadEyebrow'
  ]);
  requireConfigCopy(config, 'csDashboard.orders.copy', [
    'orderTypeLabel',
    'targetRequired',
    'pricePositiveRequired',
    'memberRequired',
    'createOrderFailed',
    'orderCreatedFeedback'
  ]);
  requireConfigCopy(config, 'backendShell.copy', [
    'brand',
    'topbarEyebrow',
    'signedInAs',
    'signOut',
    'environmentAria',
    'navigationAria'
  ]);
  requireConfigCopy(config, 'salesWorkspace.copy', [
    'brand',
    'eyebrow',
    'topbarEyebrow',
    'subtitle',
    'signedInAs',
    'signOut',
    'quickGuideEyebrow',
    'prospectPipelineTitle',
    'addProspect',
    'createProspect'
  ]);
}

validateAppUiConfig();

export function getStageLayoutConfig() {
  return asObject(appUiConfig.stageLayout);
}

export function getStageLayoutMap(key) {
  return asObject(getStageLayoutConfig()[key]);
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

export function getBackendShellConfig() {
  return asObject(appUiConfig.backendShell);
}

export function getBackendShellNavItems(workspaceKey) {
  const shellConfig = getBackendShellConfig();
  const navItemsByWorkspace = asObject(shellConfig.navItemsByWorkspace);
  return asArray(navItemsByWorkspace[workspaceKey] || shellConfig.navItems)
    .filter((item) => item && typeof item === 'object' && item.id);
}

export function getSalesWorkspaceConfig() {
  return asObject(appUiConfig.salesWorkspace);
}

export function getAdminPageConfig() {
  return asObject(appUiConfig.adminPage);
}

export function getAdminPageOptions(key) {
  return asArray(getAdminPageConfig()[key]).filter((item) => item && typeof item === 'object' && item.value);
}

export function getAdminPageCopy(key, vars = {}) {
  const config = getAdminPageConfig();
  const template = String(asObject(config.copy)[key] || asObject(config.placeholders)[key] || '');
  return interpolateConfigValue(template, vars);
}

export function getAdminPageObject(key) {
  return asObject(getAdminPageConfig()[key]);
}

export function getAdminLocalizedCopy(language, vars = {}) {
  const copyConfig = asObject(getAdminPageConfig().localizedCopy);
  const normalizedLanguage = String(language || 'id').trim().toLowerCase();
  return interpolateConfigValue(
    asObject(copyConfig[normalizedLanguage] || copyConfig.id),
    vars
  );
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

export function getConfigCopy(config, key, vars = {}) {
  return interpolateConfigValue(String(asObject(asObject(config).copy)[key] || ''), vars);
}
