begin;

create table if not exists festival_variant_manifests (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null unique references festival_pack_imports(id) on delete restrict,
  festival_slug text not null,
  variant_slug text not null,
  variant_name text not null,
  variant_version integer not null,
  approval_status text not null,
  source_type text not null,
  asset_manifest jsonb not null default '{}'::jsonb,
  source_manifest jsonb not null default '{}'::jsonb,
  configuration_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (variant_version > 0),
  check (approval_status in ('draft','approved','previous','active','scheduled','blocked')),
  check (source_type in ('standard_writex','legacy_designer','auto_detected','manual_mapping'))
);

create table if not exists festival_draft_configurations (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null unique references festival_studio_configurations(id) on delete restrict,
  festival_slug text not null,
  selected_variant_pack_id uuid references festival_pack_imports(id) on delete set null,
  selected_variant_slug text,
  selected_variant_version integer,
  target_surfaces jsonb not null default '{}'::jsonb,
  asset_assignments jsonb not null default '{}'::jsonb,
  pack_defaults jsonb not null default '{}'::jsonb,
  custom_overrides jsonb not null default '{}'::jsonb,
  behavior_settings jsonb not null default '{}'::jsonb,
  login_settings jsonb not null default '{}'::jsonb,
  axo_settings jsonb not null default '{}'::jsonb,
  sound_settings jsonb not null default '{}'::jsonb,
  motion_settings jsonb not null default '{}'::jsonb,
  schedule_settings jsonb not null default '{}'::jsonb,
  appearance_settings jsonb not null default '{}'::jsonb,
  mobile_settings jsonb not null default '{}'::jsonb,
  draft_version integer not null default 1,
  configuration_hash text not null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (draft_version > 0),
  check (selected_variant_version is null or selected_variant_version > 0)
);

create table if not exists festival_preview_snapshots (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references festival_studio_configurations(id) on delete restrict,
  draft_id uuid not null references festival_draft_configurations(id) on delete restrict,
  festival_slug text not null,
  variant_pack_id uuid not null references festival_pack_imports(id) on delete restrict,
  variant_slug text not null,
  variant_name text not null,
  variant_version integer not null,
  target_surfaces text[] not null,
  asset_versions jsonb not null,
  snapshot_payload jsonb not null,
  configuration_hash text not null,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (variant_version > 0),
  check (cardinality(target_surfaces) > 0)
);

create table if not exists active_festival_snapshots (
  id uuid primary key default gen_random_uuid(),
  preview_snapshot_id uuid references festival_preview_snapshots(id) on delete set null,
  configuration_id uuid not null references festival_studio_configurations(id) on delete restrict,
  festival_slug text not null,
  festival_name text not null,
  variant_pack_id uuid not null references festival_pack_imports(id) on delete restrict,
  variant_slug text not null,
  variant_name text not null,
  variant_version integer not null,
  target_surfaces text[] not null,
  snapshot_payload jsonb not null,
  configuration_hash text not null,
  state text not null default 'active',
  previous_snapshot_id uuid references active_festival_snapshots(id) on delete set null,
  activated_by uuid references admin_users(id) on delete set null,
  activated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  deactivation_reason text,
  check (variant_version > 0),
  check (state in ('active','previous','disabled','rolled_back')),
  check (cardinality(target_surfaces) > 0)
);

create unique index if not exists active_festival_snapshots_one_active_idx
  on active_festival_snapshots ((state)) where state = 'active';
create index if not exists festival_preview_snapshots_configuration_idx
  on festival_preview_snapshots (configuration_id, created_at desc);
create index if not exists festival_preview_snapshots_expiry_idx
  on festival_preview_snapshots (expires_at);
create index if not exists festival_draft_configurations_pack_idx
  on festival_draft_configurations (selected_variant_pack_id, updated_at desc);

do $$
declare
  application_owner name;
  table_name text;
begin
  select tableowner into application_owner
  from pg_tables
  where schemaname = 'public' and tablename = 'website_experience_settings';

  if application_owner is not null then
    foreach table_name in array array[
      'festival_variant_manifests',
      'festival_draft_configurations',
      'festival_preview_snapshots',
      'active_festival_snapshots'
    ] loop
      execute format('alter table %I owner to %I', table_name, application_owner);
    end loop;
  end if;
end;
$$;

drop trigger if exists festival_variant_manifests_updated_at on festival_variant_manifests;
create trigger festival_variant_manifests_updated_at
before update on festival_variant_manifests
for each row execute function set_updated_at();

drop trigger if exists festival_draft_configurations_updated_at on festival_draft_configurations;
create trigger festival_draft_configurations_updated_at
before update on festival_draft_configurations
for each row execute function set_updated_at();

-- Preserve every legacy row while creating one editable canonical draft per
-- Festival Studio configuration. Runtime code refreshes the pack manifest and
-- hash before preview, so this seed never guesses asset compatibility.
insert into festival_draft_configurations (
  configuration_id,
  festival_slug,
  selected_variant_pack_id,
  selected_variant_slug,
  selected_variant_version,
  target_surfaces,
  asset_assignments,
  behavior_settings,
  motion_settings,
  schedule_settings,
  draft_version,
  configuration_hash
)
select
  configuration.id,
  configuration.festival_slug,
  configuration.selected_variant_pack_id,
  configuration.selected_variant_slug,
  pack.package_version,
  jsonb_build_object(
    'websiteHero', configuration.website_enabled,
    'clientLoginHero', configuration.client_login_enabled,
    'employeeLoginHero', configuration.employee_login_enabled,
    'header', configuration.website_enabled,
    'axo', configuration.axo_enabled,
    'sound', configuration.sound_enabled
  ),
  jsonb_build_object(
    'clientLoginHero', configuration.client_login_hero_asset_id,
    'employeeLoginHero', configuration.employee_login_hero_asset_id,
    'websiteHero', configuration.website_hero_asset_id,
    'header', configuration.header_asset_id,
    'axo', configuration.axo_asset_id,
    'background', configuration.background_asset_id,
    'sound', configuration.sound_asset_id
  ),
  jsonb_build_object(
    'websiteEnabled', configuration.website_enabled,
    'clientLoginEnabled', configuration.client_login_enabled,
    'employeeLoginEnabled', configuration.employee_login_enabled,
    'axoEnabled', configuration.axo_enabled,
    'soundEnabled', configuration.sound_enabled
  ),
  configuration.motion_config,
  jsonb_build_object(
    'startAt', configuration.start_at,
    'endAt', configuration.end_at,
    'repeatYearly', configuration.repeat_yearly
  ),
  configuration.version,
  encode(digest(to_jsonb(configuration)::text, 'sha256'), 'hex')
from festival_studio_configurations configuration
left join festival_pack_imports pack on pack.id = configuration.selected_variant_pack_id
on conflict (configuration_id) do nothing;

commit;
