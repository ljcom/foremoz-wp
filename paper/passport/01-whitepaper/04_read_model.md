# Foremoz Passport Whitepaper v0.1 - Read Model

## Core Read Models

- `rm_passport_profile`
- `rm_passport_subscriptions`
- `rm_passport_performance_log`
- `rm_passport_milestone`
- `rm_passport_consent`
- `rm_coach_shared_view`
- `rm_passport_network`

## Read Model Definitions

### rm_passport_profile

- PK: `(tenant_id, passport_id)`
- Query use: profile member, interests, dan status identity.

### rm_passport_subscriptions

- PK: `(tenant_id, subscription_id)`
- Query use: portfolio subscription lintas coach dan studio.

### rm_passport_performance_log

- PK: `(tenant_id, metric_log_id)`
- Query use: histori metric personal (diet/weight/muscle/workout).

Columns minimum:
- `tenant_id`
- `metric_log_id`
- `passport_id`
- `metric_category` (`diet|weight|muscle|workout`)
- `metric_value_json`
- `measured_at`
- `created_at`

### rm_passport_milestone

- PK: `(tenant_id, milestone_id)`
- Query use: pencapaian personal dan progress timeline.

### rm_passport_consent

- PK: `(tenant_id, consent_id)`
- Query use: state izin sharing data ke coach.

Columns minimum:
- `tenant_id`
- `consent_id`
- `passport_id`
- `coach_id`
- `metric_categories`
- `status` (`active|revoked`)
- `granted_at`
- `revoked_at`
- `updated_at`

### rm_coach_shared_view

- PK: `(tenant_id, passport_id, coach_id, metric_category)`
- Query use: data performa yang memang boleh dilihat coach.

Rule:
- hanya menampilkan category yang consent-nya `active`.

### rm_passport_network

- PK: `(tenant_id, relation_id)`
- Query use: relasi aktif participant dengan creator/host.

## Projection Notes

- projector subscribe by namespace + chain.
- handler wajib idempotent.
- read model adalah query source, bukan source of truth.
- consent projection diproses sebelum update `rm_coach_shared_view`.
