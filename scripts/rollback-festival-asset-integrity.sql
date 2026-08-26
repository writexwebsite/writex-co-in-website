begin;

drop index if exists festival_asset_library_integrity_idx;

alter table festival_asset_review_items
  drop constraint if exists festival_asset_review_items_thumbnail_integrity_check,
  drop column if exists thumbnail_integrity_state,
  drop column if exists integrity_checked_at;

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_integrity_state_check,
  drop column if exists integrity_state,
  drop column if exists integrity_checked_at,
  drop column if exists integrity_note;

alter table festival_asset_library
  drop constraint if exists festival_asset_library_integrity_state_check,
  drop column if exists integrity_state,
  drop column if exists integrity_checked_at,
  drop column if exists integrity_note;

commit;
