-- Foremoz Active v0.3 sample read model schema (Postgres)

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

CREATE TABLE IF NOT EXISTS rm_payment_history (
  tenant_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, payment_id)
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

CREATE TABLE IF NOT EXISTS rm_public_account_profile (
  tenant_id TEXT NOT NULL,
  account_slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  headline TEXT,
  hero_image_url TEXT,
  cta_signup_url TEXT,
  cta_signin_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, account_slug)
);

CREATE TABLE IF NOT EXISTS rm_sales_prospect (
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  prospect_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT NOT NULL,
  stage TEXT NOT NULL,
  owner_sales_id TEXT,
  last_followup_at TIMESTAMPTZ,
  converted_member_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, prospect_id)
);

CREATE TABLE IF NOT EXISTS rm_pt_activity_log (
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  activity_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  trainer_id TEXT,
  note TEXT,
  session_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, activity_id)
);

CREATE TABLE IF NOT EXISTS rm_member_self_booking (
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  booking_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, booking_id)
);

CREATE TABLE IF NOT EXISTS rm_tenant_performance (
  tenant_id TEXT NOT NULL,
  performance_date DATE NOT NULL,
  mrr_amount NUMERIC(14,2) NOT NULL,
  active_member_count INTEGER NOT NULL,
  checkin_30d_count INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, performance_date)
);

CREATE TABLE IF NOT EXISTS rm_tenant_policy (
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_monthly NUMERIC(14,2) NOT NULL,
  free_months_granted INTEGER NOT NULL DEFAULT 0,
  promotion_code TEXT,
  promotion_active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_rm_sales_prospect_stage
  ON rm_sales_prospect (tenant_id, stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rm_pt_activity_member
  ON rm_pt_activity_log (tenant_id, member_id, session_at DESC);

CREATE INDEX IF NOT EXISTS idx_rm_member_self_booking_member
  ON rm_member_self_booking (tenant_id, member_id, status, booked_at DESC);

CREATE INDEX IF NOT EXISTS idx_rm_tenant_performance_date
  ON rm_tenant_performance (performance_date DESC);
