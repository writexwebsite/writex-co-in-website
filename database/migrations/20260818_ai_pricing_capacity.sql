begin;

create table if not exists ai_pricing_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references ai_governance_products(id) on delete restrict,
  pricing_version_key text not null,
  provider text not null check (provider = 'OPENAI'),
  model_id text not null check (model_id = 'gpt-5.6-luna'),
  service_tier text not null check (service_tier = 'STANDARD'),
  context_tier text not null check (context_tier in ('SHORT','LONG')),
  input_usd_per_million_tokens numeric(12,6) not null check (input_usd_per_million_tokens >= 0),
  cached_input_usd_per_million_tokens numeric(12,6) not null check (cached_input_usd_per_million_tokens >= 0),
  cache_write_usd_per_million_tokens numeric(12,6) not null check (cache_write_usd_per_million_tokens >= 0),
  output_usd_per_million_tokens numeric(12,6) not null check (output_usd_per_million_tokens >= 0),
  long_context_threshold_tokens integer not null check (long_context_threshold_tokens > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  effective_at timestamptz not null,
  verified_at timestamptz not null,
  source_url text not null,
  model_source_url text not null,
  active boolean not null default false,
  changed_by_admin_id uuid references admin_users(id) on delete set null,
  change_reason text not null,
  created_at timestamptz not null default now(),
  unique (product_id, pricing_version_key, context_tier)
);

create unique index if not exists ai_pricing_versions_active_tier_idx
  on ai_pricing_versions(product_id, model_id, service_tier, context_tier)
  where active;

alter table ai_usage_ledger
  add column if not exists pricing_version_id uuid references ai_pricing_versions(id) on delete restrict,
  add column if not exists cache_write_tokens integer not null default 0,
  add column if not exists local_estimated_cost_usd numeric(16,8),
  add column if not exists local_estimated_cost_inr numeric(16,6),
  add column if not exists provider_reported_cost_usd numeric(16,8),
  add column if not exists provider_reported_cost_inr numeric(16,6),
  add column if not exists reconciliation_variance_usd numeric(16,8);

alter table ai_usage_ledger
  drop constraint if exists ai_usage_ledger_cache_write_nonnegative_check,
  add constraint ai_usage_ledger_cache_write_nonnegative_check check (cache_write_tokens >= 0);

create table if not exists ai_training_capacity_settings (
  product_id uuid primary key references ai_governance_products(id) on delete cascade,
  planned_bdes integer not null check (planned_bdes between 1 and 10000),
  training_days_per_month integer not null check (training_days_per_month between 1 and 31),
  planned_training_months integer not null check (planned_training_months between 1 and 60),
  session_minutes_min integer not null check (session_minutes_min between 5 and 480),
  session_minutes_max integer not null check (session_minutes_max between session_minutes_min and 480),
  light_events_per_bde_day integer not null check (light_events_per_bde_day > 0),
  normal_events_per_bde_day integer not null check (normal_events_per_bde_day >= light_events_per_bde_day),
  rigorous_events_per_bde_day integer not null check (rigorous_events_per_bde_day >= normal_events_per_bde_day),
  updated_by_admin_id uuid references admin_users(id) on delete set null,
  change_reason text not null default 'Founder-approved pilot planning assumptions.',
  updated_at timestamptz not null default now()
);

create table if not exists ai_training_activity_snapshots (
  product_id uuid not null references ai_governance_products(id) on delete cascade,
  month_start date not null,
  active_bdes integer not null default 0 check (active_bdes >= 0),
  bde_messages_sent integer not null default 0 check (bde_messages_sent >= 0),
  ai_response_events integer not null default 0 check (ai_response_events >= 0),
  visible_customer_bubbles integer not null default 0 check (visible_customer_bubbles >= 0),
  training_sessions integer not null default 0 check (training_sessions >= 0),
  captured_at timestamptz not null default now(),
  primary key (product_id, month_start)
);

with product as (
  select id from ai_governance_products where product_key = 'SALES_ACADEMY'
)
insert into ai_pricing_versions (
  product_id, pricing_version_key, provider, model_id, service_tier, context_tier,
  input_usd_per_million_tokens, cached_input_usd_per_million_tokens,
  cache_write_usd_per_million_tokens, output_usd_per_million_tokens,
  long_context_threshold_tokens, effective_at, verified_at, source_url,
  model_source_url, active, change_reason
)
select id, 'luna-standard-legacy-pre-20260818', 'OPENAI', 'gpt-5.6-luna', 'STANDARD', 'SHORT',
       1.00, 0.10, 0.00, 6.00, 272000,
       '2026-08-01T00:00:00Z', '2026-08-18T00:00:00Z',
       'https://developers.openai.com/api/docs/pricing',
       'https://developers.openai.com/api/docs/models/gpt-5.6-luna', false,
       'Historical local estimator retained for reproducibility; never provider-reported billing.'
