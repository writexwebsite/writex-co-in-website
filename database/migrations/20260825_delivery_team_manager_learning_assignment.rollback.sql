begin;

do $$
begin
  if exists (
    select 1 from employee_application_access
    where delivery_operational_role='TEAM_MANAGER'
       or academy_learning_assignment_status <> 'NOT_ASSIGNED'
  ) then
    raise exception 'Rollback refused: Team Manager or learning-assignment data exists.';
  end if;
end;
$$;

drop index if exists employee_application_access_learning_assignment_idx;

alter table employee_application_access
  drop constraint if exists employee_application_access_delivery_hierarchy_attention_check,
  drop constraint if exists employee_application_access_learning_assignment_status_check,
  drop constraint if exists employee_application_access_delivery_role_check,
  drop column if exists academy_learning_state_synced_at,
  drop column if exists academy_learning_first_lesson_route,
  drop column if exists academy_learning_assigned_at,
  drop column if exists academy_learning_assignment_status,
  drop column if exists academy_learning_path_title,
  drop column if exists academy_learning_path_key,
  drop column if exists academy_learning_assignment_id,
  drop column if exists delivery_hierarchy_attention;

alter table employee_application_access
  add constraint employee_application_access_delivery_role_check
    check (delivery_operational_role is null or delivery_operational_role in ('MANAGER','TEAM_LEADER','SENIOR_SME','JUNIOR_SME'));

create or replace function validate_delivery_reporting_parent()
returns trigger as $$
declare
  parent_role text;
  expected_parent_role text;
begin
  if new.application_key <> 'SALES_ACADEMY'
     or new.academy_area <> 'DEVELOPMENT_OPERATIONS'
     or new.delivery_operational_role is null then
    return new;
  end if;
  expected_parent_role := case new.delivery_operational_role
    when 'TEAM_LEADER' then 'MANAGER'
    when 'SENIOR_SME' then 'TEAM_LEADER'
    when 'JUNIOR_SME' then 'TEAM_LEADER'
    else null
  end;
  if expected_parent_role is null then
    if new.delivery_reporting_parent_employee_id is not null then
      raise exception using errcode='23514', message='A Delivery Manager cannot have a Delivery reporting parent.';
    end if;
    return new;
  end if;
  if new.delivery_reporting_parent_employee_id is null then return new; end if;
  select parent.delivery_operational_role into parent_role
  from employee_application_access parent
  where parent.employee_id=new.delivery_reporting_parent_employee_id
    and parent.application_key=new.application_key
    and parent.academy_area='DEVELOPMENT_OPERATIONS';
  if parent_role is distinct from expected_parent_role then
    raise exception using errcode='23514',
      message=format('Invalid Delivery reporting relationship: %s must report to %s.',new.delivery_operational_role,expected_parent_role);
  end if;
  return new;
end;
$$ language plpgsql;

commit;
