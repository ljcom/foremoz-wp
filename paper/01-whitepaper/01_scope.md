# Foremoz Fitness Whitepaper v0.3 - Scope

## Objective

Foremoz Fitness berfokus pada operasi fitness center end-to-end:
- membership
- booking
- PT session
- attendance
- payment recording/confirmation
- owner setup
- sales CRM pipeline operasional
- member self-service
- gov cross-tenant control

## In Scope

- membership lifecycle.
- class booking + capacity rules.
- PT session package + PT activity logging.
- attendance logging (QR/manual).
- payment queue + payment history.
- owner page operations (`/web/owner`): tenant setup namespace/chain, perpanjang SaaS, user access.
- role workspaces: `admin`, `sales`, `pt`, `member`, `gov`.
- public web/account surfaces (`/web`, `/a/<account>`).
- member self-service (`/a/<account>/member/*`).
- sales CRM pipeline (prospect create/update/follow-up/conversion).
- gov policy operations (suspend/free/price/promotion).

## Canonical URL Map

- `/web`
- `/web/owner`
- `/a/<account>`
- `/a/<account>/member`
- `/a/<account>/member/signup`
- `/a/<account>/member/signin`
- `/a/<account>/member/portal`
- `/a/<account>/dashboard`
- `/a/<account>/admin`
- `/a/<account>/sales`
- `/a/<account>/dashboard/pt`
- `/gov`

## Multi-tenant and Branch Model

- namespace: `foremoz:fitness:<tenant_id>`
- chain: `branch:<branch_id>` atau `core`

Tenant terisolasi oleh namespace. Operasi branch terpisah by chain.
Konfigurasi namespace/chain dilakukan di owner page (`/web/owner`), bukan onboarding terpisah.

## Out of Scope

- heavy ERP modules.
- payroll.
- inventory/warehouse.
- marketplace aggregation.
- deep accounting.
- complex marketing automation.

CRM pada scope ini bersifat operasional pipeline ringan, bukan automation suite enterprise.
