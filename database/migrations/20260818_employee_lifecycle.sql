alter table employees
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_admin_id uuid references admin_users(id) on delete set null,
  add column if not exists archive_previous_employment_status text,
  add column if not exists archive_previous_academy_enabled boolean,
  add column if not exists lifecycle_version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'employees_archive_previous_status_check'
  ) then
    alter table employees
      add constraint employees_archive_previous_status_check
      check (archive_previous_employment_status is null or archive_previous_employment_status in ('ACTIVE', 'INACTIVE'));
  end if;
end $$;

create index if not exists employees_lifecycle_directory_idx
  on employees (archived_at, employment_status, display_name);
