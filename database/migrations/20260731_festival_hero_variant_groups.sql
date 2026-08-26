begin;

create table if not exists festival_hero_groups (
  id uuid primary key default gen_random_uuid(),
  festival_name text not null,
  festival_slug text not null unique,
  source_status text not null default 'ready'
    check (source_status in ('ready', 'source_required')),
  source_message text,
  default_variant_slug text,
  created_by uuid references admin_users(id) on delete set null,
  updated_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists festival_hero_groups_source_status_idx
  on festival_hero_groups (source_status, festival_name);

drop trigger if exists festival_hero_groups_updated_at on festival_hero_groups;
create trigger festival_hero_groups_updated_at
before update on festival_hero_groups
for each row execute function set_updated_at();

commit;
