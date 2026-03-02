-- Foremoz Fitness v0.1 sample read model schema (Postgres)

CREATE TABLE IF NOT EXISTS rm_checkpoint (
  projector_name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  chain TEXT NOT NULL,
  last_event_id TEXT NOT NULL,
  last_event_ts TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (projector_name, namespace, chain)
);

CREATE TABLE IF NOT EXISTS rm_member (
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

CREATE TABLE IF NOT EXISTS rm_subscription_active (
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

CREATE TABLE IF NOT EXISTS rm_attendance_daily (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  total_checkin INTEGER NOT NULL DEFAULT 0,
  unique_member_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, branch_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS rm_class_availability (
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

CREATE TABLE IF NOT EXISTS rm_booking_list (
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

CREATE TABLE IF NOT EXISTS rm_pt_balance (
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

CREATE TABLE IF NOT EXISTS rm_payment_queue (
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

CREATE TABLE IF NOT EXISTS rm_dashboard (
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

CREATE INDEX IF NOT EXISTS idx_rm_subscription_active_member
  ON rm_subscription_active (tenant_id, member_id, status, end_date);

CREATE INDEX IF NOT EXISTS idx_rm_booking_list_class
  ON rm_booking_list (tenant_id, class_id, status, booked_at);

CREATE INDEX IF NOT EXISTS idx_rm_payment_queue_status
  ON rm_payment_queue (tenant_id, status, recorded_at);
