# Foremoz Fitness Whitepaper v0.1 - Read Model

## Purpose

Define query-first read model tables required by operational screens. Write operations remain event-only in EventDB; projections maintain these tables.

## Read Model Definitions

### rm_member

- Primary key: `(tenant_id, member_id)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `member_id`
  - `full_name`
  - `phone`
  - `status`
  - `registered_at`
  - `updated_at`
- Typical query use:
  - Member list/search by branch.
  - Member profile header.

### rm_subscription_active

- Primary key: `(tenant_id, subscription_id)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `subscription_id`
  - `member_id`
  - `plan_id`
  - `status`
  - `start_date`
  - `end_date`
  - `freeze_until`
  - `updated_at`
- Typical query use:
  - Active subscription check for check-in eligibility.
  - Expiry monitoring.

### rm_attendance_daily

- Primary key: `(tenant_id, branch_id, attendance_date)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `attendance_date`
  - `total_checkin`
  - `unique_member_count`
  - `updated_at`
- Typical query use:
  - Daily attendance dashboard card.
  - Branch attendance trend.

### rm_class_availability

- Primary key: `(tenant_id, class_id)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `class_id`
  - `class_name`
  - `start_at`
  - `end_at`
  - `capacity`
  - `booked_count`
  - `available_slots`
  - `updated_at`
- Typical query use:
  - Booking screen capacity indicator.
  - Upcoming class availability.

### rm_booking_list

- Primary key: `(tenant_id, booking_id)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `booking_id`
  - `class_id`
  - `booking_kind`
  - `member_id`
  - `guest_name`
  - `status`
  - `booked_at`
  - `canceled_at`
  - `attendance_confirmed_at`
  - `updated_at`
- Typical query use:
  - Class roster view.
  - Booking audit trail for operations desk.

### rm_pt_balance

- Primary key: `(tenant_id, pt_package_id)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `pt_package_id`
  - `member_id`
  - `trainer_id`
  - `total_sessions`
  - `consumed_sessions`
  - `remaining_sessions`
  - `last_session_at`
  - `updated_at`
- Typical query use:
  - PT balance panel in member detail.
  - PT session consumption report.

### rm_payment_queue

- Primary key: `(tenant_id, payment_id)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `payment_id`
  - `member_id`
  - `subscription_id`
  - `amount`
  - `currency`
  - `method`
  - `proof_url`
  - `status` (`pending`, `confirmed`, `rejected`)
  - `recorded_at`
  - `reviewed_at`
  - `reviewed_by`
  - `updated_at`
- Typical query use:
  - Payment confirmation queue.
  - Daily payment status recap.

### rm_dashboard (optional)

- Primary key: `(tenant_id, branch_id, dashboard_date)`
- Columns:
  - `tenant_id`
  - `branch_id`
  - `dashboard_date`
  - `active_subscription_count`
  - `today_checkin_count`
  - `today_booking_count`
  - `pending_payment_count`
  - `updated_at`
- Typical query use:
  - Fast daily overview without joining multiple tables.

## Projection Execution Notes

- projector subscribes per namespace + chain.
- Each event updates one or more read model tables.
- `rm_checkpoint` persists last processed event offset.
- Projection handlers must be idempotent for replay safety.

See `appendix/sample_read_model.sql` for a minimal Postgres schema.
