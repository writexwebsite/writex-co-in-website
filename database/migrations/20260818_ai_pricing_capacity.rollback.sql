begin;

update ai_governance_products set
  input_usd_per_million_tokens = 1.00,
  cached_input_usd_per_million_tokens = 0.10,
  output_usd_per_million_tokens = 6.00,
  updated_at = now()
where product_key = 'SALES_ACADEMY';

alter table ai_usage_ledger
  drop constraint if exists ai_usage_ledger_cache_write_nonnegative_check,
  drop column if exists reconciliation_variance_usd,
  drop column if exists provider_reported_cost_inr,
  drop column if exists provider_reported_cost_usd,
  drop column if exists local_estimated_cost_inr,
  drop column if exists local_estimated_cost_usd,
  drop column if exists cache_write_tokens,
  drop column if exists pricing_version_id;

drop table if exists ai_training_activity_snapshots;
drop table if exists ai_training_capacity_settings;
drop table if exists ai_pricing_versions;

commit;
