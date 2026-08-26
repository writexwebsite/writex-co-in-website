begin;

do $$
begin
  if exists (
    select normalized_mobile_hash
    from official_representatives
    where normalized_mobile_hash is not null
    group by normalized_mobile_hash
    having count(*) > 1
  ) then
    raise exception
      'Cannot migrate representative numbers while duplicate mobile hashes exist.';
  end if;
end $$;

create table if not exists official_representative_numbers (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null
    references official_representatives(id) on delete cascade,
  normalized_mobile_hash text not null,
  mobile_last_four char(4) not null,
  source_system text not null,
  source_phone_type text not null,
  status text not null default 'Active',
  is_primary boolean not null default false,
  management_status_override text,
  management_primary_override boolean,
  last_source_sync_at timestamptz,
  created_by_admin_id uuid references admin_users(id) on delete set null,
  updated_by_admin_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (mobile_last_four ~ '^[0-9]{4}$'),
  check (
    source_phone_type in (
      'primary_official',
      'secondary_official',
      'temporary_official'
    )
  ),
  check (status in ('Active', 'Inactive', 'Revoked')),
  check (
    management_status_override is null or
    management_status_override in ('Active', 'Inactive', 'Revoked')
  )
);

create unique index if not exists official_representative_numbers_hash_idx
  on official_representative_numbers(normalized_mobile_hash);

create index if not exists official_representative_numbers_representative_idx
  on official_representative_numbers(representative_id, status);

create unique index if not exists official_representative_numbers_primary_idx
  on official_representative_numbers(representative_id)
  where is_primary = true
    and status = 'Active'
    and deactivated_at is null;

drop trigger if exists set_official_representative_numbers_updated_at
  on official_representative_numbers;
create trigger set_official_representative_numbers_updated_at
before update on official_representative_numbers
for each row execute function set_updated_at();

insert into official_representative_numbers (
  representative_id,
  normalized_mobile_hash,
  mobile_last_four,
  source_system,
  source_phone_type,
  status,
  is_primary,
  last_source_sync_at,
  deactivated_at
)
select
  representative.id,
  representative.normalized_mobile_hash,
  representative.mobile_last_four,
  representative.source_system,
  'primary_official',
  case
    when representative.status = 'Active'
      and representative.is_publicly_verifiable = true
      and representative.deactivated_at is null
    then 'Active'
    else 'Inactive'
  end,
  true,
  representative.last_source_sync_at,
  representative.deactivated_at
from official_representatives representative
where representative.normalized_mobile_hash is not null
on conflict (normalized_mobile_hash) do nothing;

create table if not exists official_representative_number_audit (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null
    references official_representatives(id) on delete cascade,
  representative_number_id uuid
    references official_representative_numbers(id) on delete set null,
  actor_admin_id uuid references admin_users(id) on delete set null,
  action text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    action in (
      'added',
      'activated',
      'deactivated',
      'made_primary',
      'revoked',
      'source_synced'
    )
  ),
  check (char_length(reason) between 10 and 500)
);

create index if not exists official_representative_number_audit_rep_idx
  on official_representative_number_audit(representative_id, created_at desc);

alter table representative_sync_state
  add column if not exists numbers_received integer not null default 0,
  add column if not exists numbers_created integer not null default 0,
  add column if not exists numbers_updated integer not null default 0,
  add column if not exists numbers_deactivated integer not null default 0,
  add column if not exists rejected_numbers integer not null default 0;

commit;
