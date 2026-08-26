begin;

alter table festival_asset_library
  add column if not exists integrity_state text not null default 'unchecked',
  add column if not exists integrity_checked_at timestamptz,
  add column if not exists integrity_note text;

alter table festival_asset_library
  drop constraint if exists festival_asset_library_integrity_state_check;
alter table festival_asset_library
  add constraint festival_asset_library_integrity_state_check
  check (integrity_state in (
    'unchecked',
    'healthy',
    'missing_source',
    'checksum_mismatch',
    'invalid_metadata',
    'broken_derivative'
  ));

alter table holiday_theme_assets
  add column if not exists integrity_state text not null default 'unchecked',
  add column if not exists integrity_checked_at timestamptz,
  add column if not exists integrity_note text;

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_integrity_state_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_integrity_state_check
  check (integrity_state in (
    'unchecked',
    'healthy',
    'missing_source',
    'checksum_mismatch',
    'invalid_metadata',
    'broken_derivative'
  ));

alter table festival_asset_review_items
  add column if not exists thumbnail_integrity_state text not null default 'unchecked',
  add column if not exists integrity_checked_at timestamptz;

alter table festival_asset_review_items
  drop constraint if exists festival_asset_review_items_thumbnail_integrity_check;
alter table festival_asset_review_items
  add constraint festival_asset_review_items_thumbnail_integrity_check
  check (thumbnail_integrity_state in ('unchecked','healthy','repaired','missing_source'));

create index if not exists festival_asset_library_integrity_idx
  on festival_asset_library (integrity_state, approval_state, lifecycle_state);

commit;
