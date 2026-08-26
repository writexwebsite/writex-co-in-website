\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select 'configurations=' || count(*)
from festival_studio_configurations;

select 'legacy_records=' || count(*)
from festival_studio_legacy_records;

select 'independence_configuration=' || count(*)
from festival_studio_configurations
where festival_slug = 'independence-day'
  and axo_asset_id is not null
  and axo_enabled = true;

select 'independence_active_axo_assignments=' || count(*)
from festival_studio_configurations configuration
join festival_asset_assignments assignment
  on assignment.theme_id = configuration.theme_id
 and assignment.asset_version_id = configuration.axo_asset_id
 and assignment.placement = 'axo_theme_reference'
 and assignment.state = 'active'
where configuration.festival_slug = 'independence-day';

select 'independence_axo_file=' || asset.safe_file_name
from festival_studio_configurations configuration
join holiday_theme_assets asset on asset.id = configuration.axo_asset_id
where configuration.festival_slug = 'independence-day';

select 'active_public_festival=' || coalesce(
  (select festival_slug from festival_studio_configurations where activation_status = 'active' limit 1),
  'default'
);
