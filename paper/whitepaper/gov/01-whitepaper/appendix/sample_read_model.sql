CREATE TABLE IF NOT EXISTS rm_gov_tenant_policy (
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_monthly NUMERIC(18,2),
  promotion_code TEXT,
  promotion_active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id)
);

CREATE TABLE IF NOT EXISTS rm_gov_income_summary (
  period DATE NOT NULL,
  gross_income NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_income NUMERIC(18,2) NOT NULL DEFAULT 0,
  active_tenant_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (period)
);

CREATE TABLE IF NOT EXISTS rm_gov_audit_log (
  audit_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  reason TEXT,
  approved_by TEXT,
  event_ts TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (audit_id)
);
