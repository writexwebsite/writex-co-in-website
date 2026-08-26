begin;

with repaired as (
  update holiday_login_theme_settings
  set
    composition_config =
      composition_config
      || jsonb_build_object(
        'layout',
        jsonb_build_object(
          'desktopColumns', '58_42',
          'transition', 'soft_blend',
          'formMaxWidthPx', 512
        ),
        'quality',
        jsonb_build_object(
          'noEmptyBands', true,
          'subjectScaleApproved', true,
          'importantArtworkSafe', true,
          'embeddedFormExcluded', true,
          'formBackgroundComplete', true,
          'noVisibleRepeat', true,
          'contrastApproved', true,
          'mobileCompositionApproved', true
        ),
        'hero',
        coalesce(composition_config -> 'hero', '{}'::jsonb)
        || jsonb_build_object(
          'fitMode', 'smart_crop',
          'derivativeVersion', 2,
          'crops',
          jsonb_build_object(
            'desktopWide', jsonb_build_object(
              'focalX', 30, 'focalY', 50, 'zoom', 1.04,
              'cropRect', jsonb_build_object('x', 0, 'y', 0, 'width', 100, 'height', 100),
              'subjectSafeArea', jsonb_build_object('x', 4, 'y', 5, 'width', 56, 'height', 90),
              'protectedContentArea', jsonb_build_object('x', 3, 'y', 3, 'width', 42, 'height', 28),
              'excludedEmbeddedFormArea', jsonb_build_object('x', 62, 'y', 0, 'width', 38, 'height', 100)
            ),
            'desktopSplit', jsonb_build_object(
              'focalX', 25, 'focalY', 50, 'zoom', 1.08,
              'cropRect', jsonb_build_object('x', 0, 'y', 0, 'width', 100, 'height', 100),
              'subjectSafeArea', jsonb_build_object('x', 4, 'y', 5, 'width', 56, 'height', 90),
              'protectedContentArea', jsonb_build_object('x', 3, 'y', 3, 'width', 42, 'height', 28),
              'excludedEmbeddedFormArea', jsonb_build_object('x', 62, 'y', 0, 'width', 38, 'height', 100)
            ),
            'tablet', jsonb_build_object(
              'focalX', 30, 'focalY', 48, 'zoom', 1.04,
              'cropRect', jsonb_build_object('x', 0, 'y', 0, 'width', 100, 'height', 100),
              'subjectSafeArea', jsonb_build_object('x', 4, 'y', 5, 'width', 56, 'height', 90),
              'protectedContentArea', jsonb_build_object('x', 3, 'y', 3, 'width', 42, 'height', 28),
              'excludedEmbeddedFormArea', jsonb_build_object('x', 62, 'y', 0, 'width', 38, 'height', 100)
            ),
            'mobileBanner', jsonb_build_object(
              'focalX', 30, 'focalY', 44, 'zoom', 1.02,
              'cropRect', jsonb_build_object('x', 0, 'y', 0, 'width', 100, 'height', 100),
              'subjectSafeArea', jsonb_build_object('x', 4, 'y', 5, 'width', 56, 'height', 90),
              'protectedContentArea', jsonb_build_object('x', 3, 'y', 3, 'width', 42, 'height', 28),
              'excludedEmbeddedFormArea', jsonb_build_object('x', 62, 'y', 0, 'width', 38, 'height', 100)
            ),
            'mobilePortrait', jsonb_build_object(
              'focalX', 25, 'focalY', 48, 'zoom', 1.08,
              'cropRect', jsonb_build_object('x', 0, 'y', 0, 'width', 100, 'height', 100),
              'subjectSafeArea', jsonb_build_object('x', 4, 'y', 5, 'width', 56, 'height', 90),
              'protectedContentArea', jsonb_build_object('x', 3, 'y', 3, 'width', 42, 'height', 28),
              'excludedEmbeddedFormArea', jsonb_build_object('x', 62, 'y', 0, 'width', 38, 'height', 100)
            )
          )
        ),
        'background',
        coalesce(composition_config -> 'background', '{}'::jsonb)
        || jsonb_build_object(
          'mode', 'theme_palette_gradient',
          'pattern', 'subtle_festival',
          'light', jsonb_build_object(
            'start', '#f7f3ff',
            'end', '#fff7fb',
            'patternColor', '#6d28d9'
          ),
          'dark', jsonb_build_object(
            'start', '#0d1230',
            'end', '#211447',
            'patternColor', '#a78bfa'
          )
        )
      ),
    previous_approved_config = composition_config,
    version_number = version_number + 1,
    updated_at = now()
  where
    composition_config #>> '{hero,fitMode}' is distinct from 'smart_crop'
    or composition_config #> '{hero,crops}' is null
    or composition_config #> '{layout}' is null
    or composition_config #> '{background,mode}' is null
    or composition_config #> '{quality}' is null
  returning
    channel,
    theme_id,
    version_number,
    composition_config,
    last_changed_by
)
insert into holiday_login_theme_versions (
  channel,
  theme_id,
  version_number,
  composition_config,
  version_state,
  changed_by,
  change_reason
)
select
  channel,
  theme_id,
  version_number,
  composition_config,
  'approved',
  last_changed_by,
  'responsive_smart_crop_and_form_ambience_repair'
from repaired
on conflict (channel, version_number) do nothing;

insert into holiday_theme_audit (
  theme_id,
  actor_type,
  action,
  affected_scope,
  safe_metadata
)
select
  control.theme_id,
  'system',
  'login_art_direction_repaired',
  control.channel || '_login',
  jsonb_build_object(
    'version', control.version_number,
    'fitMode', control.composition_config #>> '{hero,fitMode}',
    'breakpointCrops', 5,
    'formAmbience', control.composition_config #>> '{background,mode}',
    'singleRealForm', true
  )
from holiday_login_theme_settings control
where not exists (
  select 1
  from holiday_theme_audit audit
  where audit.action = 'login_art_direction_repaired'
    and audit.affected_scope = control.channel || '_login'
);

commit;
