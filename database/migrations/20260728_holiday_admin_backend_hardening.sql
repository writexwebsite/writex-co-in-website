begin;

alter table holiday_theme_assets
  add column if not exists checksum_sha256 text,
  add column if not exists duration_seconds numeric(12, 3),
  add column if not exists asset_metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_checksum_sha256_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_checksum_sha256_check
  check (
    checksum_sha256 is null
    or checksum_sha256 ~ '^[0-9a-f]{64}$'
  );

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_duration_seconds_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_duration_seconds_check
  check (duration_seconds is null or duration_seconds > 0);

create index if not exists holiday_theme_assets_audio_playback_idx
  on holiday_theme_assets (
    theme_id,
    asset_role,
    review_status,
    status,
    variant,
    created_at desc
  )
  where asset_role = 'audio';

alter table admin_users
  drop constraint if exists admin_users_role_check;
alter table admin_users
  add constraint admin_users_role_check
  check (
    role in (
      'super_admin',
      'sales',
      'support',
      'accounts',
      'viewer',
      'hr_admin',
      'hiring_manager',
      'assessor',
      'interviewer',
      'read_only_auditor',
      'website_experience_admin'
    )
  );

commit;
