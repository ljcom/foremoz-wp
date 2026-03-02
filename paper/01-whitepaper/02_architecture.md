# Foremoz Fitness Whitepaper v0.1 - Architecture

## Purpose

Define the minimal production architecture for fitness center operations using EventDB as write layer and projection-driven read model queries.

## High-Level Architecture

```text
[PWA Frontend]
    |
    v
[Gym API]
  - command validation
  - idempotency checks
  - append events
    |
    v
[EventDB]
  namespace: foremoz:fitness:<tenant_id>
  chain: branch:<branch_id> | core
    |
    v
[Projector Workers]
  - subscribe by namespace + chain
  - process events in order
  - upsert read model tables
  - persist checkpoint
    |
    v
[Postgres Read Model]
  rm_member
  rm_subscription_active
  rm_attendance_daily
  rm_class_availability
  rm_booking_list
  rm_pt_balance
  rm_payment_queue
```

## Namespace and Chain Conventions

- namespace format: `foremoz:fitness:<tenant_id>`
- chain format:
  - `branch:<branch_id>` for branch operations.
  - `core` for tenant-wide or non-branch-specific events.

Rules:
- API write path must always include namespace.
- Branch-bound commands must resolve to a branch chain.
- Read model rows include tenant and branch dimensions where relevant.

## Components

- PWA frontend:
  - staff-facing operations for member, booking, check-in, PT session, and payment confirmation.
- Gym API:
  - validates command preconditions.
  - appends immutable events to EventDB.
- EventDB:
  - write-optimized append-only event store.
- Projector:
  - event subscribers that materialize query-focused read model tables.
- Read models:
  - Postgres tables/views optimized for screen reads and operational reports.

## Projection Checkpoint Strategy

Use `rm_checkpoint` per projector and stream partition.

Suggested structure:
- `projector_name` (PK segment)
- `namespace` (PK segment)
- `chain` (PK segment)
- `last_event_id`
- `last_event_ts`
- `updated_at`

Execution rules:
- Process events in order per namespace + chain.
- Upsert read model rows in one transaction.
- Commit checkpoint in the same transaction as read model updates.
- On restart, continue from `last_event_id`.

## Booking Capacity Concurrency Notes

Simple operational rule set:
- Capacity decision is made against read model snapshot plus short revalidation.
- API appends `class.booking.created` only when effective booked count < capacity.
- Projector recomputes `rm_class_availability` from immutable booking events.
- If two requests race, one may be rejected at append/revalidation stage.
- No distributed lock is required in v0.1; keep deterministic conflict handling and clear staff feedback.
