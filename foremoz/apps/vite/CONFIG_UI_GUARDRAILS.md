# Config UI Guardrails

These guardrails apply before adding or changing UI in this Vite app.

## Config First

- Put navigation, tabs, option lists, workflow states/actions, table columns, empty states, placeholders, and user-facing copy in `src/config/app-ui.json` before wiring a component.
- Add a helper in `src/config/app-config.js` when a component needs to read a new config shape.
- Extend `validateAppUiConfig()` for required new config paths so broken JSON fails early.

## Generic Renderers

- Prefer renderers that receive config plus runtime context instead of owning business-specific arrays in JSX.
- Keep table headers, action visibility, select options, tab definitions, and workflow labels as config collections.
- If a renderer starts branching by tenant/plan/role/entity labels, move that branch data into config and pass the resolved value in.

## Semantic Visuals

- Use existing classes, semantic variants, CSS variables, and table/card/action patterns before adding one-off inline styles.
- New colors, badge tones, action variants, and empty-state visuals should be represented as semantic config values or design tokens.
- Inline styles are acceptable only for existing local layout constraints during migration; avoid using them for reusable visual decisions.
