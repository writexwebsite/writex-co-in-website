begin;

create table if not exists festival_asset_library (
  id uuid primary key default gen_random_uuid(),
  owner_theme_id uuid references holiday_themes(id) on delete set null,
  display_name text not null,
  default_purpose text not null default 'design_reference_only',
  asset_type text not null default 'image',
  approval_state text not null default 'pending_review',
  lifecycle_state text not null default 'active',
  current_version_asset_id uuid null,
  uploaded_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  archived_at timestamptz,
  trashed_at timestamptz,
  retention_until timestamptz,
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(display_name)) between 1 and 180),
  check (default_purpose in (
    'design_reference_only',
    'homepage_hero_artwork',
    'homepage_background',
    'header_decoration',
    'hero_decoration',
    'inner_page_decoration',
    'footer_decoration',
    'client_login_background',
    'employee_login_background',
    'client_employee_login',
    'axo_reference',
    'announcement_banner',
    'multiple_locations',
    'library_unassigned',
    'audio'
  )),
  check (asset_type in ('image', 'audio')),
  check (lifecycle_state in (
    'active',
    'archived',
    'trash',
    'deletion_pending',
    'deleted'
  ))
);

alter table holiday_theme_assets
  add column if not exists library_asset_id uuid null,
  add column if not exists version_state text not null default 'current',
  add column if not exists storage_delete_status text not null default 'retained',
  add column if not exists deleted_at timestamptz null;

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_version_state_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_version_state_check
  check (version_state in (
    'current',
    'previous',
    'archived',
    'rejected',
    'restored',
    'deleted_pending_retention',
    'deleted'
  ));

alter table holiday_theme_assets
  drop constraint if exists holiday_theme_assets_storage_delete_status_check;
alter table holiday_theme_assets
  add constraint holiday_theme_assets_storage_delete_status_check
  check (storage_delete_status in ('retained', 'pending', 'deleted', 'failed'));

drop index if exists holiday_theme_assets_one_active_idx;

with recursive version_roots as (
  select
    asset.id,
    asset.id as root_id
  from holiday_theme_assets asset
  where asset.previous_asset_id is null
  union all
  select
    child.id,
    parent.root_id
  from holiday_theme_assets child
  join version_roots parent on child.previous_asset_id = parent.id
),
latest as (
  select distinct on (roots.root_id)
    roots.root_id,
    asset.*
  from version_roots roots
  join holiday_theme_assets asset on asset.id = roots.id
  order by roots.root_id, asset.version_number desc, asset.created_at desc
)
insert into festival_asset_library (
  id,
  owner_theme_id,
  display_name,
  default_purpose,
  asset_type,
  approval_state,
  lifecycle_state,
  current_version_asset_id,
  uploaded_by,
  archived_at,
  created_at,
  updated_at
)
select
  latest.root_id,
  latest.theme_id,
  latest.safe_file_name,
  case latest.asset_role
    when 'hero_art' then 'homepage_hero_artwork'
    when 'header' then 'header_decoration'
    when 'axo' then 'axo_reference'
    when 'axo_animation' then 'axo_reference'
    when 'audio' then 'audio'
    when 'login_desktop' then 'client_login_background'
    when 'login_mobile' then 'client_login_background'
    when 'login_background' then 'client_employee_login'
    else 'design_reference_only'
  end,
  case when latest.asset_role = 'audio' then 'audio' else 'image' end,
  latest.review_status,
  case
    when latest.status = 'archived' then 'archived'
    else 'active'
  end,
  latest.id,
  latest.uploaded_by,
  latest.archived_at,
  latest.created_at,
  coalesce(latest.updated_at, latest.created_at)
from latest
on conflict (id) do nothing;

with recursive version_roots as (
  select
    asset.id,
    asset.id as root_id
  from holiday_theme_assets asset
  where asset.previous_asset_id is null
  union all
  select
    child.id,
    parent.root_id
  from holiday_theme_assets child
  join version_roots parent on child.previous_asset_id = parent.id
)
update holiday_theme_assets asset
set library_asset_id = roots.root_id
from version_roots roots
where roots.id = asset.id
  and asset.library_asset_id is null;

insert into festival_asset_library (
  id,
  owner_theme_id,
  display_name,
  default_purpose,
  asset_type,
  approval_state,
  lifecycle_state,
  current_version_asset_id,
  uploaded_by,
  archived_at,
  created_at,
  updated_at
)
select
  asset.id,
  asset.theme_id,
  asset.safe_file_name,
  case when asset.asset_role = 'audio' then 'audio' else 'design_reference_only' end,
  case when asset.asset_role = 'audio' then 'audio' else 'image' end,
  asset.review_status,
  case when asset.status = 'archived' then 'archived' else 'active' end,
  asset.id,
  asset.uploaded_by,
  asset.archived_at,
  asset.created_at,
  coalesce(asset.updated_at, asset.created_at)
from holiday_theme_assets asset
where asset.library_asset_id is null
on conflict (id) do nothing;

update holiday_theme_assets
set library_asset_id = id
where library_asset_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'holiday_theme_assets_library_asset_id_fkey'
  ) then
    alter table holiday_theme_assets
      add constraint holiday_theme_assets_library_asset_id_fkey
      foreign key (library_asset_id)
      references festival_asset_library(id)
      on delete restrict;
  end if;
end $$;

alter table festival_asset_library
  drop constraint if exists festival_asset_library_current_version_asset_id_fkey;
alter table festival_asset_library
  add constraint festival_asset_library_current_version_asset_id_fkey
  foreign key (current_version_asset_id)
  references holiday_theme_assets(id)
  on delete set null;

