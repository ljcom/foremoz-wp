-- Draft migration for membership -> activity/open_access unification.
-- This file is intentionally conservative: it updates read-model shape first,
-- then leaves legacy-to-new business mapping as explicit backfill steps to review.

BEGIN;

ALTER TABLE IF EXISTS read.rm_class_availability
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS class_type TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS has_coach BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coach_id TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS capacity_mode TEXT NOT NULL DEFAULT 'limited',
  ADD COLUMN IF NOT EXISTS quota_mode TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS validity_mode TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS usage_mode TEXT NOT NULL DEFAULT 'unlimited',
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER,
  ADD COLUMN IF NOT EXISTS usage_period TEXT,
  ADD COLUMN IF NOT EXISTS validity_unit TEXT,
  ADD COLUMN IF NOT EXISTS validity_value INTEGER,
  ADD COLUMN IF NOT EXISTS validity_anchor TEXT,
  ADD COLUMN IF NOT EXISTS min_quota INTEGER,
  ADD COLUMN IF NOT EXISTS max_quota INTEGER,
  ADD COLUMN IF NOT EXISTS auto_start_when_quota_met BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS read.rm_class_availability
  ALTER COLUMN start_at DROP NOT NULL,
  ALTER COLUMN end_at DROP NOT NULL;

CREATE TABLE IF NOT EXISTS read.rm_activity_enrollment (
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  enrollment_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  class_type TEXT NOT NULL DEFAULT 'scheduled',
  member_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  payment_id TEXT,
  legacy_subscription_id TEXT,
  status TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL,
  activated_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_mode TEXT NOT NULL DEFAULT 'unlimited',
  usage_limit INTEGER,
  usage_period TEXT,
  remaining_usage INTEGER,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_rm_activity_enrollment_member
  ON read.rm_activity_enrollment (tenant_id, member_id, status, valid_until);

CREATE INDEX IF NOT EXISTS idx_rm_activity_enrollment_class
  ON read.rm_activity_enrollment (tenant_id, class_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rm_activity_enrollment_payment
  ON read.rm_activity_enrollment (tenant_id, payment_id);

UPDATE read.rm_class_availability
SET
  title = COALESCE(NULLIF(title, ''), class_name),
  start_date = COALESCE(start_date, start_at::date),
  end_date = COALESCE(end_date, end_at::date),
  max_quota = COALESCE(max_quota, capacity),
  has_coach = COALESCE(has_coach, FALSE);

COMMIT;

-- Review-required backfill notes:
-- 1. Legacy memberships in read.rm_subscription_active should be mapped to
--    master activity rows where class_type = 'open_access'.
-- 2. If plan_id already equals class_id, backfill enrollments with:
--    enrollment_id = subscription_id, class_id = plan_id, class_type = 'open_access'.
-- 3. If plan_id still points to legacy package rows, decide mapping table first
--    before inserting into read.rm_activity_enrollment.
