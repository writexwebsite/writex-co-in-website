begin;

create table if not exists festival_studio_configurations (
  id uuid primary key default gen_random_uuid(),
  festival_group_id uuid references festival_hero_groups(id) on delete set null,
  festival_slug text not null unique,
  festival_name text not null,
  theme_id uuid references holiday_themes(id) on delete set null,
  selected_variant_pack_id uuid references festival_pack_imports(id) on delete set null,
  selected_variant_slug text,
  client_login_hero_asset_id uuid references holiday_theme_assets(id) on delete set null,
  employee_login_hero_asset_id uuid references holiday_theme_assets(id) on delete set null,
  website_hero_asset_id uuid references holiday_theme_assets(id) on delete set null,
  header_asset_id uuid references holiday_theme_assets(id) on delete set null,
  axo_asset_id uuid references holiday_theme_assets(id) on delete set null,
  background_asset_id uuid references holiday_theme_assets(id) on delete set null,
  sound_asset_id uuid references holiday_theme_assets(id) on delete set null,
  motion_config jsonb not null default '{"enabled":false,"level":"subtle"}'::jsonb,
  client_login_enabled boolean not null default true,
  employee_login_enabled boolean not null default true,
  website_enabled boolean not null default false,
  axo_enabled boolean not null default true,
  sound_enabled boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  repeat_yearly boolean not null default false,
  activation_status text not null default 'draft',
  version integer not null default 1,
  legacy_sources jsonb not null default '[]'::jsonb,
  visual_approval_confirmed_at timestamptz,
  visual_approval_confirmed_by uuid references admin_users(id) on delete set null,
  activated_at timestamptz,
  activated_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(festival_slug)) between 1 and 80),
  check (char_length(trim(festival_name)) between 1 and 160),
  check (version > 0),
  check (activation_status in ('draft','ready','scheduled','active','paused','incomplete')),
  check (end_at is null or start_at is null or end_at > start_at)
);

create table if not exists festival_studio_configuration_versions (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references festival_studio_configurations(id) on delete restrict,
  version integer not null,
  version_state text not null,
  configuration_snapshot jsonb not null,
  action text not null,
  changed_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (configuration_id, version),
  check (version > 0),
  check (version_state in ('draft','ready','scheduled','active','paused','restored','legacy'))
);

create table if not exists festival_studio_legacy_records (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid references festival_studio_configurations(id) on delete set null,
  source_table text not null,
  source_record_id text not null,
  legacy_state text not null default 'legacy_configuration',
  safe_summary jsonb not null default '{}'::jsonb,
  linked_at timestamptz not null default now(),
  unique (source_table, source_record_id),
  check (legacy_state = 'legacy_configuration')
);

create index if not exists festival_studio_configurations_status_idx
  on festival_studio_configurations (activation_status, start_at, end_at);
create index if not exists festival_studio_configurations_theme_idx
  on festival_studio_configurations (theme_id);
create index if not exists festival_studio_versions_recent_idx
  on festival_studio_configuration_versions (configuration_id, created_at desc);

-- Keep new tables under the established application owner so the normal
-- production backup/deployment role can read them without elevated access.
do $$
declare
  application_owner name;
begin
  select tableowner
  into application_owner
  from pg_tables
  where schemaname = 'public'
    and tablename = 'website_experience_settings';

  if application_owner is not null then
    execute format(
      'alter table festival_studio_configurations owner to %I',
      application_owner
    );
    execute format(
      'alter table festival_studio_configuration_versions owner to %I',
      application_owner
    );
    execute format(
      'alter table festival_studio_legacy_records owner to %I',
      application_owner
    );
  end if;
end;
$$;

drop trigger if exists festival_studio_configurations_updated_at
  on festival_studio_configurations;
create trigger festival_studio_configurations_updated_at
before update on festival_studio_configurations
for each row execute function set_updated_at();

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
  group_record.id,
  group_record.festival_slug,
  group_record.festival_name,
  selected.theme_id,
  selected.id,
  selected.manifest_json->>'variantSlug',
  coalesce(selected.client_login_enabled, true),
  coalesce(selected.employee_login_enabled, true),
  coalesce(selected.homepage_enabled, false),
  case
    when selected.state = 'active' then 'active'
    when selected.state = 'scheduled' then 'scheduled'
    when selected.id is null then 'incomplete'
    else 'ready'
  end,
  jsonb_build_array(
    jsonb_build_object('source','festival_hero_groups','id',group_record.id),
    jsonb_build_object('source','festival_pack_imports','id',selected.id)
  )
