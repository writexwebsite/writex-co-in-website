begin;

alter table client_sessions
  add column if not exists client_reference text,
  add column if not exists client_display_name text,
  add column if not exists verification_reference text,
  add column if not exists verified_at timestamptz,
  add column if not exists idle_expires_at timestamptz,
  add column if not exists absolute_expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revocation_reason text,
  add column if not exists last_rotated_at timestamptz not null default now();

create unique index if not exists client_sessions_token_hash_idx
  on client_sessions(session_token_hash);
create index if not exists client_sessions_invoice_active_idx
  on client_sessions(invoice_id, expires_at desc)
  where revoked_at is null;

create table if not exists client_access_controls (
  invoice_id text primary key,
  client_reference text,
  access_status text not null default 'enabled',
  disabled_reason text,
  disabled_at timestamptz,
  disabled_by_admin_user_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (access_status in ('enabled', 'disabled'))
);

create table if not exists client_login_attempts (
  id uuid primary key default gen_random_uuid(),
  input_fingerprint text not null,
  ip_hash text not null,
  succeeded boolean not null,
  failure_reason text,
  correlation_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists client_login_attempts_fingerprint_created_idx
  on client_login_attempts(input_fingerprint, created_at desc);
create index if not exists client_login_attempts_ip_created_idx
  on client_login_attempts(ip_hash, created_at desc);

create table if not exists client_portal_audit (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_reference text,
  invoice_id text,
  action text not null,
  result text not null,
  correlation_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (actor_type in ('client', 'admin', 'system')),
  check (result in ('success', 'denied', 'unavailable', 'failed'))
);
create index if not exists client_portal_audit_invoice_created_idx
  on client_portal_audit(invoice_id, created_at desc);

create table if not exists client_status_overrides (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  mode text not null default 'automatic',
  public_stage text,
  approved_public_message text,
  public_deadline timestamptz,
  override_reason text,
  expires_at timestamptz,
  created_by_admin_user_id uuid not null references admin_users(id) on delete restrict,
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  reverted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mode in ('automatic', 'manual', 'frozen'))
);
create unique index if not exists client_status_overrides_active_invoice_idx
  on client_status_overrides(invoice_id)
  where reverted_at is null;

create table if not exists client_provider_health (
  provider text primary key,
  mode text not null,
  status text not null,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  checked_at timestamptz not null default now(),
  safe_details jsonb not null default '{}'::jsonb,
  check (provider in ('lts_client_auth', 'lts_billing', 'pmt_project', 'pmt_deliverables')),
  check (mode in ('live', 'unavailable')),
  check (status in ('healthy', 'unavailable', 'degraded', 'unknown'))
);

create table if not exists trust_verification_references (
  id uuid primary key default gen_random_uuid(),
  verification_reference text not null unique,
  verification_type text not null,
  invoice_id text,
  result text not null,
  masked_input text not null,
  correlation_id text not null,
  data_source text not null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (verification_type in ('client_login', 'invoice', 'payment', 'representative', 'project', 'delivery')),
  check (result in ('verified', 'not_verified', 'unavailable'))
);
create index if not exists trust_verification_references_invoice_idx
  on trust_verification_references(invoice_id, verified_at desc);

drop trigger if exists set_client_access_controls_updated_at
  on client_access_controls;
create trigger set_client_access_controls_updated_at
before update on client_access_controls
for each row execute function set_updated_at();

drop trigger if exists set_client_status_overrides_updated_at
  on client_status_overrides;
create trigger set_client_status_overrides_updated_at
before update on client_status_overrides
for each row execute function set_updated_at();

commit;
