begin;

drop trigger if exists employee_application_access_delivery_parent_guard on employee_application_access;
drop function if exists validate_delivery_reporting_parent();

with corrections as (
  select entity_id::uuid employee_id,
         (metadata->>'previousReportingParentEmployeeId')::uuid previous_parent_employee_id
  from audit_logs
  where actor_id='FOUNDER_DELIVERY_HIERARCHY_CORRECTION'
    and action='delivery_hierarchy_corrected'
    and metadata->>'migrationId'='20260824_delivery_hierarchy_correction'
)
update employee_application_access access
set delivery_reporting_parent_employee_id=corrections.previous_parent_employee_id,
    updated_at=now()
from corrections
where access.employee_id=corrections.employee_id
  and access.application_key='SALES_ACADEMY';

with attention as (
  select entity_id::uuid employee_id,
         metadata->>'previousSyncStatus' previous_sync_status,
         nullif(metadata->>'previousSyncError','') previous_sync_error
  from audit_logs
  where actor_id='FOUNDER_DELIVERY_HIERARCHY_CORRECTION'
    and action='delivery_hierarchy_attention_required'
    and metadata->>'migrationId'='20260824_delivery_hierarchy_correction'
)
update employee_application_access access
set sync_status=attention.previous_sync_status,
    last_sync_error=attention.previous_sync_error,
    updated_at=now()
from attention
where access.employee_id=attention.employee_id
  and access.application_key='SALES_ACADEMY';

insert into audit_logs(actor_type,actor_id,entity_type,action,metadata)
values ('system','FOUNDER_DELIVERY_HIERARCHY_CORRECTION','migration','delivery_hierarchy_correction_rollback',
  jsonb_build_object('reason','Rollback of FOUNDER_DELIVERY_HIERARCHY_CORRECTION','migrationId','20260824_delivery_hierarchy_correction'));

commit;
