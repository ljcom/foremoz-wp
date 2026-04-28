# Config Migration Inventory

Current inventory for the `AGENTS.md` config-driven UI adoption work.

## High Priority

- `src/pages/WebOwnerPage.jsx`
  - Owner onboarding, package, branch, user access, enterprise request, and image upload flows still define labels, placeholders, feedback, and confirmation copy in the component.
  - Candidate config groups: `ownerPage.copy`, `ownerPage.tabs`, `ownerPage.branchFilters`, `ownerPage.packageActions`, `ownerPage.userAccess`.
- `src/pages/DashboardPage.jsx`
  - CS dashboard/member detail/order/event/program panels still define labels, placeholders, empty states, and validation feedback in the component.
  - Candidate config groups: `csDashboard.copy`, `csDashboard.memberDetail`, `csDashboard.orderForm`, `csDashboard.eventPanel`, `csDashboard.classPanel`.
- `src/pages/SalesPage.jsx`
  - Sales workspace still defines prospect form labels, stage/source options, validation feedback, empty states, and action labels in the component.
  - Candidate config groups: `salesPage.copy`, `salesPage.prospectFields`, `salesPage.stageOptions`, `salesPage.orderForm`.

## Medium Priority

- `src/pages/ActivateAccountPage.jsx`, `src/pages/ForgotPasswordPage.jsx`, `src/pages/SignInPage.jsx`
  - Auth and account recovery flows still define page copy, placeholders, and feedback directly in the components.
- `src/pages/PassportOnboardingPage.jsx`, `src/pages/OnboardingPage.jsx`
  - Setup/onboarding forms still define option lists and explanatory copy directly in components.
- `src/pages/AccountPublicPage.jsx`, `src/pages/LandingPage.jsx`
  - Public/landing copy is still component-owned. Keep as content config before adding new variants.

## Already In Progress

- `src/pages/AdminPage.jsx`
  - Major admin tab definitions, options, table headers, templates, fixtures, workflow statuses, participant copy, localized dashboard copy, member upload/member form copy, transaction copy, SaaS copy, and event/class validation feedback have moved into `src/config/app-ui.json`.
  - Remaining candidates include lower-level helper copy, schedule/category generation text, remaining inline field labels, and detailed view copy.
