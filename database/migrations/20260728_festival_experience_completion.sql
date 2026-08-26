begin;

alter table holiday_themes
  add column if not exists experience_config jsonb not null default '{}'::jsonb;

alter table holiday_theme_assets
  add column if not exists review_status text not null default 'pending_review',
  add column if not exists is_fallback boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references admin_users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references admin_users(id) on delete set null,
  add column if not exists rejection_reason text;

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_status_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_status_check
  check (status in ('staged', 'active', 'replaced', 'archived'));

update holiday_theme_assets
set review_status = 'approved',
    approved_at = coalesce(approved_at, created_at)
where status = 'active'
  and review_status = 'pending_review';

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_review_status_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_review_status_check
  check (review_status in ('pending_review', 'approved', 'rejected', 'archived'));

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_asset_role_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_asset_role_check
  check (
    asset_role in (
      'login_desktop',
      'login_mobile',
      'login_background',
      'hero_art',
      'decorative_overlay',
      'particle_overlay',
      'logo_overlay',
      'axo',
      'axo_animation',
      'header',
      'supporting',
      'audio',
      'mobile_fallback',
      'reduced_motion'
    )
  );

create index if not exists holiday_theme_assets_review_idx
  on holiday_theme_assets (theme_id, review_status, status, created_at desc);

create table if not exists holiday_login_theme_settings (
  channel text primary key,
  mode text not null default 'default',
  state text not null default 'default_active',
  theme_id uuid references holiday_themes(id) on delete set null,
  start_at timestamptz,
  end_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  enabled boolean not null default true,
  last_failure_code text,
  last_changed_by uuid references admin_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (channel in ('client', 'employee', 'admin')),
  check (mode in ('default', 'holiday')),
  check (
    state in (
      'default_active',
      'theme_preview',
      'theme_scheduled',
      'theme_active',
      'theme_paused',
      'fallback_active',
      'asset_failed'
    )
  ),
  check (end_at is null or start_at is null or end_at > start_at)
);

insert into holiday_login_theme_settings (channel, enabled)
values
  ('client', true),
  ('employee', true),
  ('admin', false)
on conflict (channel) do nothing;

create table if not exists integration_health_snapshots (
  integration_name text primary key,
  status text not null,
  safe_detail text not null,
  last_message_id text,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status in (
      'connected_healthy',
      'configured_unreachable',
      'awaiting_connection',
      'disabled_configuration',
      'status_check_failed',
      'not_configured'
    )
  )
);

create index if not exists integration_health_checked_idx
  on integration_health_snapshots (checked_at desc);

commit;
