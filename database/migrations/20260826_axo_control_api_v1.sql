create table if not exists axo_api_idempotency (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  operation_id text not null,
  actor_subject text not null,
  idempotency_key text not null,
  request_hash text not null,
  state text not null check (state in ('IN_PROGRESS', 'COMPLETED')),
  response_status integer,
  response_body jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_name, actor_subject, idempotency_key)
);

create index if not exists axo_api_idempotency_expiry_idx
  on axo_api_idempotency (expires_at);

create table if not exists axo_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  endpoint_url text not null,
  event_types text[] not null,
  secret_encrypted text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_by_subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists axo_webhook_subscriptions_service_status_idx
  on axo_webhook_subscriptions (service_name, status);

create table if not exists axo_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references axo_webhook_subscriptions(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null check (status in ('PENDING', 'DELIVERED', 'FAILED', 'DEAD_LETTER')),
  attempt_count integer not null default 0,
  response_status integer,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, event_id)
);

create index if not exists axo_webhook_deliveries_retry_idx
  on axo_webhook_deliveries (status, next_attempt_at);

insert into schema_migrations (migration_name)
values ('20260826_axo_control_api_v1')
on conflict (migration_name) do nothing;
