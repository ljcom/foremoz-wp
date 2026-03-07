-- Core read model baseline for Foremoz Event OS

create table if not exists rm_event (
  tenant_id text not null,
  event_id text not null,
  title text not null,
  status text not null,
  starts_at timestamptz,
  venue_id text,
  primary key (tenant_id, event_id)
);

create table if not exists rm_participation (
  tenant_id text not null,
  event_id text not null,
  actor_id text not null,
  role text not null,
  status text not null,
  primary key (tenant_id, event_id, actor_id, role)
);
