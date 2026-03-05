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
  package_plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id)
);

ALTER TABLE read.rm_owner_setup
  ADD COLUMN IF NOT EXISTS package_plan TEXT NOT NULL DEFAULT 'free';

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
  status TEXT NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  attendance_confirmed_at TIMESTAMPTZ,
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
  last_session_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, pt_package_id)
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
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, payment_id)
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
CREATE INDEX IF NOT EXISTS idx_rm_tenant_user_auth_email ON read.rm_tenant_user_auth (tenant_id, email, role);
CREATE INDEX IF NOT EXISTS idx_rm_tenant_user_auth_status ON read.rm_tenant_user_auth (tenant_id, status, role);
CREATE INDEX IF NOT EXISTS idx_rm_owner_setup_slug ON read.rm_owner_setup (account_slug, status);
CREATE INDEX IF NOT EXISTS idx_rm_subscription_member ON read.rm_subscription_active (tenant_id, member_id, status, end_date);
CREATE INDEX IF NOT EXISTS idx_rm_booking_class ON read.rm_booking_list (tenant_id, class_id, status, booked_at);
CREATE INDEX IF NOT EXISTS idx_rm_payment_status ON read.rm_payment_queue (tenant_id, status, recorded_at);
