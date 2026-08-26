begin;

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_asset_role_check;

alter table holiday_theme_assets
  add constraint holiday_theme_assets_asset_role_check
  check (
    asset_role in (
      'reference_image',
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
      'homepage_background',
      'inner_page',
      'footer',
      'announcement',
      'mobile_fallback',
      'reduced_motion'
    )
  ) not valid;

alter table holiday_theme_assets
  validate constraint holiday_theme_assets_asset_role_check;

commit;
