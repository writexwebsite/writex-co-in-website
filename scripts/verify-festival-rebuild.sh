#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/writex-co-in"
RELEASE_ID="${1:?Release ID is required.}"
BACKUP_DIR="${ROOT}/backups/deployments/${RELEASE_ID}"

printf 'current=%s\n' "$(readlink -f "${ROOT}/current")"
pm2 status

printf 'local_writex=%s\n' "$(
  curl -fsS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:3002/api/health
)"
printf 'public_writex=%s\n' "$(
  curl -fsS -o /dev/null -w '%{http_code}' \
    https://www.writex.co.in/api/health
)"
printf 'local_thewritex=%s\n' "$(
  curl -fsS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:3001
)"
printf 'public_thewritex=%s\n' "$(
  curl -fsS -o /dev/null -w '%{http_code}' \
    https://thewritex.com
)"

set -a
# shellcheck disable=SC1091
source "${ROOT}/shared/.env.production"
set +a

column_count="$(
  psql "${DATABASE_URL}" -Atc "
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'holiday_theme_assets'
      and column_name in (
        'quality_status',
        'version_number',
        'previous_asset_id',
        'clarity_confirmation_at'
      );
  "
)"
printf 'quality_columns=%s\n' "${column_count}"

printf 'backup_env=%s\n' "$(
  [[ -f "${BACKUP_DIR}/env.production.backup" ]] && echo present || echo missing
)"
printf 'backup_database=%s\n' "$(
  [[ -s "${BACKUP_DIR}/database-pre-festival.dump" ]] && echo present || echo missing
)"
printf 'backup_pointer=%s\n' "$(
  [[ -s "${BACKUP_DIR}/previous-release.txt" ]] && echo present || echo missing
)"

printf 'theme_resolver=%s\n' "$(
  curl -fsS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:3002/api/website-experience/theme
)"
printf 'admin_route=%s\n' "$(
  curl -sS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:3002/admin/website-experience
)"
