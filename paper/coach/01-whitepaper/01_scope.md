# Foremoz Coach Whitepaper v0.2 - Scope

## Objective

Foremoz Coach berfokus pada dua hal:
- growth funnel coach melalui micro-site `coach.foremoz.com`
- operasional eksekusi kelas/subscription setelah member join

## In Scope

- coach public micro-site dan profile publishing.
- shareable campaign links untuk WhatsApp/Instagram/TikTok.
- class list dan package list by location/studio.
- direct subscribe flow dari micro-site.
- class join flow dari micro-site.
- invitation workflow:
  - `coach invite member`
  - `coach invite studio`
  - `studio invite coach`
  - `member invite friend`
- attribution tracking by source/channel/content.
- support team feature untuk registrasi ulang di lokasi (higher service tier).
- packaging komersial bertingkat dengan free tier minimum yang selalu tersedia.

## Domain Model Emphasis

- domain utama: `coach.foremoz.com`.
- member tetap memakai identity layer passport di backend user model.
- dokumen ini tidak membahas detail passport product secara mendalam.
- surface yang overlap dengan fitness tetap diakses dari domain coach agar pengalaman dimulai dari coach POV.

## RBAC Canonical Terms (Aligned with Fitness)

- `owner`
- `admin`
- `sales`
- `cs`
- `pt` (canonical role untuk coach practitioner/partner coach)
- `member`
- `gov`

Terminologi implementasi:
- gunakan `pt`, bukan istilah role baru `partner`.
- gunakan `cs` untuk peran administratif/frontdesk/support team.

## Canonical URL Map

- `coach.foremoz.com/`
- `coach.foremoz.com/<coach_handle>`
- `coach.foremoz.com/<coach_handle>/classes`
- `coach.foremoz.com/<coach_handle>/locations`
- `coach.foremoz.com/<coach_handle>/subscribe`
- `coach.foremoz.com/<coach_handle>/join/<class_slug>`
- `coach.foremoz.com/<coach_handle>/team`
- `coach.foremoz.com/signin`
- `coach.foremoz.com/workspace`
- `coach.foremoz.com/a/<account>`
- `coach.foremoz.com/a/<account>/dashboard/pt`

## Multi-tenant and Branch Model

- namespace: `foremoz:coach:<tenant_id>`
- chain: `branch:<branch_id>` atau `core`

## Out of Scope

- payroll.
- inventory/warehouse.
- deep accounting.
- heavy CRM automation.
- marketplace aggregator lintas platform.
