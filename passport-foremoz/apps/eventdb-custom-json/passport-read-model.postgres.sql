CREATE SCHEMA IF NOT EXISTS read;

CREATE TABLE IF NOT EXISTS read.rm_checkpoint (
  projector_name TEXT NOT NULL,
  namespace_id TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  last_sequence BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (projector_name, namespace_id, chain_id)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_profile (
  tenant_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  full_name TEXT,
  sport_interests JSONB,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, passport_id)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_subscriptions (
  tenant_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  coach_id TEXT,
  studio_id TEXT,
  plan_id TEXT,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, subscription_id)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_performance_log (
  tenant_id TEXT NOT NULL,
  metric_log_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  metric_value_json JSONB NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, metric_log_id)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_milestone (
  tenant_id TEXT NOT NULL,
  milestone_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, milestone_id)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_consent (
  tenant_id TEXT NOT NULL,
  consent_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  metric_categories JSONB NOT NULL,
  status TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, consent_id)
);

CREATE TABLE IF NOT EXISTS read.rm_coach_shared_view (
  tenant_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  latest_metric_value_json JSONB,
  latest_measured_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, passport_id, coach_id, metric_category)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_network (
  tenant_id TEXT NOT NULL,
  relation_id TEXT NOT NULL,
  left_actor_kind TEXT NOT NULL,
  left_actor_id TEXT NOT NULL,
  right_actor_kind TEXT NOT NULL,
  right_actor_id TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, relation_id)
);

CREATE TABLE IF NOT EXISTS read.rm_passport_plan_state (
  tenant_id TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  plan_status TEXT NOT NULL,
  effective_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, passport_id)
);
