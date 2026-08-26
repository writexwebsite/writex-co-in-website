begin;

-- The canonical source catalogue was populated after the first Festival Studio
-- migration. Add only missing Studio rows so every source-backed group can be
-- selected and privately previewed without rewriting existing ownership.
with source_groups as (
  select
    festival_group.id as festival_group_id,
    festival_group.festival_slug,
    festival_group.festival_name,
    selected_pack.id as pack_id,
    selected_pack.theme_id,
    selected_pack.manifest_json->>'variantSlug' as variant_slug,
    selected_pack.client_login_enabled,
    selected_pack.employee_login_enabled
  from festival_hero_groups festival_group
  join lateral (
    select pack.*
    from festival_pack_imports pack
    where pack.manifest_json->>'packType' = 'responsive_festival_hero'
      and pack.manifest_json->>'festivalSlug' = festival_group.festival_slug
      and pack.state not in ('archived', 'rejected')
    order by
      case pack.state
        when 'active' then 0
        when 'scheduled' then 1
        when 'approved' then 2
        when 'ready_for_review' then 3
        else 4
      end,
      case
        when pack.manifest_json->>'variantSlug' = festival_group.default_variant_slug
          then 0
        else 1
      end,
      pack.package_version desc,
      pack.updated_at desc
    limit 1
  ) selected_pack on true
)
insert into festival_studio_configurations (
  festival_group_id,
  festival_slug,
  festival_name,
  theme_id,
  selected_variant_pack_id,
  selected_variant_slug,
  client_login_enabled,
  employee_login_enabled,
  website_enabled,
  activation_status,
  legacy_sources
)
select
  source_group.festival_group_id,
  source_group.festival_slug,
  source_group.festival_name,
  source_group.theme_id,
  source_group.pack_id,
  source_group.variant_slug,
  source_group.client_login_enabled,
  source_group.employee_login_enabled,
  false,
  'ready',
  jsonb_build_array(
    jsonb_build_object(
      'source', 'festival_hero_groups',
      'id', source_group.festival_group_id
    ),
    jsonb_build_object(
      'source', 'festival_pack_imports',
      'id', source_group.pack_id
    )
  )
from source_groups source_group
where not exists (
  select 1
  from festival_studio_configurations configuration
  where configuration.festival_group_id = source_group.festival_group_id
)
on conflict (festival_slug) do update
set festival_group_id = excluded.festival_group_id,
    theme_id = coalesce(
      festival_studio_configurations.theme_id,
      excluded.theme_id
    ),
    selected_variant_pack_id = coalesce(
      festival_studio_configurations.selected_variant_pack_id,
      excluded.selected_variant_pack_id
    ),
    selected_variant_slug = coalesce(
      festival_studio_configurations.selected_variant_slug,
      excluded.selected_variant_slug
    ),
    updated_at = now()
where festival_studio_configurations.festival_group_id is null
  and festival_studio_configurations.selected_variant_pack_id is null;

commit;
