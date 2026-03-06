CREATE SCHEMA IF NOT EXISTS read;

CREATE TABLE IF NOT EXISTS read.rm_checkpoint (
  projector_name TEXT NOT NULL,
  namespace_id TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  last_sequence BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (projector_name, namespace_id, chain_id)
);

CREATE TABLE IF NOT EXISTS read.rm_coach_profile_public (
  tenant_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  coach_handle TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, coach_id)
);

CREATE TABLE IF NOT EXISTS read.rm_coach_offer_catalog (
  tenant_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  offer_name TEXT NOT NULL,
  price_amount NUMERIC(14,2),
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, offer_id)
);

CREATE TABLE IF NOT EXISTS read.rm_location_class_list (
  tenant_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  studio_id TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  booked_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, class_id)
);

CREATE TABLE IF NOT EXISTS read.rm_subscription_funnel (
  tenant_id TEXT NOT NULL,
  funnel_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  share_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  subscribe_count INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, funnel_id)
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

CREATE TABLE IF NOT EXISTS read.rm_support_team (
  tenant_id TEXT NOT NULL,
  team_member_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  location_scope JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, team_member_id)
);

CREATE TABLE IF NOT EXISTS read.rm_coach_performance (
  tenant_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  performance_date DATE NOT NULL,
  new_subscriber_count INTEGER NOT NULL DEFAULT 0,
  class_occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  retention_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, coach_id, performance_date)
);

CREATE TABLE IF NOT EXISTS read.rm_pricing_plan_state (
  tenant_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  plan_status TEXT NOT NULL,
  effective_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, coach_id)
);
