# TODO foremoz-core-web

## AGENTS.md Adoption
- [x] Create subproject TODO required by root `AGENTS.md`.
- [x] Add initial JSON config for page error-boundary copy and CS order/payment options.
- [x] Move workspace route policies, role/env access, environment labels, admin tabs, and plan aliases into JSON config.
- [x] Move AdminPage tab definitions, plan labels, duration units, weekdays, and activity validity/usage option lists into JSON config.
- [x] Move AdminPage event publish/draft workflow statuses and display status labels into JSON config.
- [x] Move AdminPage environment navigation path mapping to shared workspace config.
- [x] Move AdminPage event template wizard cards and form defaults into JSON config.
- [x] Move AdminPage class/program template wizard cards and form defaults into JSON config.
- [x] Move AdminPage package type options, package form defaults, and package type field behavior into JSON config.
- [x] Move AdminPage user role, registration field type, product category, and transaction filter/payment select options into JSON config.
- [x] Move workspace switcher environment list into shared workspace config.
- [x] Move AdminPage duration mode, usage mode, and SaaS extension month options into JSON config.
- [ ] Inventory current UI surfaces that still define labels, navigation, tabs, statuses, actions, empty states, or copy directly in components.
- [ ] Define or extend JSON config for navigation, page layouts, table columns, forms, badge variants, workflow actions, and empty states before adding new UI.
- [ ] Keep renderers generic: components should receive config and context instead of owning business-specific arrays or rules.
- [ ] Keep visual choices on design tokens, semantic variants, CSS variables, or Tailwind presets instead of raw one-off styling inside components.
- [ ] Run `npm run build` after frontend changes that touch application behavior or config loading.

## Known Follow-up
- [ ] Continue migrating remaining admin/detail page copy into the existing i18n/config layer.
- [ ] Add validation for JSON config shape before rendering config-driven pages.
