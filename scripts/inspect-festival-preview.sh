#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <preview-snapshot-id>" >&2
  exit 2
fi
SNAPSHOT_ID="$1"
if [[ ! "${SNAPSHOT_ID}" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  echo "invalid snapshot id" >&2
  exit 2
fi

ENV_FILE="/var/www/writex-co-in/shared/.env.production"
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

psql "${DATABASE_URL}" -Atqc "
  select jsonb_pretty(jsonb_build_object(
    'id', preview.id,
    'festivalSlug', preview.festival_slug,
    'themeSlug', theme.slug,
    'themeStatus', theme.status,
    'variantSlug', preview.variant_slug,
    'targetSurfaces', preview.target_surfaces,
    'sceneState', preview.snapshot_payload -> 'sceneState',
    'behaviorSettings', preview.snapshot_payload -> 'behaviorSettings',
    'sceneAssignments', preview.snapshot_payload #> '{customOverrides,sceneConfiguration,motifAssignments}',
    'expiresAt', preview.expires_at
  ))
  from festival_preview_snapshots preview
  join festival_studio_configurations config on config.id = preview.configuration_id
  left join holiday_themes theme on theme.id = config.theme_id
  where preview.id = '${SNAPSHOT_ID}'::uuid
"
