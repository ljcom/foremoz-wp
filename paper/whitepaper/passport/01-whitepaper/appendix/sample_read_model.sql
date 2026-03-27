CREATE TABLE IF NOT EXISTS rm_passport_performance_log (
  tenant_id TEXT NOT NULL,
  metric_log_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  metric_value_json JSONB NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, metric_log_id)
);

CREATE TABLE IF NOT EXISTS rm_passport_consent (
  tenant_id TEXT NOT NULL,
  consent_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  metric_categories JSONB NOT NULL,
  status TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, consent_id)
);

CREATE TABLE IF NOT EXISTS rm_coach_shared_view (
  tenant_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  latest_metric_value_json JSONB,
  latest_measured_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, passport_id, coach_id, metric_category)
);
