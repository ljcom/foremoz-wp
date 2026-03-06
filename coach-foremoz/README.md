# Foremoz Coach Implementation Workspace

Repository ini adalah baseline implementasi `coach.foremoz.com` berdasarkan whitepaper `paper/coach`.

## Product Goal

Coach-first growth and operations:
- microsite promosi coach.
- share ke WhatsApp/Instagram/TikTok.
- direct subscribe/join class by location.
- support team operations untuk service tier tinggi.

## Canonical RBAC (Aligned with Fitness)

- `owner`
- `admin`
- `sales`
- `cs`
- `pt` (partner coach dipetakan ke `pt`)
- `member`
- `gov`

## Applied Artifacts

- projection manifest: `apps/eventdb-custom-json/coach-projection.manifest.json`
- read model definition: `apps/eventdb-custom-json/coach-read-model.definition.json`
- postgres schema baseline: `apps/eventdb-custom-json/coach-read-model.postgres.sql`

## Pricing Direction

Pricing mengikuti `paper/coach/01-whitepaper/07_pricing.md` dengan free tier permanen.
