begin;

create table if not exists client_portal_test_access (
  id uuid primary key default gen_random_uuid(),
  test_id text not null unique,
  password_hash text not null,
  test_profile_reference text not null,
  test_invoice_reference text not null,
  expires_at timestamptz not null,
  single_use boolean not null default true,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by_admin_id uuid not null references admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  reason text not null,
  last_used_ip_hash text,
  last_used_at timestamptz,
  check (
    test_profile_reference in (
      'partially_paid',
      'fully_paid',
      'project_in_progress',
      'delivered'
    )
  ),
  check (test_invoice_reference ~ '^WX-TEST-[A-Z0-9][A-Z0-9-]{3,63}$'),
  check (char_length(reason) between 10 and 500),
  check (expires_at > created_at)
);

create unique index if not exists client_portal_test_access_test_id_idx
  on client_portal_test_access(test_id);
create index if not exists client_portal_test_access_expiry_idx
  on client_portal_test_access(expires_at);
create index if not exists client_portal_test_access_active_idx
  on client_portal_test_access(revoked_at, expires_at)
  where revoked_at is null;

create table if not exists client_portal_test_access_events (
  id uuid primary key default gen_random_uuid(),
  test_access_id uuid references client_portal_test_access(id) on delete set null,
  test_id_hash text not null,
  event_type text not null,
  result text not null,
  ip_hash text,
  user_agent_category text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    event_type in (
      'generated',
      'login_failed',
      'login_succeeded',
      'single_use_consumed',
      'revoked'
    )
  ),
  check (result in ('success', 'denied', 'failed'))
);

create index if not exists client_portal_test_access_events_access_idx
  on client_portal_test_access_events(test_access_id, created_at desc);
create index if not exists client_portal_test_access_events_rate_limit_idx
  on client_portal_test_access_events(test_id_hash, ip_hash, created_at desc);

alter table client_sessions
  add column if not exists test_session boolean not null default false,
  add column if not exists test_access_id uuid
    references client_portal_test_access(id) on delete set null,
  add column if not exists test_profile_reference text;

alter table client_sessions
  drop constraint if exists client_sessions_test_profile_reference_check;

alter table client_sessions
  add constraint client_sessions_test_profile_reference_check
  check (
    test_profile_reference is null or
    test_profile_reference in (
      'partially_paid',
      'fully_paid',
      'project_in_progress',
      'delivered'
    )
  );

create index if not exists client_sessions_test_access_idx
  on client_sessions(test_access_id, expires_at desc)
  where test_session = true and revoked_at is null;

commit;
