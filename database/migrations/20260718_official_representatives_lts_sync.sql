begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'official_representatives' and column_name = 'employee_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'official_representatives' and column_name = 'source_employee_id'
  ) then
    alter table official_representatives rename column employee_id to source_employee_id;
  end if;
end $$;

alter table official_representatives
  add column if not exists source_employee_id text,
  add column if not exists last_source_sync_at timestamptz;

update official_representatives
set source_system = 'excel'
where source_system = 'excel_v1';

alter table official_representatives
  alter column source_employee_id set not null;

alter table official_representatives
  drop constraint if exists official_representatives_employee_id_key,
  drop constraint if exists official_representatives_source_employee_id_key;

drop index if exists official_representatives_mobile_hash_idx;

create unique index if not exists official_representatives_source_id_idx
  on official_representatives(source_system, source_employee_id);

create index if not exists official_representatives_mobile_hash_idx
  on official_representatives(normalized_mobile_hash);

create index if not exists official_representatives_source_status_idx
  on official_representatives(source_system, status);

commit;
