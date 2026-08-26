begin;

create table if not exists festival_pack_imports (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references holiday_themes(id) on delete restrict,
  package_name text not null,
  package_mode text not null,
  package_version integer not null default 1,
  state text not null default 'uploaded',
  original_file_name text not null,
  original_zip_s3_key text not null unique,
  original_zip_size bigint not null,
  original_zip_checksum_sha256 text not null,
  manifest_json jsonb,
  completeness_flags text[] not null default '{}',
  source_entry_count integer not null default 0,
  safe_asset_count integer not null default 0,
  blocked_entry_count integer not null default 0,
  manual_mapping_count integer not null default 0,
  client_login_enabled boolean not null default true,
  employee_login_enabled boolean not null default true,
  homepage_enabled boolean not null default true,
  previous_pack_id uuid references festival_pack_imports(id) on delete set null,
  imported_by uuid references admin_users(id) on delete set null,
  approved_by uuid references admin_users(id) on delete set null,
  activated_by uuid references admin_users(id) on delete set null,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  repeat_yearly boolean not null default false,
  approved_at timestamptz,
  activated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(package_name)) between 1 and 160),
  check (package_version > 0),
  check (original_zip_size > 0),
  check (source_entry_count >= 0),
  check (safe_asset_count >= 0),
  check (blocked_entry_count >= 0),
  check (manual_mapping_count >= 0),
  check (package_mode in (
    'standard_writex',
    'legacy_designer',
    'auto_detected',
    'manual_mapping'
  )),
  check (state in (
    'uploaded',
    'validated',
    'mapping_required',
    'ready_for_review',
    'approved',
    'scheduled',
    'active',
    'previous',
    'archived',
    'rejected'
  )),
  check (
    scheduled_end_at is null
    or scheduled_start_at is null
    or scheduled_end_at > scheduled_start_at
  )
);

create table if not exists festival_pack_files (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references festival_pack_imports(id) on delete restrict,
  archive_path text not null,
  safe_file_name text not null,
  file_kind text not null,
  mime_type text,
  compressed_size bigint not null default 0,
  uncompressed_size bigint not null default 0,
  width integer,
  height integer,
  has_alpha boolean,
  responsive_variant text not null default 'default',
  detected_classification text not null,
  classification_confidence numeric(5,4) not null default 0,
  classification_reasons jsonb not null default '[]'::jsonb,
  suggested_mappings jsonb not null default '[]'::jsonb,
  approved_mappings jsonb not null default '[]'::jsonb,
  inspection_status text not null,
  rejection_reason text,
  declarative_json jsonb,
  extracted_s3_key text unique,
  checksum_sha256 text,
  library_asset_id uuid references festival_asset_library(id) on delete set null,
  asset_version_id uuid references holiday_theme_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pack_id, archive_path),
  check (compressed_size >= 0),
  check (uncompressed_size >= 0),
  check (classification_confidence between 0 and 1),
  check (file_kind in (
    'image',
    'audio',
    'design_tokens',
    'manifest',
    'design_reference',
    'unsafe',
    'ignored'
  )),
  check (inspection_status in (
    'validated',
    'reference_only',
    'manual_mapping_required',
    'rejected_unsafe',
    'ignored'
  ))
);

create table if not exists festival_pack_audit (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references festival_pack_imports(id) on delete restrict,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_type text not null default 'admin',
  action text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (actor_type in ('admin', 'system'))
);

alter table holiday_themes
  add column if not exists active_festival_pack_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'holiday_themes_active_festival_pack_id_fkey'
  ) then
    alter table holiday_themes
      add constraint holiday_themes_active_festival_pack_id_fkey
      foreign key (active_festival_pack_id)
      references festival_pack_imports(id)
      on delete set null;
  end if;
end
$$;

create index if not exists festival_pack_imports_theme_idx
  on festival_pack_imports (theme_id, state, package_version desc);
create unique index if not exists festival_pack_imports_one_active_theme_idx
  on festival_pack_imports (theme_id)
  where state = 'active';
create index if not exists festival_pack_files_pack_idx
  on festival_pack_files (pack_id, inspection_status, archive_path);
create index if not exists festival_pack_audit_recent_idx
  on festival_pack_audit (pack_id, created_at desc);

drop index if exists festival_asset_assignments_active_slot_idx;
create index if not exists festival_asset_assignments_active_placement_idx
  on festival_asset_assignments (theme_id, placement, asset_version_id)
  where state = 'active';

commit;
