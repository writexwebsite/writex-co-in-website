begin;

alter table holiday_themes
  add column if not exists apply_to_client_login boolean not null default true,
  add column if not exists apply_to_employee_login boolean not null default true,
  add column if not exists apply_to_admin_login boolean not null default false,
  add column if not exists apply_matching_website_palette boolean not null default true,
  add column if not exists apply_axo_theme boolean not null default true,
  add column if not exists detected_palette jsonb,
  add column if not exists palette_detection_status text not null default 'not_started',
  add column if not exists palette_detection_message text,
  add column if not exists palette_match_mode text not null default 'balanced_writex',
  add column if not exists palette_source_asset_id uuid,
  add column if not exists palette_approved_at timestamptz,
  add column if not exists palette_approved_by uuid references admin_users(id) on delete set null;

update holiday_themes
set apply_to_login_screens = true,
    apply_to_client_login = true,
    apply_to_employee_login = true,
    apply_to_admin_login = false,
    apply_matching_website_palette = true,
    apply_axo_theme = true
where slug <> 'default';

update holiday_themes
set apply_to_login_screens = false,
    apply_to_client_login = false,
    apply_to_employee_login = false,
    apply_to_admin_login = false,
    apply_matching_website_palette = false,
    apply_axo_theme = false
where slug = 'default';

alter table holiday_themes
  drop constraint if exists holiday_themes_palette_detection_status_check;
alter table holiday_themes
  add constraint holiday_themes_palette_detection_status_check
  check (
    palette_detection_status in (
      'not_started',
      'pending_review',
      'approved',
      'needs_review',
      'failed'
    )
  );

alter table holiday_themes
  drop constraint if exists holiday_themes_palette_match_mode_check;
alter table holiday_themes
  add constraint holiday_themes_palette_match_mode_check
  check (
    palette_match_mode in (
      'match_uploaded',
      'balanced_writex',
      'minimal_accent'
    )
  );

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_asset_role_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_asset_role_check
  check (
    asset_role in (
      'login_desktop',
      'login_mobile',
      'login_background',
      'decorative_overlay',
      'logo_overlay',
      'axo',
      'header',
      'supporting'
    )
  );

alter table holiday_themes
  drop constraint if exists holiday_themes_palette_source_asset_id_fkey;
alter table holiday_themes
  add constraint holiday_themes_palette_source_asset_id_fkey
  foreign key (palette_source_asset_id)
  references holiday_theme_assets(id)
  on delete set null;

create index if not exists holiday_themes_palette_review_idx
  on holiday_themes (palette_detection_status, updated_at desc);

commit;

