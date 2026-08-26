#!/usr/bin/env bash
set -Eeuo pipefail

APP_SOURCE="${1:-$(pwd)}"
ENV_FILE="${2:-/var/www/writex-co-in/shared/.env.production}"
MIGRATION_FILE="${APP_SOURCE}/database/migrations/20260728_festival_experience_completion.sql"

bash "${APP_SOURCE}/scripts/verify-festival-prerequisites.sh" "${ENV_FILE}"

if [[ ! -f "${MIGRATION_FILE}" ]]; then
  echo "Festival completion migration was not found." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${MIGRATION_FILE}"

verification="$(
  psql "${DATABASE_URL}" -Atqc "
    select concat_ws(
      '|',
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'holiday_themes'
          and column_name = 'experience_config'
      ),
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'holiday_theme_assets'
          and column_name = 'review_status'
      ),
      to_regclass('public.holiday_login_theme_settings') is not null,
      to_regclass('public.integration_health_snapshots') is not null
    )
  "
)"

if [[ "${verification}" != "t|t|t|t" ]]; then
  echo "Festival migration verification failed: ${verification}" >&2
  exit 1
fi

echo "Festival completion migration verified."
