# Foremoz Fitness Implementation Workspace

Repository ini mengimplementasikan vertical `fitness` berdasarkan whitepaper di `paper/fitness`.

## Domain

- Runtime app: `fitness.foremoz.com`
- Coach identity entry: `coach.foremoz.com` (lihat `coach-foremoz`)
- Passport identity entry: `passport.foremoz.com` (lihat `passport-foremoz`)

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

Model pricing mengikuti whitepaper `paper/fitness/01-whitepaper/07_pricing.md`:
- free tier wajib tersedia.
- tier progression: free -> starter -> growth -> multi-branch -> enterprise.
