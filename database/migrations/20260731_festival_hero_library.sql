begin;

create table if not exists festival_source_archives (
  id uuid primary key default gen_random_uuid(),
  safe_file_name text not null,
  original_s3_key text not null,
  checksum_sha256 text not null,
  file_size bigint not null check (file_size > 0),
  source_image_count integer not null check (source_image_count > 0),
  event_group_count integer not null check (event_group_count > 0),
  inventory_summary jsonb not null default '{}'::jsonb,
  state text not null default 'active'
    check (state in ('active', 'archived', 'replaced')),
  uploaded_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists festival_source_archives_checksum_idx
  on festival_source_archives (checksum_sha256);
create index if not exists festival_source_archives_state_idx
  on festival_source_archives (state, created_at desc);

drop trigger if exists festival_source_archives_updated_at on festival_source_archives;
create trigger festival_source_archives_updated_at
before update on festival_source_archives
for each row execute function set_updated_at();

commit;
