begin;

create temporary table delivery_hierarchy_correction_work on commit drop as
select junior.employee_id,
       junior.delivery_reporting_parent_employee_id previous_parent_employee_id,
       senior.delivery_reporting_parent_employee_id corrected_parent_employee_id,
       junior.sync_status previous_sync_status,
       junior.last_sync_error previous_sync_error
from employee_application_access junior
join employee_application_access senior
  on senior.employee_id=junior.delivery_reporting_parent_employee_id
 and senior.application_key=junior.application_key
 and senior.academy_area='DEVELOPMENT_OPERATIONS'
 and senior.delivery_operational_role='SENIOR_SME'
left join employee_application_access team_leader
  on team_leader.employee_id=senior.delivery_reporting_parent_employee_id
 and team_leader.application_key=junior.application_key
 and team_leader.academy_area='DEVELOPMENT_OPERATIONS'
 and team_leader.delivery_operational_role='TEAM_LEADER'
where junior.application_key='SALES_ACADEMY'
  and junior.academy_area='DEVELOPMENT_OPERATIONS'
  and junior.delivery_operational_role='JUNIOR_SME';

insert into audit_logs(actor_type,actor_id,entity_type,entity_id,action,metadata)
select 'system','FOUNDER_DELIVERY_HIERARCHY_CORRECTION','employee',employee_id::text,
       case when corrected_parent_employee_id is null
         then 'delivery_hierarchy_attention_required'
         else 'delivery_hierarchy_corrected'
       end,
       jsonb_build_object(
         'previousReportingParentEmployeeId', previous_parent_employee_id,
         'newReportingParentEmployeeId', corrected_parent_employee_id,
         'previousSyncStatus', previous_sync_status,
         'previousSyncError', previous_sync_error,
         'reason', 'FOUNDER_DELIVERY_HIERARCHY_CORRECTION',
         'migrationId', '20260824_delivery_hierarchy_correction'
       )
from delivery_hierarchy_correction_work;

update employee_application_access access
set delivery_reporting_parent_employee_id=work.corrected_parent_employee_id,
    updated_at=now()
from delivery_hierarchy_correction_work work
where access.employee_id=work.employee_id
  and access.application_key='SALES_ACADEMY'
  and work.corrected_parent_employee_id is not null;

update employee_application_access access
set sync_status='FAILED',
    last_sync_error='FOUNDER_DELIVERY_HIERARCHY_CORRECTION: Junior SME must report directly to a Team Leader. The correct Team Leader could not be established; authorised Website Admin resolution is required.',
    updated_at=now()
from delivery_hierarchy_correction_work work
where access.employee_id=work.employee_id
  and access.application_key='SALES_ACADEMY'
  and work.corrected_parent_employee_id is null;

create or replace function validate_delivery_reporting_parent()
returns trigger as $$
declare
  expected_parent_role text;
  parent_role text;
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

  if new.delivery_reporting_parent_employee_id is null then
    return new;
  end if;

  select parent.delivery_operational_role
    into parent_role
  from employee_application_access parent
  where parent.employee_id=new.delivery_reporting_parent_employee_id
    and parent.application_key=new.application_key
    and parent.academy_area='DEVELOPMENT_OPERATIONS';

  if parent_role is distinct from expected_parent_role then
    raise exception using errcode='23514',
      message=format('Invalid Delivery reporting relationship: %s must report to %s.', new.delivery_operational_role, expected_parent_role);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists employee_application_access_delivery_parent_guard on employee_application_access;
create trigger employee_application_access_delivery_parent_guard
before insert or update of academy_area,delivery_operational_role,delivery_reporting_parent_employee_id
on employee_application_access
for each row execute function validate_delivery_reporting_parent();

commit;