create table if not exists festival_asset_assignments (
  id uuid primary key default gen_random_uuid(),
  library_asset_id uuid not null references festival_asset_library(id) on delete restrict,
  asset_version_id uuid not null references holiday_theme_assets(id) on delete restrict,
  theme_id uuid not null references holiday_themes(id) on delete cascade,
  placement text not null,
  state text not null default 'active',
  is_fallback boolean not null default false,
  assigned_by uuid references admin_users(id) on delete set null,
  removed_by uuid references admin_users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  removal_reason text,
  updated_at timestamptz not null default now(),
  check (placement in (
    'homepage_hero',
    'homepage_background',
    'homepage_section_background',
    'homepage_theme_source',
    'header_decoration_rail',
    'hero_foreground',
    'hero_background',
    'inner_page_accent',
    'footer_accent',
    'announcement_banner',
    'client_login_desktop',
    'client_login_mobile',
    'employee_login_desktop',
    'employee_login_mobile',
    'admin_login_desktop',
    'admin_login_mobile',
    'axo_theme_reference',
    'palette_source',
    'motif_interpretation_source',
    'private_reference',
    'audio'
  )),
  check (state in ('pending_approval', 'active', 'removed', 'replaced'))
);

create unique index if not exists festival_asset_assignments_active_slot_idx
  on festival_asset_assignments (theme_id, placement)
  where state = 'active'
    and placement not in (
      'private_reference',
      'palette_source',
      'motif_interpretation_source',
      'axo_theme_reference',
      'header_decoration_rail',
      'inner_page_accent'
    );

create index if not exists festival_asset_assignments_library_idx
  on festival_asset_assignments (library_asset_id, state, assigned_at desc);
create index if not exists festival_asset_assignments_version_idx
  on festival_asset_assignments (asset_version_id, state);

insert into festival_asset_assignments (
  library_asset_id,
  asset_version_id,
  theme_id,
  placement,
  state,
  is_fallback,
  assigned_by,
  assigned_at
)
select
  asset.library_asset_id,
  asset.id,
  asset.theme_id,
  case asset.asset_role
    when 'header' then 'header_decoration_rail'
    when 'hero_art' then 'homepage_hero'
    when 'decorative_overlay' then 'inner_page_accent'
    when 'particle_overlay' then 'inner_page_accent'
    when 'login_desktop' then 'client_login_desktop'
    when 'login_mobile' then 'client_login_mobile'
    when 'login_background' then 'client_login_desktop'
    when 'axo' then 'axo_theme_reference'
    when 'axo_animation' then 'axo_theme_reference'
    when 'audio' then 'audio'
    else 'private_reference'
  end,
  'active',
  asset.is_fallback,
  asset.uploaded_by,
  asset.created_at
from holiday_theme_assets asset
where asset.library_asset_id is not null
  and asset.status = 'active'
  and not exists (
    select 1
    from festival_asset_assignments existing
    where existing.library_asset_id = asset.library_asset_id
      and existing.asset_version_id = asset.id
      and existing.theme_id = asset.theme_id
      and existing.state = 'active'
  )
on conflict do nothing;

insert into festival_asset_assignments (
  library_asset_id,
  asset_version_id,
  theme_id,
  placement,
  state,
  is_fallback,
  assigned_by,
  assigned_at
)
select
  asset.library_asset_id,
  asset.id,
  control.theme_id,
  control.channel || '_login_' ||
    case when asset.asset_role = 'login_mobile' then 'mobile' else 'desktop' end,
  'active',
  asset.is_fallback,
  asset.uploaded_by,
  asset.created_at
from holiday_login_theme_settings control
join holiday_theme_assets asset
  on asset.theme_id = control.theme_id
 and asset.status = 'active'
 and asset.asset_role in ('login_desktop', 'login_mobile', 'login_background')
where control.mode = 'holiday'
  and control.enabled is true
  and control.theme_id is not null
  and not exists (
    select 1
    from festival_asset_assignments existing
    where existing.library_asset_id = asset.library_asset_id
      and existing.asset_version_id = asset.id
      and existing.theme_id = control.theme_id
      and existing.placement =
        control.channel || '_login_' ||
        case when asset.asset_role = 'login_mobile' then 'mobile' else 'desktop' end
      and existing.state = 'active'
  )
on conflict do nothing;

create table if not exists festival_asset_audit (
  id uuid primary key default gen_random_uuid(),
  library_asset_id uuid not null references festival_asset_library(id) on delete restrict,
  asset_version_id uuid references holiday_theme_assets(id) on delete set null,
  assignment_id uuid references festival_asset_assignments(id) on delete set null,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_type text not null default 'admin',
  action text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (actor_type in ('admin', 'system'))
);

create index if not exists festival_asset_library_lifecycle_idx
  on festival_asset_library (lifecycle_state, updated_at desc);
create index if not exists festival_asset_library_theme_idx
  on festival_asset_library (owner_theme_id, lifecycle_state);
create index if not exists holiday_theme_assets_library_version_idx
  on holiday_theme_assets (library_asset_id, version_number desc);
create index if not exists festival_asset_audit_recent_idx
  on festival_asset_audit (library_asset_id, created_at desc);

insert into festival_asset_audit (
  library_asset_id,
  asset_version_id,
  actor_type,
  action,
  safe_metadata,
  created_at
)
select
  asset.library_asset_id,
  asset.id,
  'system',
  'legacy_asset_recovered',
  jsonb_build_object(
    'themeId', asset.theme_id,
    'role', asset.asset_role,
    'versionNumber', asset.version_number,
    'storageReferencePreserved', true
  ),
  now()
from holiday_theme_assets asset
where asset.library_asset_id is not null
  and not exists (
    select 1
    from festival_asset_audit audit
    where audit.asset_version_id = asset.id
      and audit.action = 'legacy_asset_recovered'
  );

commit;
