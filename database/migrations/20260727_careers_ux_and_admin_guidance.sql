begin;

create table if not exists hiring_application_options (
  id uuid primary key default gen_random_uuid(),
  option_set text not null,
  option_value text not null,
  option_label text not null,
  is_active boolean not null default true,
  is_protected boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 1000),
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_set, option_value),
  check (char_length(option_set) between 2 and 80),
  check (char_length(option_value) between 1 and 120),
  check (char_length(option_label) between 1 and 120)
);

create index if not exists hiring_application_options_active_idx
  on hiring_application_options (option_set, is_active, display_order);

create table if not exists admin_onboarding_state (
  admin_user_id uuid primary key references admin_users(id) on delete cascade,
  assigned_role text not null,
  tutorial_version text not null default 'admin-guidance-v1',
  current_step integer not null default 0 check (current_step >= 0),
  completed_steps jsonb not null default '[]'::jsonb,
  checklist_state jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  skipped_at timestamptz,
  dismissed_checklist_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists admin_help_feedback (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references admin_users(id) on delete cascade,
  article_id text not null,
  helpful boolean not null,
  release_reference text,
  created_at timestamptz not null default now(),
  unique (admin_user_id, article_id)
);

create table if not exists admin_guidance_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references admin_users(id) on delete set null,
  action text not null,
  tutorial_id text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists admin_help_article_overrides (
  article_id text primary key,
  title text not null,
  module text not null,
  roles jsonb not null default '[]'::jsonb,
  version text not null,
  last_updated date not null default current_date,
  owner text not null,
  active boolean not null default true,
  display_order integer not null default 0 check (display_order between 0 and 1000),
  purpose text not null,
  actions jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  sensitive text,
  href text,
  is_custom boolean not null default false,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (article_id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  check (char_length(title) between 2 and 120),
  check (char_length(module) between 2 and 80),
  check (char_length(owner) between 2 and 100),
  check (char_length(purpose) between 10 and 1000)
);

create index if not exists admin_help_article_overrides_order_idx
  on admin_help_article_overrides (active, display_order, article_id);

insert into hiring_settings (setting_key, setting_value)
values (
  'current_employment_type',
  '{"value":"Full-time","protected":true,"founder_authorisation_required_for_change":true}'::jsonb
)
on conflict (setting_key) do update set
  setting_value=excluded.setting_value,
  updated_at=now();

commit;
