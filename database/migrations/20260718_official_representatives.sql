begin;

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists official_representatives (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_employee_id text not null,
  full_name text not null,
  designation text not null,
  department text not null,
  normalized_mobile_hash text not null,
  mobile_last_four char(4) not null,
  status text not null default 'Active',
  is_publicly_verifiable boolean not null default false,
  last_source_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz
);

create unique index if not exists official_representatives_source_id_idx
  on official_representatives(source_system, source_employee_id);

create index if not exists official_representatives_mobile_hash_idx
  on official_representatives(normalized_mobile_hash);

create index if not exists official_representatives_public_status_idx
  on official_representatives(status, is_publicly_verifiable);

drop trigger if exists set_official_representatives_updated_at
  on official_representatives;
create trigger set_official_representatives_updated_at
before update on official_representatives
for each row execute function set_updated_at();

commit;
