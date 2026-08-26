#!/usr/bin/env bash
set -Eeuo pipefail

set -a
# shellcheck disable=SC1090
source /var/www/writex-co-in/shared/.env.production
set +a

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atqc "
  select jsonb_pretty(jsonb_build_object(
    'snapshotId', id,
    'festivalSlug', festival_slug,
    'variantName', variant_name,
    'variantSlug', variant_slug,
    'targetSurfaces', target_surfaces,
    'configurationHash', configuration_hash,
    'sceneState', snapshot_payload -> 'sceneState',
    'behaviorSettings', snapshot_payload -> 'behaviorSettings',
    'sceneConfiguration', snapshot_payload #> '{customOverrides,sceneConfiguration}'
  ))
  from active_festival_snapshots
  where state = 'active'
  order by activated_at desc
  limit 1;
"
