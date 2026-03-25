CREATE SCHEMA IF NOT EXISTS read;

CREATE TABLE IF NOT EXISTS read.rm_checkpoint (
  projector_name TEXT NOT NULL,
  namespace_id TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  last_sequence BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (projector_name, namespace_id, chain_id)
);

CREATE TABLE IF NOT EXISTS read.rm_member (
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  member_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  status TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, member_id)
);

CREATE TABLE IF NOT EXISTS read.rm_member_auth (
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL,
  password_changed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, member_id),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS read.rm_tenant_user_auth (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, user_id),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS read.rm_owner_setup (
  tenant_id TEXT NOT NULL,
  gym_name TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  account_slug TEXT NOT NULL,
  address TEXT,
  city TEXT,
  photo_url TEXT,
  package_plan TEXT NOT NULL DEFAULT 'free',
  industry_slug TEXT NOT NULL DEFAULT 'active',
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id)
);

CREATE TABLE IF NOT EXISTS read.rm_owner_branch (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  account_slug TEXT NOT NULL,
  address TEXT,
  city TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_rm_owner_branch_account_slug
  ON read.rm_owner_branch ((lower(account_slug)));

ALTER TABLE read.rm_owner_branch
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE read.rm_owner_setup
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS industry_slug TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS read.rm_owner_saas (
  tenant_id TEXT NOT NULL,
  total_months INTEGER NOT NULL DEFAULT 0,
  last_note TEXT,
  last_extended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id)
);

CREATE TABLE IF NOT EXISTS read.rm_subscription_active (
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  subscription_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  payment_id TEXT,
  status TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  freeze_until DATE,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, subscription_id)
);

CREATE TABLE IF NOT EXISTS read.rm_attendance_daily (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  total_checkin INTEGER NOT NULL DEFAULT 0,
  unique_member_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, branch_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS read.rm_class_availability (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  booked_count INTEGER NOT NULL DEFAULT 0,
  available_slots INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, class_id)
);

CREATE TABLE IF NOT EXISTS read.rm_booking_list (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  booking_kind TEXT NOT NULL,
  member_id TEXT,
  guest_name TEXT,
  payment_id TEXT,
  status TEXT NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  attendance_confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, booking_id)
);

CREATE TABLE IF NOT EXISTS read.rm_member_self_booking (
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  booking_type TEXT NOT NULL,
  status TEXT NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, booking_id)
);

CREATE TABLE IF NOT EXISTS read.rm_pt_balance (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  pt_package_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  trainer_id TEXT,
  total_sessions INTEGER NOT NULL,
  consumed_sessions INTEGER NOT NULL DEFAULT 0,
  remaining_sessions INTEGER NOT NULL,
  payment_id TEXT,
  last_session_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, pt_package_id)
);

CREATE TABLE IF NOT EXISTS read.rm_pt_activity_log (
  tenant_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  pt_package_id TEXT,
  member_id TEXT NOT NULL,
  trainer_id TEXT,
  session_id TEXT,
  activity_type TEXT NOT NULL DEFAULT 'activity_logged',
  activity_note TEXT,
  custom_fields JSONB,
  session_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, activity_id)
);

CREATE TABLE IF NOT EXISTS read.rm_payment_queue (
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  payment_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  subscription_id TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  method TEXT NOT NULL,
  proof_url TEXT,
  reference_type TEXT,
  reference_id TEXT,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, payment_id)
);

CREATE TABLE IF NOT EXISTS read.rm_payment_history (
  tenant_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  review_note TEXT,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, payment_id)
);

CREATE TABLE IF NOT EXISTS read.rm_sales_prospect (
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  stage TEXT NOT NULL,
  owner_sales_id TEXT,
  converted_member_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, prospect_id)
);

CREATE TABLE IF NOT EXISTS read.rm_tenant_performance (
  tenant_id TEXT NOT NULL,
  performance_date DATE NOT NULL,
  mrr_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  active_member_count INTEGER NOT NULL DEFAULT 0,
  checkin_30d_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, performance_date)
);

CREATE TABLE IF NOT EXISTS read.rm_tenant_policy (
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price_monthly NUMERIC(14,2),
  free_months_granted INTEGER NOT NULL DEFAULT 0,
  promotion_code TEXT,
  promotion_active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id)
);

CREATE TABLE IF NOT EXISTS read.rm_actor_network (
  tenant_id TEXT NOT NULL,
  relation_id TEXT NOT NULL,
  left_actor_kind TEXT NOT NULL,
  left_actor_id TEXT NOT NULL,
  right_actor_kind TEXT NOT NULL,
  right_actor_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source_invitation_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, relation_id)
);

CREATE TABLE IF NOT EXISTS read.rm_invitation_queue (
  tenant_id TEXT NOT NULL,
  invitation_id TEXT NOT NULL,
  inviter_actor_kind TEXT NOT NULL,
  invitee_actor_kind TEXT NOT NULL,
  target_contact TEXT,
  channel TEXT,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, invitation_id)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_profile (
  tenant_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  sport_interests JSONB,
  training_history_summary JSONB,
  coach_relation_count INTEGER NOT NULL DEFAULT 0,
  studio_relation_count INTEGER NOT NULL DEFAULT 0,
  performance_milestone_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, passport_id)
);

CREATE TABLE IF NOT EXISTS read.rm_dashboard (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  dashboard_date DATE NOT NULL,
  active_subscription_count INTEGER NOT NULL DEFAULT 0,
  today_checkin_count INTEGER NOT NULL DEFAULT 0,
  today_booking_count INTEGER NOT NULL DEFAULT 0,
  pending_payment_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, branch_id, dashboard_date)
);

CREATE INDEX IF NOT EXISTS idx_rm_member_branch ON read.rm_member (tenant_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_rm_member_auth_email ON read.rm_member_auth (tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_rm_subscription_member ON read.rm_subscription_active (tenant_id, member_id, status, end_date);
CREATE INDEX IF NOT EXISTS idx_rm_subscription_payment ON read.rm_subscription_active (tenant_id, payment_id);
CREATE INDEX IF NOT EXISTS idx_rm_booking_class ON read.rm_booking_list (tenant_id, class_id, status, booked_at);
CREATE INDEX IF NOT EXISTS idx_rm_booking_payment ON read.rm_booking_list (tenant_id, payment_id);
CREATE INDEX IF NOT EXISTS idx_rm_payment_status ON read.rm_payment_queue (tenant_id, status, recorded_at);
CREATE INDEX IF NOT EXISTS idx_rm_pt_balance_payment ON read.rm_pt_balance (tenant_id, payment_id);
CREATE INDEX IF NOT EXISTS idx_rm_pt_balance_trainer ON read.rm_pt_balance (tenant_id, trainer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rm_sales_stage ON read.rm_sales_prospect (tenant_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rm_pt_activity_member ON read.rm_pt_activity_log (tenant_id, member_id, session_at DESC);
CREATE INDEX IF NOT EXISTS idx_rm_pt_activity_trainer ON read.rm_pt_activity_log (tenant_id, trainer_id, session_at DESC);
CREATE INDEX IF NOT EXISTS idx_rm_invitation_status ON read.rm_invitation_queue (tenant_id, status, updated_at DESC);
