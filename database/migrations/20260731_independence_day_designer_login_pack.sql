begin;

update holiday_login_theme_settings
set composition_config = composition_config || jsonb_build_object(
  'source',
  jsonb_build_object(
    'mode', 'standard_festival_theme',
    'packId', null,
    'mobileMode', 'background_form',
    'usePackageLogo', true
  )
)
where composition_config -> 'source' is null;

with selected_theme as (
  update holiday_themes
  set
    apply_to_login_screens = true,
    apply_to_client_login = true,
    apply_to_employee_login = true,
    palette_detection_status = 'approved',
    experience_config = jsonb_set(
      coalesce(experience_config, '{}'::jsonb),
      '{approvalStatus}',
      '"approved"'::jsonb,
      true
    ),
    updated_at = now()
  where slug = 'independence-day'
    and status <> 'archived'
    and is_enabled = true
  returning id
),
activated as (
  update holiday_login_theme_settings control
  set
    previous_approved_config = case
      when control.approval_state = 'approved'
        then control.composition_config
      else control.previous_approved_config
    end,
    composition_config =
      control.composition_config
      || jsonb_build_object(
        'applyMode', 'full_natural_background',
        'appearanceMode', 'system',
        'source',
        jsonb_build_object(
          'mode', 'designer_complete_pack',
          'packId', 'independence-day-designer-v1',
          'mobileMode', 'background_form',
          'usePackageLogo', true
        ),
        'layout',
        coalesce(control.composition_config -> 'layout', '{}'::jsonb)
        || jsonb_build_object(
          'desktopColumns', '58_42',
          'transition', 'soft_blend',
          'formMaxWidthPx', 600,
          'formAnchor', 'center',
          'canvasExtensionDirection', 'right',
          'compositionBalance', 58
        ),
        'hero',
        coalesce(control.composition_config -> 'hero', '{}'::jsonb)
        || jsonb_build_object(
          'embeddedUiState', 'no_embedded_ui',
          'safeCropApproved', true,
          'fitMode', 'fill_panel',
          'mobileMode', 'form_first',
          'lightOverlayOpacity', 0.02,
          'darkOverlayOpacity', 0.32
        ),
        'formSkin',
        coalesce(control.composition_config -> 'formSkin', '{}'::jsonb)
        || jsonb_build_object(
          'mode', 'extracted_theme',
          'cardOpacity', 0.92,
          'blurPx', 24,
          'borderWidthPx', 1,
          'radiusPx', 28,
          'glowStrength', 0.12,
          'light', jsonb_build_object(
            'cardBackground', '#ffffff',
            'headingColor', '#111d62',
            'bodyColor', '#4d5b89',
            'inputBackground', '#ffffff',
            'inputBorder', '#d3d6e2',
            'focusRing', '#6d28d9',
            'ctaStart', '#7c3aed',
            'ctaEnd', '#ff3b1f'
          ),
          'dark', jsonb_build_object(
            'cardBackground', '#111632',
            'headingColor', '#f7f8ff',
            'bodyColor', '#c4cae5',
            'inputBackground', '#080b20',
            'inputBorder', '#353b68',
            'focusRing', '#a78bfa',
            'ctaStart', '#7c3aed',
            'ctaEnd', '#f43f5e'
          )
        ),
        'background',
        coalesce(control.composition_config -> 'background', '{}'::jsonb)
        || jsonb_build_object(
          'enabled', true,
          'intensity', 0.18,
          'texture', 'festival_ambience',
          'strategy', 'clean_ambient_surface',
          'blendStrength', 0.62,
          'seamSmoothing', 0.92,
          'formSideAmbienceIntensity', 0.32,
          'extendedBrightness', 1.0,
          'extendedBlurPx', 0,
          'highlightGlow', 0.08,
          'overlayGrain', false,
          'temperature', 0.08,
          'contrastProtection', 0.90,
          'edgeFadeWidthPercent', 14,
          'mode', 'extended_artwork_ambience',
          'pattern', 'none'
        ),
        'quality',
        jsonb_build_object(
          'noEmptyBands', true,
          'subjectScaleApproved', true,
          'importantArtworkSafe', true,
          'embeddedFormExcluded', true,
          'formBackgroundComplete', true,
          'noVisibleRepeat', true,
          'uniformCanvasApproved', true,
          'noHardSeam', true,
          'contrastApproved', true,
          'mobileCompositionApproved', true
        )
      ),
    theme_id = selected_theme.id,
    mode = 'holiday',
    state = 'theme_active',
    enabled = true,
    approval_state = 'approved',
    version_number = control.version_number + 1,
    last_failure_code = null,
    last_validated_at = now(),
    approved_at = now(),
    updated_at = now()
  from selected_theme
  where control.channel in ('client', 'employee')
    and (
      control.theme_id is distinct from selected_theme.id
      or control.composition_config #>> '{source,packId}'
        is distinct from 'independence-day-designer-v1'
      or control.state is distinct from 'theme_active'
    )
  returning
    control.channel,
    control.theme_id,
    control.version_number,
    control.composition_config,
    control.last_changed_by
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
  'active',
  last_changed_by,
  'independence_day_designer_complete_pack_v1'
from activated
on conflict (channel, version_number) do nothing;

insert into holiday_theme_audit (
  theme_id,
  actor_type,
  action,
  affected_scope,
  safe_metadata
)
select
  theme.id,
  'system',
  'designer_login_pack_activated',
  control.channel || '_login',
  jsonb_build_object(
    'packId', 'independence-day-designer-v1',
    'packVersion', 1,
    'responsiveBackgrounds', 3,
    'logoFound', true,
    'suppliedHeroLayer', 'invalid_blank',
    'fallback', 'scene_complete_responsive_backgrounds',
    'singleRealForm', true,
    'version', control.version_number
  )
from holiday_login_theme_settings control
join holiday_themes theme on theme.id = control.theme_id
where theme.slug = 'independence-day'
  and control.channel in ('client', 'employee')
  and not exists (
    select 1
    from holiday_theme_audit audit
    where audit.theme_id = theme.id
      and audit.action = 'designer_login_pack_activated'
      and audit.affected_scope = control.channel || '_login'
      and audit.safe_metadata ->> 'packId'
        = 'independence-day-designer-v1'
  );

commit;
