alter table employee_application_access
  add column if not exists employee_segment text;

update employee_application_access
set employee_segment = case
  when application_key='SALES_ACADEMY' and external_application_user_id is not null then 'SENIOR_BDE'
  else 'NEW_BDE'
end
where employee_segment is null;

alter table employee_application_access
  alter column employee_segment set default 'NEW_BDE',
  alter column employee_segment set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='employee_application_access_segment_check') then
    alter table employee_application_access
      add constraint employee_application_access_segment_check
      check (employee_segment in ('NEW_BDE','SENIOR_BDE'));
  end if;
end $$;

create index if not exists employee_application_access_segment_idx
  on employee_application_access(application_key,employee_segment,enabled);
