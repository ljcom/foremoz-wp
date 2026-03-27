# Foremoz Passport Whitepaper v0.1 - Scope

## Objective

Foremoz Passport berfokus pada actor identity universal sebagai:
- identity owner,
- multi-role account (creator/participant/host),
- pemilik history dan reputation portable,
- dan pengendali izin data sharing.

## In Scope

- passport onboarding dan profile lifecycle.
- role activation per context event/operational scope.
- multi-join event di berbagai lokasi/vertical.
- multi-subscription ke creator/host.
- personal tracking:
  - diet
  - body weight
  - muscle/body composition
  - workout log
  - performance milestones
- privacy controls:
- grant consent ke actor lain
  - revoke consent
  - consent per category
- consent-aware data presentation di operating workspace.
- freemium packaging (free default + premium personal features opsional).

## Canonical URL Map

- `foremoz.com/events` (event hub + identity creation entry)
- `passport.foremoz.com/<account>`
- `passport.foremoz.com/<account>/signin`
- `passport.foremoz.com/<account>/profile`
- `passport.foremoz.com/<account>/roles`
- `passport.foremoz.com/<account>/history`
- `passport.foremoz.com/<account>/reputation`
- `passport.foremoz.com/<account>/privacy`
- `passport.foremoz.com/<account>/consents`

## Multi-tenant and Branch Model

- namespace: `foremoz:passport:<tenant_id>`
- chain: `branch:<branch_id>` atau `core`

## Out of Scope

- payroll.
- inventory/warehouse.
- deep accounting.
- heavy CRM automation.
- marketplace aggregator lintas platform.
