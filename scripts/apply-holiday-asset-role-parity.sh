#!/usr/bin/env bash
set -Eeuo pipefail

APP_SOURCE="${1:-$(pwd)}"
ENV_FILE="${2:-/var/www/writex-co-in/shared/.env.production}"
MIGRATION_FILE="${APP_SOURCE}/database/migrations/20260804_holiday_asset_role_parity.sql"

if [[ ! -f "${MIGRATION_FILE}" ]]; then
  echo "Holiday asset-role parity migration was not found." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${MIGRATION_FILE}"

constraint_definition="$(
  psql "${DATABASE_URL}" -Atqc "
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'holiday_theme_assets'::regclass
      and conname = 'holiday_theme_assets_asset_role_check'
  "
)"

for required_role in footer homepage_background inner_page announcement; do
  if [[ "${constraint_definition}" != *"'${required_role}'"* ]]; then
    echo "Asset-role parity verification failed for ${required_role}." >&2
    exit 1
  fi
done

echo "Holiday asset-role parity migration verified."
