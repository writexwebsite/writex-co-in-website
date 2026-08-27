-- Architecture hook for the future production Customer Master integration.
-- This migration is not applied by the localhost-only My WriteX V1 task.

alter table client_sessions
  add column if not exists auth_scope text not null default 'invoice',
  add column if not exists customer_master_id text;

alter table client_sessions
  alter column invoice_id drop not null;

alter table client_sessions
  drop constraint if exists client_sessions_auth_scope_check;

alter table client_sessions
  add constraint client_sessions_auth_scope_check check (
    (auth_scope = 'invoice' and invoice_id is not null and customer_master_id is null)
    or
    (auth_scope = 'customer' and customer_master_id is not null and invoice_id is null)
  );

create index if not exists client_sessions_customer_active_idx
  on client_sessions(customer_master_id, expires_at desc)
  where auth_scope = 'customer' and revoked_at is null;
