# Foremoz Active Whitepaper v0.3 - Read Model

## Core Read Models

- `rm_member`
- `rm_member_auth`
- `rm_owner_setup`
- `rm_owner_saas`
- `rm_tenant_user_auth`
- `rm_subscription_active`
- `rm_attendance_daily`
- `rm_class_availability`
- `rm_booking_list`
- `rm_pt_balance`
- `rm_payment_queue`
- `rm_dashboard`
- `rm_actor_network`
- `rm_passport_profile`

## Role and Surface Read Models

### rm_member_auth

- PK: `(tenant_id, member_id)`
- Unique key: `(tenant_id, email)`
- Query use: `signin` credential validation dan token subject validation (`/v1/auth/signin`, `/v1/auth/me`).

### rm_public_account_profile

- PK: `(tenant_id, account_slug)`
- Query use: render public account page (`/a/<account>`).

### rm_member_self_booking

- PK: `(tenant_id, booking_id)`
- Query use: member portal booking history.

### rm_payment_history

- PK: `(tenant_id, payment_id)`
- Query use: member page payment history dan member portal payment recap.

### rm_sales_prospect

- PK: `(tenant_id, prospect_id)`
- Query use: sales CRM pipeline/funneling/conversion.

### rm_pt_activity_log

- PK: `(tenant_id, activity_id)`
- Query use: PT workspace activity feed dan member PT timeline.

### rm_tenant_performance

- PK: `(tenant_id, performance_date)`
- Query use: gov console cross-tenant performance.

Columns minimum:
- `tenant_id`
- `performance_date`
- `mrr_amount`
- `active_member_count`
- `checkin_30d_count`
- `updated_at`

### rm_tenant_policy

- PK: `(tenant_id)`
- Query use: gov policy state (suspend/free/price/promotion).

Columns minimum:
- `tenant_id`
- `status` (`active|suspended`)
- `price_monthly`
- `free_months_granted`
- `promotion_code`
- `promotion_active`
- `updated_at`

### rm_actor_network

- PK: `(tenant_id, relation_id)`
- Query use: graph relasi aktif dan pending antara `coach`, `studio`, `member`.

Columns minimum:
- `tenant_id`
- `relation_id`
- `left_actor_kind`
- `left_actor_id`
- `right_actor_kind`
- `right_actor_id`
- `status` (`pending|active|inactive`)
- `source_invitation_id`
- `updated_at`

### rm_passport_profile

- PK: `(tenant_id, passport_id)`
- Query use: identitas olahraga member dan rekam ringkas lintas interaksi.

Columns minimum:
- `tenant_id`
- `passport_id`
- `member_id`
- `sport_interests`
- `training_history_summary`
- `coach_relation_count`
- `studio_relation_count`
- `performance_milestone_count`
- `updated_at`

## Projection Notes

- projector subscribe by namespace + chain.
- handler wajib idempotent.
- `rm_checkpoint` dipakai untuk resume offset.
- read model adalah query source, bukan write source of truth.

Referensi SQL: `appendix/sample_read_model.sql`.
