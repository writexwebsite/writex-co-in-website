#!/usr/bin/env bash
set -Eeuo pipefail

EVENT_SLUG="${1:?Pass the canonical event slug.}"
ENV_FILE="${2:-/var/www/writex-co-in/shared/.env.production}"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -v event_slug="${EVENT_SLUG}" -P pager=off <<'SQL'
select 'public_state' as section,
  (select count(*) from active_festival_snapshots where state='active') as active_snapshots,
  (select count(*) from festival_studio_configurations where activation_status='scheduled') as scheduled_configurations;

select 'theme_state' as section,
  count(*) filter (where status='active') as active_themes,
  count(*) filter (where status='scheduled') as scheduled_themes
from holiday_themes;

select 'hero_pack' as section,
  designer.festival_slug,
  designer.variant_slug,
  designer.status as designer_status,
  imported.state as pack_state,
  designer.source_width,
  designer.source_height,
  count(derivative.id) as derivative_count
from designer_hero_packs designer
join festival_pack_imports imported on imported.id=designer.festival_pack_id
left join designer_hero_pack_derivatives derivative
  on derivative.designer_hero_pack_id=designer.id
where designer.festival_slug=:'event_slug'
group by designer.id,imported.id
order by designer.created_at desc;

select 'review_queue' as section,
  item.review_state,
  count(*) as item_count
from festival_asset_review_items item
join festival_asset_review_batches batch on batch.id=item.batch_id
where batch.stable_key='festival-uat-assets-v1'
  and item.festival_slug=:'event_slug'
group by item.review_state
order by item.review_state;

select 'review_assets' as section,
  item.display_name,
  item.category,
  left(item.checksum_sha256,12) as checksum_prefix,
  item.review_state,
  asset.review_status,
  asset.quality_status,
  library.approval_state,
  assignment.state as assignment_state
from festival_asset_review_items item
join festival_asset_review_batches batch on batch.id=item.batch_id
left join holiday_theme_assets asset
  on asset.id=(item.metadata_json->>'existingVersionAssetId')::uuid
left join festival_asset_library library on library.id=asset.library_asset_id
left join festival_asset_assignments assignment on assignment.asset_version_id=asset.id
where batch.stable_key='festival-uat-assets-v1'
  and item.festival_slug=:'event_slug'
order by item.category,item.display_name;
SQL
