begin;

create table if not exists website_experience_settings (
  singleton_key text primary key default 'global',
  holiday_mode_enabled boolean not null default false,
  auto_schedule_enabled boolean not null default false,
  emergency_disabled boolean not null default false,
  active_theme_id uuid,
  manual_override_theme_id uuid,
  last_resolved_theme_id uuid,
  last_switched_at timestamptz,
  last_switched_by uuid references admin_users(id) on delete set null,
  default_theme_slug text not null default 'default',
  updated_at timestamptz not null default now(),
  check (singleton_key = 'global')
);

create table if not exists holiday_themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  festival_type text not null,
  description text not null default '',
  status text not null default 'draft',
  mode text not null default 'manual',
  start_at timestamptz,
  end_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  repeat_yearly boolean not null default false,
  priority integer not null default 50,
  is_enabled boolean not null default true,
  scope text not null default 'entire_public',
  apply_to_header boolean not null default true,
  apply_to_footer boolean not null default true,
  apply_to_homepage boolean not null default true,
  apply_to_login_screens boolean not null default true,
  apply_to_client_login boolean not null default true,
  apply_to_employee_login boolean not null default true,
  apply_to_admin_login boolean not null default false,
  apply_matching_website_palette boolean not null default true,
  apply_axo_theme boolean not null default true,
  apply_to_selected_routes boolean not null default false,
  selected_routes text[] not null default '{}',
  palette jsonb not null default '{}'::jsonb,
  detected_palette jsonb,
  palette_detection_status text not null default 'not_started',
  palette_detection_message text,
  palette_match_mode text not null default 'balanced_writex',
  palette_source_asset_id uuid,
  palette_approved_at timestamptz,
  palette_approved_by uuid references admin_users(id) on delete set null,
  experience_level text not null default 'standard',
  animation_level text not null default 'subtle',
  announcement_bar_enabled boolean not null default false,
  announcement_bar_text text,
  announcement_bar_cta_label text,
  announcement_bar_cta_href text,
  motif text not null default 'none',
  axo_accessory text not null default 'default',
  built_in boolean not null default false,
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  activated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (status in ('draft','scheduled','active','paused','archived')),
  check (mode in ('manual','automatic')),
  check (scope in ('entire_public','homepage','header_only','login_screens','selected_pages')),
  check (experience_level in ('accent_only','standard','enhanced')),
  check (palette_detection_status in ('not_started','pending_review','approved','needs_review','failed')),
  check (palette_match_mode in ('match_uploaded','balanced_writex','minimal_accent')),
  check (animation_level in ('none','subtle','standard')),
  check (priority between 0 and 1000),
  check (end_at is null or start_at is null or end_at > start_at)
);

alter table website_experience_settings
  drop constraint if exists website_experience_settings_active_theme_id_fkey;
alter table website_experience_settings
  add constraint website_experience_settings_active_theme_id_fkey
  foreign key (active_theme_id) references holiday_themes(id) on delete set null;
alter table website_experience_settings
  drop constraint if exists website_experience_settings_manual_override_theme_id_fkey;
alter table website_experience_settings
  add constraint website_experience_settings_manual_override_theme_id_fkey
  foreign key (manual_override_theme_id) references holiday_themes(id) on delete set null;
alter table website_experience_settings
  drop constraint if exists website_experience_settings_last_resolved_theme_id_fkey;
alter table website_experience_settings
  add constraint website_experience_settings_last_resolved_theme_id_fkey
  foreign key (last_resolved_theme_id) references holiday_themes(id) on delete set null;

create table if not exists holiday_theme_assets (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references holiday_themes(id) on delete cascade,
  asset_role text not null,
  variant text not null default 'default',
  s3_key text not null unique,
  safe_file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  status text not null default 'active',
  uploaded_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  replaced_at timestamptz,
  archived_at timestamptz,
  check (asset_role in (
    'login_desktop',
    'login_mobile',
    'login_background',
    'decorative_overlay',
    'logo_overlay',
    'axo',
    'header',
    'supporting'
  )),
  check (status in ('active','replaced','archived'))
);

create table if not exists holiday_theme_audit (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references holiday_themes(id) on delete set null,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_type text not null default 'admin',
  action text not null,
  affected_scope text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (actor_type in ('admin','system'))
);

insert into website_experience_settings (singleton_key)
values ('global')
on conflict (singleton_key) do nothing;

create index if not exists holiday_themes_schedule_idx
  on holiday_themes (status, is_enabled, start_at, end_at, priority desc);
create index if not exists holiday_theme_assets_active_idx
  on holiday_theme_assets (theme_id, asset_role, status);
create unique index if not exists holiday_theme_assets_one_active_idx
  on holiday_theme_assets (theme_id, asset_role, variant)
  where status = 'active';
alter table holiday_themes
  drop constraint if exists holiday_themes_palette_source_asset_id_fkey;
alter table holiday_themes
  add constraint holiday_themes_palette_source_asset_id_fkey
  foreign key (palette_source_asset_id)
  references holiday_theme_assets(id)
  on delete set null;
create index if not exists holiday_theme_audit_recent_idx
  on holiday_theme_audit (created_at desc);

commit;
