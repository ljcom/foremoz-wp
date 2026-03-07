create schema if not exists read;

create table if not exists read.rm_tourism_event (
  tenant_id text not null,
  event_id text not null,
  title text not null,
  capacity integer not null default 0,
  start_at timestamptz,
  updated_at timestamptz not null,
  primary key (tenant_id, event_id)
);

create table if not exists read.rm_checkpoint (
  projector_name text not null,
  namespace_id text not null,
  chain_id text not null,
  last_sequence bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (projector_name, namespace_id, chain_id)
);
