# Foremoz Fitness Whitepaper v0.3 - Architecture

## Purpose

Menetapkan arsitektur runtime untuk public surface, role workspace, dan control surface di atas EventDB.

## High-Level Architecture

```text
[Web Surfaces]
  /web
  /web/owner
  /a/<account>
  /gov
       |
       v
[Role Workspaces]
  admin | sales | pt | member | gov
       |
       v
[Gym API]
  - tenant/member auth split
  - role guard
  - command validation
  - append event
  - read model query
       |
       v
[EventDB Write Layer]
  namespace: foremoz:fitness:<tenant_id>
  chain: branch:<branch_id> | core
       |
       v
[Projector]
  - consume in-order by namespace + chain
  - update read model
  - persist rm_checkpoint
       |
       v
[Postgres Read Model]
  rm_member
  rm_subscription_active
  rm_payment_queue
  rm_payment_history
  rm_sales_prospect
  rm_pt_activity_log
  rm_tenant_performance
  rm_tenant_policy
```

## Auth and Routing Rules

- tenant signin di `/signin` untuk `admin`, `sales`, `pt`, `gov`.
- member signin di `/a/<account>/member/signin` untuk `member`.
- admin yang belum setup tenant diarahkan ke `/web/owner`.
- owner setup menulis tenant config (`tenant_id`, `branch_id`, `account_slug`) lalu mengaktifkan namespace/chain session.

## Namespace and Chain Convention

- namespace format: `foremoz:fitness:<tenant_id>`
- chain format: `branch:<branch_id>` atau `core`

## Projection Checkpoint Strategy

Table: `rm_checkpoint`

Fields:
- `projector_name`
- `namespace`
- `chain`
- `last_event_id`
- `last_event_ts`
- `updated_at`

Rules:
- process event berurutan per namespace+chain.
- update read model dan checkpoint dalam satu transaksi.
- restart projector lanjut dari checkpoint.

## Booking Concurrency Rule

- command `class.booking.created` hanya valid bila slot tersedia.
- projection menghitung `rm_class_availability` dari stream booking.
- race ditangani oleh deterministic rejection pada command path.
