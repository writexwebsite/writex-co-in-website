#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/writex-co-in"
RELEASE_ID="${1:?Release ID is required.}"
BACKUP_DIR="${ROOT}/backups/deployments/${RELEASE_ID}"

mkdir -p "${BACKUP_DIR}"
printf '%s\n' "$(readlink -f "${ROOT}/current")" > "${BACKUP_DIR}/previous-release.txt"
cp -p "${ROOT}/shared/.env.production" "${BACKUP_DIR}/env.production.backup"

set -a
# shellcheck disable=SC1091
source "${ROOT}/shared/.env.production"
set +a

pg_dump "${DATABASE_URL}" | gzip -9 > "${BACKUP_DIR}/database-before-login-theme-8k.sql.gz"
printf 'backup=%s\n' "${BACKUP_DIR}"
