begin;

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'employee_application_access'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%SALES_ACADEMY%'
  loop
    execute format('alter table employee_application_access drop constraint %I', constraint_name);
  end loop;
end $$;

alter table employee_application_access
  add constraint employee_application_access_academy_role_check
  check (
    application_key <> 'SALES_ACADEMY'
    or application_role in ('EMPLOYEE', 'TRAINER', 'MANAGER_TL', 'SUPER_ADMIN')
  );

create table if not exists ai_governance_products (
  id uuid primary key default gen_random_uuid(),
  product_key text not null unique,
  display_name text not null,
  provider text not null check (provider in ('OPENAI')),
  provider_project_id text not null,
  provider_project_name text not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'PAUSED', 'BUDGET_PROTECTED')),
  model_id text not null,
  reasoning_effort text not null default 'none' check (reasoning_effort = 'none'),
  max_primary_calls_per_event integer not null default 1 check (max_primary_calls_per_event = 1),
  input_usd_per_million_tokens numeric(12,6) not null check (input_usd_per_million_tokens >= 0),
  cached_input_usd_per_million_tokens numeric(12,6) not null check (cached_input_usd_per_million_tokens >= 0),
  output_usd_per_million_tokens numeric(12,6) not null check (output_usd_per_million_tokens >= 0),
  higher_capability_fallback_enabled boolean not null default false,
  operating_target_inr numeric(12,2) not null check (operating_target_inr > 0),
  internal_safety_stop_inr numeric(12,2) not null check (internal_safety_stop_inr > 0),
  master_ceiling_inr numeric(12,2) not null check (master_ceiling_inr > 0),
  provider_hard_limit_usd numeric(12,2) not null check (provider_hard_limit_usd > 0),
  budget_fx_rate numeric(12,6) not null check (budget_fx_rate > 0),
  budget_fx_source text not null,
  budget_fx_updated_at timestamptz not null default now(),
  primary_superadmin_employee_id uuid references employees(id) on delete set null,
  last_provider_reconciled_at timestamptz,
  reconciliation_status text not null default 'PREPARED'
    check (reconciliation_status in ('PREPARED', 'ACTIVE', 'DEGRADED')),
  created_by_admin_id uuid references admin_users(id) on delete set null,
  updated_by_admin_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (operating_target_inr <= internal_safety_stop_inr),
  check (internal_safety_stop_inr <= master_ceiling_inr),
  check (master_ceiling_inr <= 5000),
  check (provider_hard_limit_usd <= 50),
  check (higher_capability_fallback_enabled = false)
);

create table if not exists ai_governance_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references ai_governance_products(id) on delete cascade,
  threshold_percent integer not null check (threshold_percent between 1 and 100),
  channel text not null default 'EMAIL' check (channel in ('EMAIL', 'ADMIN_UI')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now(),
  unique (product_id, threshold_percent, channel)
);

create table if not exists ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  product_id uuid not null references ai_governance_products(id) on delete restrict,
  environment text not null,
  occurred_at timestamptz not null,
  employee_id text,
  employee_display_name text,
  application_session_id text,
  customer_relationship_id text,
  provider text not null,
  provider_project_id text not null,
  provider_request_id text,
  model_id text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  cached_input_tokens integer not null default 0 check (cached_input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  reasoning_tokens integer not null default 0 check (reasoning_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  visible_customer_bubbles integer not null default 0 check (visible_customer_bubbles >= 0),
  estimated_cost_usd numeric(16,8),
  estimated_cost_inr numeric(16,6),
  outcome text not null,
  latency_ms integer not null default 0 check (latency_ms >= 0),
  failure_type text,
  retry_count integer not null default 0 check (retry_count >= 0),
  ingested_at timestamptz not null default now(),
  unique (product_id, event_id)
);

create index if not exists ai_usage_ledger_product_month_idx
  on ai_usage_ledger(product_id, occurred_at desc);
create index if not exists ai_usage_ledger_employee_idx
  on ai_usage_ledger(product_id, employee_id, occurred_at desc);
create index if not exists ai_usage_ledger_session_idx
  on ai_usage_ledger(product_id, application_session_id, occurred_at desc);
create index if not exists ai_usage_ledger_model_idx
  on ai_usage_ledger(product_id, model_id, occurred_at desc);

create table if not exists ai_cost_reconciliations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references ai_governance_products(id) on delete restrict,
  period_start timestamptz not null,
  period_end timestamptz not null,
  local_estimated_usd numeric(16,8) not null default 0,
  provider_reported_usd numeric(16,8),
  variance_usd numeric(16,8),
  status text not null check (status in ('PREPARED', 'RECONCILED', 'DELAYED', 'FAILED')),
  provider_reference text,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, period_start, period_end)
);

create table if not exists ai_governance_internal_nonces (
  service_id text not null,
  key_id text not null,
  nonce text not null,
  expires_at timestamptz not null,
  primary key (service_id, key_id, nonce)
);

insert into ai_governance_products (
  product_key, display_name, provider, provider_project_id, provider_project_name,
  model_id, reasoning_effort, max_primary_calls_per_event,
  input_usd_per_million_tokens, cached_input_usd_per_million_tokens, output_usd_per_million_tokens,
  operating_target_inr, internal_safety_stop_inr, master_ceiling_inr,
  provider_hard_limit_usd, budget_fx_rate, budget_fx_source
) values (
  'SALES_ACADEMY', 'Sales Academy', 'OPENAI',
  'proj_eQnv7LtFWhqFn7G3HoDhBwZU', 'WriteX Sales Academy', 'gpt-5.6-luna',
  'none', 1, 1.00, 0.10, 6.00,
  4000, 4500, 5000, 50, 100,
  'Founder-approved safety parity: USD 50 equals the INR 5,000 ceiling; not a live FX quote.'
) on conflict (product_key) do update set
  display_name = excluded.display_name,
  provider = excluded.provider,
  provider_project_id = excluded.provider_project_id,
  provider_project_name = excluded.provider_project_name,
  model_id = excluded.model_id,
  reasoning_effort = excluded.reasoning_effort,
  max_primary_calls_per_event = excluded.max_primary_calls_per_event,
  input_usd_per_million_tokens = excluded.input_usd_per_million_tokens,
  cached_input_usd_per_million_tokens = excluded.cached_input_usd_per_million_tokens,
  output_usd_per_million_tokens = excluded.output_usd_per_million_tokens,
  operating_target_inr = excluded.operating_target_inr,
  internal_safety_stop_inr = excluded.internal_safety_stop_inr,
  master_ceiling_inr = excluded.master_ceiling_inr,
  provider_hard_limit_usd = excluded.provider_hard_limit_usd,
  budget_fx_rate = excluded.budget_fx_rate,
  budget_fx_source = excluded.budget_fx_source,
  higher_capability_fallback_enabled = false,
  updated_at = now();

insert into ai_governance_alerts (product_id, threshold_percent, channel)
select id, threshold, 'ADMIN_UI'
from ai_governance_products
cross join unnest(array[70,85,95,100]) as thresholds(threshold)
where product_key = 'SALES_ACADEMY'
on conflict (product_id, threshold_percent, channel) do nothing;

create or replace function ai_governance_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ai_governance_products_updated_at on ai_governance_products;
create trigger ai_governance_products_updated_at
before update on ai_governance_products
for each row execute function ai_governance_set_updated_at();

commit;
