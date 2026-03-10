# Foremoz Active Whitepaper v0.4 - Scope

## Objective

Foremoz Active memprioritaskan creator-led activity operations berbasis event (`creator -> event -> participant`) untuk fitness + sport.
Institution/gym operations tetap didukung sebagai layer operasional lanjutan sesuai kematangan SaaS package.

## Operating Modes in Active

### Mode 1 - Creator-led Event Mode (Default Entry)

Untuk:
- solo coach
- freelance trainer
- independent organizer
- early-stage creator

Flow utama:
- create event/class/session
- share public link
- collect registrations
- check-in/check-out attendance
- receive payment
- build Passport history and repeat journey
- optional collaboration dengan host/place

### Mode 2 - Institution Operations Mode (Advanced SaaS Layer)

Untuk:
- gym
- fitness studio
- academy
- club
- multi-branch operator

Flow utama:
- member onboarding
- membership/subscription operations
- recurring class and PT operations
- staff/admin role orchestration
- CRM and internal control
- branch and policy management

## In Scope

### A. Creator/Event Surfaces (Primary)

- `passport.foremoz.com/<account>` sebagai universal identity.
- `foremoz.com/active/<account>` sebagai public creator profile surface.
- `foremoz.com/e/<event_slug>` sebagai public event surface.
- optional operating route: `tenant.foremoz.com/a/<account>/events/<event_id>`.

### B. Creator-led Event Operations (Primary)

- event/class/session creation and publication.
- invitation and collaboration flow creator-participant-host.
- public registration/booking.
- attendance logging (QR/manual) untuk check-in/check-out.
- payment recording/confirmation baseline.
- Passport linkage untuk riwayat event, milestone, dan repeat conversion.

### C. Institution Operations (Advanced)

- membership lifecycle: activation, extension, freeze/unfreeze, expiry.
- member portal under tenant.
- admin/sales/pt/gov workspaces.
- owner controls untuk setup namespace/chain dan SaaS extension.
- sales CRM pipeline operasional.
- multi-branch isolation dan branch performance controls.

### D. Active Domain Extensions

- PT package and activity logging.
- tournament/league setup dan match operations.
- team and ranking systems.
- spectator/ticket baseline.

## Narrative Order for Active

Urutan narasi operasional Active:
1. creator-led event flow.
2. creator-participant-host interaction.
3. event promotion and registration.
4. attendance/check-in.
5. monetization loop.
6. optional host collaboration.
7. optional institution operations.
8. membership and CRM as advanced features.
9. multi-branch and gov as later scale layers.

## Canonical Surface Model

Identity:
- `passport.foremoz.com/<account>`

Public creator/event:
- `foremoz.com/active/<account>`
- `foremoz.com/e/<event_slug>`
- optional vanity alias: `<account>.foremoz.com/<event_slug>`

Operating:
- `tenant.foremoz.com/a/<account>`
- `tenant.foremoz.com/a/<account>/events/<event_id>`
- institution mode extensions: dashboard/admin/member/sales/owner routes

## Multi-tenant and Branch Model

- namespace: `foremoz:active:<tenant_id>`
- chain: `branch:<branch_id>` atau `core`

Namespace/chain tetap menjadi fondasi teknis untuk creator mode maupun institution mode.
Perbedaannya bukan di mesin event, tetapi di kedalaman package dan operational surface.

## Out of Scope

- heavy ERP modules.
- payroll.
- inventory/warehouse.
- deep accounting.
- complex marketing automation suite enterprise.
- menjadikan supporting staff sebagai node ekonomi utama jaringan.
