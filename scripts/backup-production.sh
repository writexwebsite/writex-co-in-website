#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"
ENV_FILE="${APP_ROOT}/shared/.env.production"
BACKUP_DIR="${APP_ROOT}/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing shared production environment: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for a production backup." >&2
  exit 1
fi

database_name="$(psql "${DATABASE_URL}" -Atqc "select current_database()")"
if [[ "${database_name}" != "writex_co_in" ]]; then
  echo "Refusing backup: connected database is '${database_name}', not 'writex_co_in'." >&2
  exit 1
fi

install -d -m 750 "${BACKUP_DIR}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${BACKUP_DIR}/writex_co_in_${timestamp}.dump"

umask 077
pg_dump --format=custom --no-owner --no-privileges --file="${backup_file}" "${DATABASE_URL}"
pg_restore --list "${backup_file}" >/dev/null
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'writex_co_in_*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "Verified backup created: ${backup_file}"
