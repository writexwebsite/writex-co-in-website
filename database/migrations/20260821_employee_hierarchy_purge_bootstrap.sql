begin;

create table if not exists employee_deletion_tombstones (
  id uuid primary key default gen_random_uuid(),
  employee_reference uuid,
  employee_code text,
  deletion_mode text not null check (deletion_mode in ('ZERO_HISTORY','FULL_PURGE','CLEAN_SLATE')),
  dependency_counts jsonb not null default '{}'::jsonb,
  reason text not null,
  performed_by_admin_id uuid references admin_users(id) on delete set null,
  performed_by_email text,
  academy_request_id uuid,
  deleted_at timestamptz not null default now()
);

create table if not exists academy_initial_admin_bootstrap (
  singleton boolean primary key default true check (singleton),
  status text not null default 'DISABLED' check (status in ('DISABLED','READY','RESERVED','CONSUMED')),
  candidate_employee_id uuid references employees(id) on delete set null,
  consumed_by_employee_id uuid references employees(id) on delete set null,
  ready_at timestamptz,
  reserved_at timestamptz,
  consumed_at timestamptz,
  backup_reference text,
  reason text,
  bootstrap_version integer not null default 1,
  updated_by_admin_id uuid references admin_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into academy_initial_admin_bootstrap(singleton,status)
values(true,'DISABLED')
on conflict(singleton) do nothing;

create index if not exists employee_deletion_tombstones_deleted_at_idx
  on employee_deletion_tombstones(deleted_at desc);

commit;
