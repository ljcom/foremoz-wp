# Foremoz Fitness Whitepaper v0.1 - Scope

This section is aligned with `paper/00-admin/PROJECT_SCOPE.md` and duplicated here so the whitepaper package stands alone.

## Objective

Foremoz Fitness is a vertical SaaS for fitness center operations (gym + PT + class booking + membership + attendance + payment recording/confirmation). It is not a marketplace and not a full ERP system.

## In Scope

- Membership lifecycle:
  - Member registration.
  - Plan assignment.
  - Subscription purchase, extension, freeze, unfreeze, expiry handling.
- Attendance management:
  - QR check-in.
  - Manual check-in.
  - Daily attendance logging and reporting.
- Class booking:
  - Class schedule.
  - Capacity management.
  - Member booking.
  - Guest booking.
  - Booking cancellation.
  - Attendance confirmation per class.
- PT session operations:
  - PT package definition.
  - Trainer assignment.
  - PT session usage tracking.
  - Remaining PT session balance.
- Payment recording and confirmation:
  - Manual payment recording.
  - Proof upload.
  - Admin confirmation.
  - Operational revenue visibility.

## Multi-tenant and Branch Model

- namespace: `foremoz:fitness:<tenant_id>`
- chain: `branch:<branch_id>` or `core`

Each tenant is isolated by namespace. Branch-specific operations are separated by chain.

## Deployment and Architecture Boundaries

- PWA-first frontend.
- EventDB write layer.
- projection-based read model.
- No direct mutation-only domain storage.

## Strict Out of Scope

- Heavy ERP modules.
- Payroll.
- Inventory/warehouse.
- Marketplace/discovery.
- CRM automation.
- Deep accounting logic.

If requirements move into broad cross-industry customization, they belong outside Foremoz Fitness vertical scope.
