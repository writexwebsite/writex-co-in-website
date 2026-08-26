begin;

update festival_studio_configurations configuration
set festival_group_id = festival_group.id,
    festival_name = festival_group.festival_name,
    updated_at = now()
from festival_hero_groups festival_group
where festival_group.festival_slug = configuration.festival_slug
  and (configuration.festival_group_id is distinct from festival_group.id
    or configuration.festival_name is distinct from festival_group.festival_name);

with defaults as (
  select configuration.id as configuration_id, pack.id as pack_id,
    pack.theme_id, pack.manifest_json->>'variantSlug' as variant_slug
  from festival_studio_configurations configuration
  join lateral (
    select candidate.*
    from festival_pack_imports candidate
    left join festival_hero_groups festival_group
      on festival_group.id = configuration.festival_group_id
    where candidate.manifest_json->>'festivalSlug' = configuration.festival_slug
      and candidate.state in ('approved','active','previous','scheduled')
    order by
      case when candidate.manifest_json->>'variantSlug' = festival_group.default_variant_slug then 0 else 1 end,
      case candidate.state when 'active' then 0 when 'scheduled' then 1 when 'approved' then 2 else 3 end,
      candidate.updated_at desc
    limit 1
  ) pack on true
  where configuration.selected_variant_pack_id is null
     or not exists (
       select 1 from festival_pack_imports selected
       where selected.id = configuration.selected_variant_pack_id
         and selected.manifest_json->>'festivalSlug' = configuration.festival_slug
     )
)
update festival_studio_configurations configuration
set selected_variant_pack_id = defaults.pack_id,
    selected_variant_slug = defaults.variant_slug,
    theme_id = defaults.theme_id,
    activation_status = case
      when configuration.activation_status in ('active','scheduled') then configuration.activation_status
      else 'ready'
    end,
    version = configuration.version + 1,
    updated_at = now()
from defaults where defaults.configuration_id = configuration.id;

update festival_draft_configurations draft
set festival_slug = configuration.festival_slug,
    selected_variant_pack_id = configuration.selected_variant_pack_id,
    selected_variant_slug = configuration.selected_variant_slug,
    selected_variant_version = pack.package_version,
    draft_version = draft.draft_version + 1,
    updated_at = now()
from festival_studio_configurations configuration
left join festival_pack_imports pack on pack.id = configuration.selected_variant_pack_id
where draft.configuration_id = configuration.id
  and (draft.festival_slug is distinct from configuration.festival_slug
    or draft.selected_variant_pack_id is distinct from configuration.selected_variant_pack_id
    or draft.selected_variant_slug is distinct from configuration.selected_variant_slug);

update festival_preview_snapshots snapshot
set expires_at = least(snapshot.expires_at, now())
from festival_pack_imports pack
where pack.id = snapshot.variant_pack_id
  and snapshot.festival_slug is distinct from pack.manifest_json->>'festivalSlug'
  and snapshot.expires_at > now();

create unique index if not exists festival_variant_manifest_scoped_identity_idx
  on festival_variant_manifests (festival_slug, variant_slug, variant_version);

commit;
