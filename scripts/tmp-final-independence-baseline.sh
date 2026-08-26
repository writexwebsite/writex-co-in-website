#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"
ENV_FILE="${APP_ROOT}/shared/.env.production"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${APP_ROOT}/backups/final-independence-quality/${STAMP}"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

mkdir -p "${BACKUP_DIR}"
readlink -f "${APP_ROOT}/current" > "${BACKUP_DIR}/active-release.txt"
pm2 jlist > "${BACKUP_DIR}/pm2-before.json"
pg_dump --format=custom --no-owner --no-acl "${DATABASE_URL}" > "${BACKUP_DIR}/database-before.dump"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atqc "
  select jsonb_pretty(jsonb_build_object(
    'activeSnapshots', count(*) filter (where state = 'active'),
    'scheduledConfigurations', (
      select count(*) from festival_studio_configurations where activation_status = 'scheduled'
    ),
    'independenceSnapshotId', max(id::text) filter (
      where state = 'active' and festival_slug = 'independence-day'
    ),
    'independenceConfigHash', max(configuration_hash) filter (
      where state = 'active' and festival_slug = 'independence-day'
    ),
    'targetSurfaces', (
      array_agg(to_jsonb(target_surfaces)) filter (
        where state = 'active' and festival_slug = 'independence-day'
      )
    )[1]
  ))
  from active_festival_snapshots;
" | tee "${BACKUP_DIR}/snapshot-summary.json"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atqc "
  select jsonb_pretty(jsonb_build_object(
    'festivalSlug', config.festival_slug,
    'activationStatus', config.activation_status,
    'configurationId', config.id,
    'configurationVersion', config.version,
    'selectedPackId', config.selected_variant_pack_id,
    'selectedVariantSlug', config.selected_variant_slug,
    'draftVersion', draft.draft_version,
    'configurationHash', draft.configuration_hash,
    'assignments', coalesce(draft.asset_assignments, '{}'::jsonb)
  ))
  from festival_studio_configurations config
  left join festival_draft_configurations draft on draft.configuration_id = config.id
  where config.festival_slug = 'independence-day'
  order by config.updated_at desc, draft.updated_at desc nulls last
  limit 1;
" | tee "${BACKUP_DIR}/independence-state.json"

sha256sum "${BACKUP_DIR}/database-before.dump" > "${BACKUP_DIR}/database-before.sha256"
printf 'backup=%s\n' "${BACKUP_DIR}"
