drop trigger if exists employee_application_access_updated_at on employee_application_access;
drop trigger if exists employees_updated_at on employees;
drop trigger if exists employee_teams_updated_at on employee_teams;

drop table if exists employee_application_access;
drop table if exists employees;
drop table if exists employee_teams;

drop function if exists employee_control_set_updated_at();
