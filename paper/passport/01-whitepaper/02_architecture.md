# Foremoz Passport Whitepaper v0.1 - Architecture

## Purpose

Mendefinisikan runtime architecture untuk universal actor identity, personal tracking, dan consent-based data sharing.

## High-Level Architecture

```text
[Member Surface]
  passport.foremoz.com
       |
       v
[Passport Domain Layer]
  identity | subscriptions | performance logs | consent controls
       |
       v
[Passport API]
  - auth + role guard
  - command validation
  - append event
  - read model query
       |
       v
[EventDB Write Layer]
  namespace: foremoz:passport:<tenant_id>
  chain: branch:<branch_id> | core
       |
       v
[Projector]
  - consume in-order per namespace+chain
  - update read model
  - persist rm_checkpoint
       |
       v
[Postgres Read Model]
  rm_passport_profile
  rm_passport_subscriptions
  rm_passport_performance_log
  rm_passport_milestone
  rm_passport_consent
  rm_coach_shared_view
  rm_passport_network
```

## Auth and Data Access Rules

- signin identity di `passport.foremoz.com/<account>`.
- member adalah owner data performa pribadi.
- creator/coach read access harus lewat `rm_coach_shared_view` yang difilter consent.
- jika consent dicabut, shared view actor langsung menyesuaikan di projection berikutnya.

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
- event diproses berurutan per namespace+chain.
- update read model + checkpoint dalam satu transaksi.
- restart projector lanjut dari checkpoint.

## Concurrency Rules

- `class.booking.created` valid hanya jika slot tersedia.
- `subscription.created` idempotent by `subscription_id`.
- `performance.metric.logged` idempotent by `metric_log_id`.
- `consent.granted` / `consent.revoked` deterministik by `(passport_id, coach_id, metric_category)`.