from festival_hero_groups group_record
left join lateral (
  select pack.*
  from festival_pack_imports pack
  where pack.manifest_json->>'festivalSlug' = group_record.festival_slug
    and pack.state not in ('archived','rejected')
  order by
    case pack.state when 'active' then 0 when 'scheduled' then 1 when 'approved' then 2 else 3 end,
    case when pack.manifest_json->>'variantSlug' = group_record.default_variant_slug then 0 else 1 end,
    pack.updated_at desc
  limit 1
) selected on true
on conflict (festival_slug) do update set
  festival_group_id = excluded.festival_group_id,
  festival_name = excluded.festival_name,
  theme_id = coalesce(festival_studio_configurations.theme_id, excluded.theme_id),
  selected_variant_pack_id = coalesce(
    festival_studio_configurations.selected_variant_pack_id,
    excluded.selected_variant_pack_id
  ),
  selected_variant_slug = coalesce(
    festival_studio_configurations.selected_variant_slug,
    excluded.selected_variant_slug
  ),
  legacy_sources = excluded.legacy_sources,
  updated_at = now();

insert into festival_studio_configurations (
  festival_slug,
  festival_name,
  theme_id,
  client_login_enabled,
  employee_login_enabled,
  website_enabled,
  axo_enabled,
  sound_enabled,
  start_at,
  end_at,
  repeat_yearly,
  activation_status,
  legacy_sources
)
select
  theme.slug,
  theme.name,
  theme.id,
  theme.apply_to_client_login,
  theme.apply_to_employee_login,
  theme.apply_to_homepage,
  theme.apply_axo_theme,
  coalesce((theme.experience_config #>> '{sound,enabled}')::boolean, false),
  theme.start_at,
  theme.end_at,
  theme.repeat_yearly,
  case theme.status
    when 'active' then 'active'
    when 'scheduled' then 'scheduled'
    when 'paused' then 'paused'
    else 'draft'
  end,
  jsonb_build_array(jsonb_build_object('source','holiday_themes','id',theme.id))
from holiday_themes theme
where theme.slug <> 'default'
  and theme.status <> 'archived'
  and not exists (
    select 1 from festival_pack_imports pack where pack.theme_id = theme.id
  )
on conflict (festival_slug) do update set
  festival_name = excluded.festival_name,
  theme_id = coalesce(festival_studio_configurations.theme_id, excluded.theme_id),
  legacy_sources = festival_studio_configurations.legacy_sources || excluded.legacy_sources,
  updated_at = now();

with configured as (
  select
    configuration.id as configuration_id,
    configuration.festival_slug,
    configuration.theme_id,
    coalesce(
      configuration.theme_id,
      (
        select theme.id from holiday_themes theme
        where theme.slug = configuration.festival_slug
        order by theme.created_at asc limit 1
      )
    ) as resolved_theme_id
  from festival_studio_configurations configuration
), candidates as (
  select
    configured.configuration_id,
    assignment.placement,
    asset.id as asset_id,
    row_number() over (
      partition by configured.configuration_id, assignment.placement
      order by
        case when asset.review_status = 'approved' then 0 else 1 end,
        case when asset.version_state in ('current','restored') then 0 else 1 end,
        asset.version_number desc,
        assignment.assigned_at desc
    ) as rank
  from configured
  join festival_asset_assignments assignment
    on assignment.state = 'active'
  join holiday_theme_assets asset on asset.id = assignment.asset_version_id
  join festival_asset_library library on library.id = assignment.library_asset_id
  where library.lifecycle_state not in ('trash','deletion_pending','deleted')
    and (
      assignment.theme_id = configured.resolved_theme_id
      or assignment.theme_id in (
        select pack.theme_id from festival_pack_imports pack
        where pack.manifest_json->>'festivalSlug' = configured.festival_slug
      )
      or assignment.theme_id in (
        select theme.id from holiday_themes theme
        where theme.slug = configured.festival_slug
      )
    )
)
update festival_studio_configurations configuration
set
  client_login_hero_asset_id = coalesce(configuration.client_login_hero_asset_id,
    (select asset_id from candidates where configuration_id = configuration.id and placement = 'client_login_desktop' and rank = 1)),
  employee_login_hero_asset_id = coalesce(configuration.employee_login_hero_asset_id,
    (select asset_id from candidates where configuration_id = configuration.id and placement = 'employee_login_desktop' and rank = 1)),
  website_hero_asset_id = coalesce(configuration.website_hero_asset_id,
    (select asset_id from candidates where configuration_id = configuration.id and placement in ('homepage_hero','hero_foreground') and rank = 1 limit 1)),
  header_asset_id = coalesce(configuration.header_asset_id,
    (select asset_id from candidates where configuration_id = configuration.id and placement = 'header_decoration_rail' and rank = 1)),
  axo_asset_id = coalesce(configuration.axo_asset_id,
    (select asset_id from candidates where configuration_id = configuration.id and placement = 'axo_theme_reference' and rank = 1)),
  background_asset_id = coalesce(configuration.background_asset_id,
    (select asset_id from candidates where configuration_id = configuration.id and placement in ('homepage_background','hero_background') and rank = 1 limit 1)),
  sound_asset_id = coalesce(configuration.sound_asset_id,
    (select asset_id from candidates where configuration_id = configuration.id and placement = 'audio' and rank = 1)),
  updated_at = now();

with repair as (
  select
    configuration.id as configuration_id,
    configuration.theme_id,
    asset.id as asset_id,
    asset.library_asset_id
  from festival_studio_configurations configuration
  join festival_asset_library library
    on library.owner_theme_id in (
      select id from holiday_themes where slug = 'independence-day'
    )
    and lower(library.display_name) = 'mascot-1.png'
  join holiday_theme_assets asset on asset.id = library.current_version_asset_id
  where configuration.festival_slug = 'independence-day'
    and asset.review_status = 'approved'
    and asset.quality_status in ('approved','approved_with_size_restrictions')
    and (
      configuration.axo_asset_id is distinct from asset.id
      or not exists (
        select 1
        from festival_asset_assignments existing
        where existing.theme_id = configuration.theme_id
          and existing.asset_version_id = asset.id
          and existing.placement = 'axo_theme_reference'
          and existing.state = 'active'
      )
    )
  order by asset.version_number desc
  limit 1
), archived_old_assignments as (
  update festival_asset_assignments assignment
  set
    state = 'replaced',
    removed_at = now(),
    removal_reason = 'Consolidated into the canonical Festival Studio Axo slot.',
    updated_at = now()
  from repair
  where assignment.library_asset_id = repair.library_asset_id
    and assignment.placement = 'axo_theme_reference'
    and assignment.state = 'active'
  returning assignment.id
), restored_library as (
  update festival_asset_library library
  set lifecycle_state = 'active', archived_at = null, updated_at = now()
  from repair
  where library.id = repair.library_asset_id
  returning library.id
), restored_asset as (
  update holiday_theme_assets asset
  set status = 'active', version_state = 'restored', archived_at = null, updated_at = now()
  from repair
  where asset.id = repair.asset_id
  returning asset.id
), inserted_assignment as (
  insert into festival_asset_assignments (
    library_asset_id,
    asset_version_id,
    theme_id,
    placement,
    state,
    assigned_at
  )
  select
    repair.library_asset_id,
    repair.asset_id,
    repair.theme_id,
    'axo_theme_reference',
    'active',
    now()
  from repair
  where repair.theme_id is not null
  returning id
)
update festival_studio_configurations configuration
set axo_asset_id = repair.asset_id,
    axo_enabled = true,
    activation_status = case
      when configuration.activation_status = 'incomplete' then 'ready'
      else configuration.activation_status
    end,
    version = configuration.version + 1,
    updated_at = now()
from repair
where configuration.id = repair.configuration_id;

insert into festival_studio_configuration_versions (
  configuration_id,
  version,
  version_state,
  configuration_snapshot,
  action
)
select
  configuration.id,
  configuration.version,
  'legacy',
  to_jsonb(configuration),
  'legacy_configuration_migrated'
from festival_studio_configurations configuration
on conflict (configuration_id, version) do nothing;

insert into festival_studio_legacy_records (
  configuration_id,
  source_table,
  source_record_id,
  safe_summary
)
select
  configuration.id,
  'holiday_themes',
  theme.id::text,
  jsonb_build_object('name',theme.name,'status',theme.status,'legacy',true)
from holiday_themes theme
left join festival_pack_imports pack on pack.theme_id = theme.id
left join festival_studio_configurations configuration
  on configuration.festival_slug = coalesce(pack.manifest_json->>'festivalSlug', theme.slug)
where theme.slug <> 'default'
on conflict (source_table, source_record_id) do nothing;

insert into festival_studio_legacy_records (
  configuration_id,
  source_table,
  source_record_id,
  safe_summary
)
select
  configuration.id,
  'festival_pack_imports',
  pack.id::text,
  jsonb_build_object(
    'packageName',pack.package_name,
    'state',pack.state,
    'variant',pack.manifest_json->>'variantSlug',
    'legacy',true
  )
from festival_pack_imports pack
left join festival_studio_configurations configuration
  on configuration.festival_slug = pack.manifest_json->>'festivalSlug'
on conflict (source_table, source_record_id) do nothing;

commit;