from product
on conflict (product_id, pricing_version_key, context_tier) do nothing;

with product as (
  select id from ai_governance_products where product_key = 'SALES_ACADEMY'
), tiers as (
  select 'SHORT'::text context_tier, 0.20::numeric input_rate, 0.02::numeric cached_rate,
         0.25::numeric write_rate, 1.20::numeric output_rate
  union all
  select 'LONG', 0.40, 0.04, 0.50, 1.80
)
insert into ai_pricing_versions (
  product_id, pricing_version_key, provider, model_id, service_tier, context_tier,
  input_usd_per_million_tokens, cached_input_usd_per_million_tokens,
  cache_write_usd_per_million_tokens, output_usd_per_million_tokens,
  long_context_threshold_tokens, effective_at, verified_at, source_url,
  model_source_url, active, change_reason
)
select p.id, 'luna-standard-20260818-v1', 'OPENAI', 'gpt-5.6-luna', 'STANDARD', t.context_tier,
       t.input_rate, t.cached_rate, t.write_rate, t.output_rate, 272000,
       '2026-08-18T00:00:00Z', now(),
       'https://developers.openai.com/api/docs/pricing',
       'https://developers.openai.com/api/docs/models/gpt-5.6-luna',
       not exists (select 1 from ai_pricing_versions current where current.product_id=p.id and current.active),
       'Correct the Luna Standard estimator to the Founder-verified official short- and long-context rates.'
from product p cross join tiers t
on conflict (product_id, pricing_version_key, context_tier) do update set
  input_usd_per_million_tokens = excluded.input_usd_per_million_tokens,
  cached_input_usd_per_million_tokens = excluded.cached_input_usd_per_million_tokens,
  cache_write_usd_per_million_tokens = excluded.cache_write_usd_per_million_tokens,
  output_usd_per_million_tokens = excluded.output_usd_per_million_tokens,
  long_context_threshold_tokens = excluded.long_context_threshold_tokens,
  verified_at = excluded.verified_at,
  source_url = excluded.source_url,
  model_source_url = excluded.model_source_url,
  active = ai_pricing_versions.active,
  change_reason = excluded.change_reason;

insert into ai_training_capacity_settings (
  product_id, planned_bdes, training_days_per_month, planned_training_months,
  session_minutes_min, session_minutes_max, light_events_per_bde_day,
  normal_events_per_bde_day, rigorous_events_per_bde_day
)
select id, 25, 26, 2, 45, 60, 50, 75, 100
from ai_governance_products where product_key='SALES_ACADEMY'
on conflict (product_id) do nothing;

update ai_governance_products p set
  input_usd_per_million_tokens = v.input_usd_per_million_tokens,
  cached_input_usd_per_million_tokens = v.cached_input_usd_per_million_tokens,
  output_usd_per_million_tokens = v.output_usd_per_million_tokens,
  updated_at = now()
from ai_pricing_versions v
where p.product_key = 'SALES_ACADEMY' and v.product_id=p.id and v.active and v.context_tier='SHORT';

with rates as (
  select v.* from ai_pricing_versions v
  join ai_governance_products p on p.id=v.product_id
  where p.product_key='SALES_ACADEMY' and v.active
)
update ai_usage_ledger l set
  pricing_version_id = r.id,
  local_estimated_cost_usd = (
    greatest(l.input_tokens-l.cached_input_tokens,0) * r.input_usd_per_million_tokens
    + least(l.cached_input_tokens,l.input_tokens) * r.cached_input_usd_per_million_tokens
    + l.cache_write_tokens * r.cache_write_usd_per_million_tokens
    + l.output_tokens * r.output_usd_per_million_tokens
  ) / 1000000,
  local_estimated_cost_inr = (
    greatest(l.input_tokens-l.cached_input_tokens,0) * r.input_usd_per_million_tokens
    + least(l.cached_input_tokens,l.input_tokens) * r.cached_input_usd_per_million_tokens
    + l.cache_write_tokens * r.cache_write_usd_per_million_tokens
    + l.output_tokens * r.output_usd_per_million_tokens
  ) / 1000000 * p.budget_fx_rate,
  reconciliation_variance_usd = case when l.provider_reported_cost_usd is null then null else
    l.provider_reported_cost_usd - (
      greatest(l.input_tokens-l.cached_input_tokens,0) * r.input_usd_per_million_tokens
      + least(l.cached_input_tokens,l.input_tokens) * r.cached_input_usd_per_million_tokens
      + l.cache_write_tokens * r.cache_write_usd_per_million_tokens
      + l.output_tokens * r.output_usd_per_million_tokens
    ) / 1000000 end
from rates r
join ai_governance_products p on p.id=r.product_id
where l.product_id=r.product_id
  and l.model_id='gpt-5.6-luna'
  and r.context_tier = case when l.input_tokens > r.long_context_threshold_tokens then 'LONG' else 'SHORT' end;

commit;
