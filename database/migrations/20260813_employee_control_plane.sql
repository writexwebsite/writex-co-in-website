create table if not exists employee_teams (
  id uuid primary key default gen_random_uuid(),
  team_code text not null,
  name text not null,
  department text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by_admin_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employee_teams_code_unique_idx
  on employee_teams (lower(team_code));
create unique index if not exists employee_teams_name_department_unique_idx
  on employee_teams (lower(name), lower(department));

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null,
  display_name text not null,
  official_email text not null,
  department text not null,
  designation text not null,
  employment_status text not null default 'ACTIVE'
    check (employment_status in ('ACTIVE', 'INACTIVE')),
  primary_team_id uuid references employee_teams(id) on delete set null,
  manager_employee_id uuid references employees(id) on delete set null,
  created_by_admin_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (manager_employee_id is null or manager_employee_id <> id)
);

create unique index if not exists employees_code_unique_idx
  on employees (lower(employee_code));
create unique index if not exists employees_email_unique_idx
  on employees (lower(official_email));
create index if not exists employees_team_status_idx
  on employees (primary_team_id, employment_status);
create index if not exists employees_manager_idx
  on employees (manager_employee_id);

create table if not exists employee_application_access (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete restrict,
  application_key text not null,
  enabled boolean not null default false,
  application_role text not null default 'EMPLOYEE',
  granted_by_admin_id uuid references admin_users(id) on delete set null,
  granted_at timestamptz,
  revoked_at timestamptz,
  sync_status text not null default 'SYNCED'
    check (sync_status in ('PENDING', 'SYNCED', 'FAILED')),
  last_synced_at timestamptz,
  last_sync_error text,
  last_sync_request_id uuid,
  external_application_user_id text,
  sync_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, application_key),
  check (application_key <> 'SALES_ACADEMY' or application_role in ('EMPLOYEE', 'MANAGER_TL'))
);

create index if not exists employee_application_access_sync_idx
  on employee_application_access (application_key, sync_status, updated_at);

create or replace function employee_control_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists employee_teams_updated_at on employee_teams;
create trigger employee_teams_updated_at
before update on employee_teams
for each row execute function employee_control_set_updated_at();

drop trigger if exists employees_updated_at on employees;
create trigger employees_updated_at
before update on employees
for each row execute function employee_control_set_updated_at();

drop trigger if exists employee_application_access_updated_at on employee_application_access;
create trigger employee_application_access_updated_at
before update on employee_application_access
for each row execute function employee_control_set_updated_at();
