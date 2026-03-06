# Foremoz Gov Whitepaper v0.1 - Architecture

## Purpose

Mendefinisikan architecture untuk platform-wide governance actions dan monitoring.

## High-Level Architecture

```text
[Gov Internal Surface]
  restricted governance dashboard
       |
       v
[Gov Control Layer]
  account intervention | policy override | monitoring | income analytics
       |
       v
[Gov API]
  - privileged auth + role guard
  - approval policy checks
  - command validation
  - append event
  - read model query
       |
       v
[EventDB Write Layer]
  namespace: foremoz:gov:platform
  chain: core
       |
       v
[Projector]
  - consume in-order
  - update read model
  - persist rm_checkpoint
       |
       v
[Postgres Read Model]
  rm_gov_tenant_policy
  rm_gov_account_status
  rm_gov_user_activity
  rm_gov_income_summary
  rm_gov_alert
  rm_gov_audit_log
```

## Auth and Access Rules

- akses hanya untuk role governance terotorisasi.
- high-impact actions membutuhkan approval metadata.
- setiap action wajib menyertakan reason.
- access attempts dan denied actions tetap dicatat untuk audit.

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
- process event berurutan.
- update read model + checkpoint dalam satu transaksi.
- restart projector lanjut dari checkpoint.

## Safety Constraints

- policy override harus reversible lewat event berikutnya.
- destructive controls (suspend/disable) memerlukan explicit reason dan actor attribution.
- read model monitoring tidak boleh dipakai sebagai source of truth write path.
