begin;

alter table employee_application_access
  add column if not exists academy_area text not null default 'SALES',
  add column if not exists delivery_operational_role text,
  add column if not exists delivery_reporting_parent_employee_id uuid references employees(id) on delete set null,
  add column if not exists delivery_trainer_employee_id uuid references employees(id) on delete set null;

update employee_application_access
set academy_area = case when application_role = 'SUPER_ADMIN' then 'ACADEMY_WIDE' else 'SALES' end
where academy_area = 'SALES';

alter table employee_application_access
  drop constraint if exists employee_application_access_academy_area_check,
  drop constraint if exists employee_application_access_delivery_role_check,
  drop constraint if exists employee_application_access_delivery_parent_self_check,
  drop constraint if exists employee_application_access_delivery_trainer_self_check;

alter table employee_application_access
  add constraint employee_application_access_academy_area_check
    check (academy_area in ('SALES','DEVELOPMENT_OPERATIONS','ACADEMY_WIDE')),
  add constraint employee_application_access_delivery_role_check
    check (delivery_operational_role is null or delivery_operational_role in ('MANAGER','TEAM_LEADER','SENIOR_SME','JUNIOR_SME')),
  add constraint employee_application_access_delivery_parent_self_check
    check (delivery_reporting_parent_employee_id is null or delivery_reporting_parent_employee_id <> employee_id),
  add constraint employee_application_access_delivery_trainer_self_check
    check (delivery_trainer_employee_id is null or delivery_trainer_employee_id <> employee_id);

create index if not exists employee_application_access_area_idx
  on employee_application_access(application_key,academy_area,enabled);
create index if not exists employee_application_access_delivery_parent_idx
  on employee_application_access(delivery_reporting_parent_employee_id)
  where delivery_reporting_parent_employee_id is not null;
create index if not exists employee_application_access_delivery_trainer_idx
  on employee_application_access(delivery_trainer_employee_id)
  where delivery_trainer_employee_id is not null;

commit;
