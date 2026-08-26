#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${1:-/var/www/writex-co-in/shared/.env.production}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Production environment file was not found." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not configured." >&2
  exit 1
fi

database_name="$(psql "${DATABASE_URL}" -Atqc "select current_database()")"
if [[ "${database_name}" != "writex_co_in" ]]; then
  echo "Refusing to continue against an unexpected database." >&2
  exit 1
fi

prerequisites="$(
  psql "${DATABASE_URL}" -Atqc "
    select concat_ws(
      '|',
      to_regclass('public.holiday_themes') is not null,
      to_regclass('public.holiday_theme_assets') is not null,
      to_regclass('public.website_experience_settings') is not null,
      to_regclass('public.admin_users') is not null
    )
  "
)"

if [[ "${prerequisites}" != "t|t|t|t" ]]; then
  echo "Festival migration prerequisites are incomplete: ${prerequisites}" >&2
  exit 1
fi

echo "Festival migration prerequisites verified for writex_co_in."
