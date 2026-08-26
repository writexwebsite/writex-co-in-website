#!/usr/bin/env bash
set -euo pipefail

source /var/www/writex-co-in/current/.env.production

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -F '|' -At <<'SQL'
select
  batch.stable_key,
  item.display_name,
  item.festival_name,
  item.review_state,
  left(item.checksum_sha256, 16),
  coalesce(item.metadata_json->>'anchor', ''),
  coalesce(item.metadata_json->'axoPlacement'->>'coordinateSpace', ''),
  coalesce(item.metadata_json->'axoPlacement'->>'anchor', ''),
  coalesce(item.metadata_json->>'existingVersionAssetId', '')
from festival_asset_review_items item
join festival_asset_review_batches batch on batch.id = item.batch_id
where item.category = 'axo'
order by batch.stable_key, item.festival_name, item.display_name;
SQL
