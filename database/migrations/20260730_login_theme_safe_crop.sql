begin;

with repaired as (
  update holiday_login_theme_settings
  set
    composition_config = jsonb_set(
      jsonb_set(
        jsonb_set(
          composition_config,
          '{hero,focalX}',
          '25'::jsonb,
          true
        ),
        '{hero,zoom}',
        '1.9'::jsonb,
        true
      ),
      '{hero,embeddedUiState}',
      '"contains_embedded_ui"'::jsonb,
      true
    ),
    version_number = version_number + 1,
    updated_at = now()
  where composition_config #>> '{hero,focalX}' = '38'
    and composition_config #>> '{hero,zoom}' = '1.4'
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
  'embedded_login_ui_safe_crop_repair'
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
  'login_hero_safe_crop_repaired',
  control.channel || '_login',
  jsonb_build_object(
    'version', control.version_number,
    'focalX', 25,
    'zoom', 1.9,
    'embeddedUiState', 'contains_embedded_ui'
  )
from holiday_login_theme_settings control
where control.composition_config #>> '{hero,focalX}' = '25'
  and control.composition_config #>> '{hero,zoom}' = '1.9'
  and not exists (
    select 1
    from holiday_theme_audit audit
    where audit.action = 'login_hero_safe_crop_repaired'
      and audit.affected_scope = control.channel || '_login'
  );

commit;
