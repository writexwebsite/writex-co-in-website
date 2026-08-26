#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/writex-co-in"
MIGRATION="${1:?Migration path is required.}"
RELEASE_ID="${2:?Release ID is required.}"
BACKUP_DIR="${ROOT}/backups/deployments/${RELEASE_ID}"

if [[ ! -f "${MIGRATION}" ]]; then
  echo "Login theme composer migration was not found." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
readlink -f "${ROOT}/current" > "${BACKUP_DIR}/previous-release.txt"
cp -p "${ROOT}/shared/.env.production" "${BACKUP_DIR}/env.production.backup"
chmod 600 "${BACKUP_DIR}/env.production.backup"

set -a
# shellcheck disable=SC1091
source "${ROOT}/shared/.env.production"
set +a

pg_dump "${DATABASE_URL}" | gzip -9 > "${BACKUP_DIR}/database-before-login-theme-composer.sql.gz"
chmod 600 "${BACKUP_DIR}/database-before-login-theme-composer.sql.gz"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${MIGRATION}"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "
  select count(*)
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'holiday_login_theme_settings'
    and column_name in (
      'composition_config',
      'version_number',
      'approval_state',
      'previous_approved_config',
      'last_validated_at',
      'approved_at',
      'approved_by'
    );
"

printf 'backup=%s\n' "${BACKUP_DIR}"
printf 'migration=applied\n'
