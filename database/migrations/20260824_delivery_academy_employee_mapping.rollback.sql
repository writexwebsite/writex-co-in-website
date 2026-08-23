begin;

drop index if exists employee_application_access_delivery_trainer_idx;
drop index if exists employee_application_access_delivery_parent_idx;
drop index if exists employee_application_access_area_idx;

alter table employee_application_access
  drop constraint if exists employee_application_access_delivery_trainer_self_check,
  drop constraint if exists employee_application_access_delivery_parent_self_check,
  drop constraint if exists employee_application_access_delivery_role_check,
  drop constraint if exists employee_application_access_academy_area_check,
  drop column if exists delivery_trainer_employee_id,
  drop column if exists delivery_reporting_parent_employee_id,
  drop column if exists delivery_operational_role,
  drop column if exists academy_area;

commit;
