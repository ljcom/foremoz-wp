# Foremoz Fitness Implementation Workspace

Repository ini mengimplementasikan vertical `fitness` berdasarkan whitepaper Active di `paper/industries/active`.

## Domain

- Runtime app: `fitness.foremoz.com`
- Passport identity entry: `passport.foremoz.com` (lihat `passport`)

## Canonical RBAC

- `owner`
- `admin`
- `sales`
- `cs`
- `pt`
- `member`
- `gov` (governance role; bukan public surface di app fitness)

## Applied Whitepaper Artifacts

- projection manifest: `apps/eventdb-custom-json/fitness-projection.manifest.json`
- read model definition: `apps/eventdb-custom-json/fitness-read-model.definition.json`
- read model schema: `apps/eventdb-custom-json/fitness-read-model.postgres.sql`

## Pricing Direction

Model pricing mengikuti whitepaper `paper/industries/active/01-whitepaper/07_pricing.md`:
- free tier wajib tersedia.
- tier progression: free -> starter -> growth -> multi-branch -> enterprise.
