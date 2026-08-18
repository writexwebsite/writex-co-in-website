begin;

drop trigger if exists ai_governance_products_updated_at on ai_governance_products;
drop function if exists ai_governance_set_updated_at();
drop table if exists ai_governance_internal_nonces;
drop table if exists ai_cost_reconciliations;
drop table if exists ai_usage_ledger;
drop table if exists ai_governance_alerts;
drop table if exists ai_governance_products;

alter table employee_application_access
  drop constraint if exists employee_application_access_academy_role_check;
alter table employee_application_access
  add constraint employee_application_access_academy_role_check
  check (
    application_key <> 'SALES_ACADEMY'
    or application_role in ('EMPLOYEE', 'MANAGER_TL')
  );

commit;
