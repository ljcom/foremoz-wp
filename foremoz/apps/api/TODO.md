# TODO foremoz-core-api

## AGENTS.md Adoption
- [x] Create subproject TODO required by root `AGENTS.md`.
- [ ] Inventory route handlers and services for hardcoded workflow statuses, transitions, role checks, permission keys, notification copy, and module availability rules.
- [ ] Move new workflow/status/permission definitions into JSON config, fixtures, or explicit bootstrap data before wiring endpoint behavior.
- [ ] Keep API logic generic: validate, map, and execute config-defined rules rather than embedding business matrices in handlers.
- [ ] Keep demo or seed data isolated as replaceable fixture/config data.
- [x] Move class booking active/terminal status policy into `config/domain.json`.
- [x] Persist PT program completion performance fields through class booking checkout projection.
- [x] Allow class booking checkout to use check-in event source when read model projection is behind.
- [x] Run `npm run check` after API changes.

## Known Follow-up
- [ ] Add schema validation for workflow, permission, and module config before bootstrapping runtime behavior.
- [ ] Standardize API error/user-facing response codes so display text can be resolved by frontend config/i18n.
