# Whitepaper Alignment - Passport

## Applied

- Multi-subscription member model.
- Personal performance logs (diet/weight/muscle/workout).
- Consent grant/revoke model.
- Coach shared view filtered by consent.
- Freemium pricing baseline.
- Namespace tetap `foremoz:passport:<tenant_id>` sesuai whitepaper Passport terbaru (identity layer terpisah dari Active runtime).
- Actor profile registry lintas role (`member`, `coach`, `studio`) via `rm_actor_profile`.

## Next Build Tasks

- implement passport API commands/events.
- implement consent-aware projection ordering.
- implement member privacy controls in web app.
- connect premium insights features to pricing plans.
