# Foremoz Passport Implementation Workspace

Repository ini adalah baseline implementasi `passport.foremoz.com` berdasarkan whitepaper `paper/passport`.

## Product Goal

Member-first identity and personal performance:
- one passport for multi coach/studio subscriptions.
- personal tracking (diet, weight, muscle, workout, milestone).
- consent-first data sharing ke coach.
- actor profile registry lintas role (member/coach/studio).

## Applied Artifacts

- projection manifest: `apps/eventdb-custom-json/passport-projection.manifest.json`
- read model definition: `apps/eventdb-custom-json/passport-read-model.definition.json`
- postgres schema baseline: `apps/eventdb-custom-json/passport-read-model.postgres.sql`

## Pricing Direction

Freemium model (free/plus/pro) dengan free tier permanen untuk fitur inti identity + privacy.
