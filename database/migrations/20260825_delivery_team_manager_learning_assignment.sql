begin;

alter table employee_application_access
  drop constraint if exists employee_application_access_delivery_role_check;

alter table employee_application_access
  add constraint employee_application_access_delivery_role_check
    check (delivery_operational_role is null or delivery_operational_role in ('MANAGER','TEAM_MANAGER','TEAM_LEADER','SENIOR_SME','JUNIOR_SME')),
  add column if not exists delivery_hierarchy_attention text,
  add column if not exists academy_learning_assignment_id uuid,
  add column if not exists academy_learning_path_key text,
  add column if not exists academy_learning_path_title text,
  add column if not exists academy_learning_assignment_status text not null default 'NOT_ASSIGNED',
  add column if not exists academy_learning_assigned_at timestamptz,
  add column if not exists academy_learning_first_lesson_route text,
  add column if not exists academy_learning_state_synced_at timestamptz;

alter table employee_application_access
  drop constraint if exists employee_application_access_delivery_hierarchy_attention_check,
  drop constraint if exists employee_application_access_learning_assignment_status_check;

alter table employee_application_access
  add constraint employee_application_access_delivery_hierarchy_attention_check
    check (delivery_hierarchy_attention is null or delivery_hierarchy_attention='TEAM_MANAGER_ASSIGNMENT_REQUIRED'),
  add constraint employee_application_access_learning_assignment_status_check
    check (academy_learning_assignment_status in ('NOT_ASSIGNED','ASSIGNED','ACTIVE','PAUSED','COMPLETED','INACTIVE','WITHDRAWN'));

update employee_application_access team_leader
set delivery_hierarchy_attention='TEAM_MANAGER_ASSIGNMENT_REQUIRED'
from employee_application_access manager
where team_leader.application_key='SALES_ACADEMY'
  and team_leader.academy_area='DEVELOPMENT_OPERATIONS'
  and team_leader.delivery_operational_role='TEAM_LEADER'
  and manager.employee_id=team_leader.delivery_reporting_parent_employee_id
  and manager.application_key=team_leader.application_key
  and manager.delivery_operational_role='MANAGER';

create index if not exists employee_application_access_learning_assignment_idx
  on employee_application_access(application_key,academy_area,academy_learning_assignment_status)
  where academy_area='DEVELOPMENT_OPERATIONS';

create or replace function validate_delivery_reporting_parent()
returns trigger as $$
declare
  parent_role text;
  expected_parent_role text;
begin
  if new.academy_area is distinct from 'DEVELOPMENT_OPERATIONS'
     or new.delivery_operational_role is null then
    return new;
  end if;

  expected_parent_role := case new.delivery_operational_role
    when 'TEAM_MANAGER' then 'MANAGER'
    when 'TEAM_LEADER' then 'TEAM_MANAGER'
    when 'SENIOR_SME' then 'TEAM_LEADER'
    when 'JUNIOR_SME' then 'TEAM_LEADER'
    else null
  end;

  if expected_parent_role is null then
    if new.delivery_reporting_parent_employee_id is not null then
      raise exception using errcode='23514', message='A Delivery Manager cannot have a Delivery reporting parent.';
    end if;
    new.delivery_hierarchy_attention := null;
    return new;
  end if;

  if new.delivery_reporting_parent_employee_id is null then
    return new;
  end if;

  select parent.delivery_operational_role into parent_role
  from employee_application_access parent
  where parent.employee_id=new.delivery_reporting_parent_employee_id
    and parent.application_key=new.application_key
    and parent.enabled
  limit 1;

  if new.delivery_operational_role='TEAM_LEADER' and parent_role='MANAGER'
     and tg_op='UPDATE'
     and old.delivery_operational_role='TEAM_LEADER'
     and old.delivery_reporting_parent_employee_id=new.delivery_reporting_parent_employee_id then
    new.delivery_hierarchy_attention := 'TEAM_MANAGER_ASSIGNMENT_REQUIRED';
    return new;
  end if;

  if parent_role is distinct from expected_parent_role then
    raise exception using errcode='23514',
      message=format('Invalid Delivery reporting relationship: %s must report to %s.',new.delivery_operational_role,expected_parent_role);
  end if;

  new.delivery_hierarchy_attention := null;
  return new;
end;
$$ language plpgsql;

commit;
