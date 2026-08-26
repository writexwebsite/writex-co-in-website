#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/writex-co-in"
CURRENT="$(readlink -f "${ROOT}/current")"
ENV_FILE="${ROOT}/shared/.env.production"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

psql "${DATABASE_URL}" -Atqc "
  select coalesce(json_agg(row_to_json(calendar_row) order by calendar_row.start_at nulls last, calendar_row.festival_name), '[]'::json)::text
  from (
    select
      configuration.id,
      configuration.festival_slug,
      configuration.festival_name,
      configuration.selected_variant_slug,
      configuration.start_at,
      configuration.end_at,
      configuration.repeat_yearly,
      configuration.activation_status
    from festival_studio_configurations configuration
    where configuration.activation_status <> 'incomplete'
  ) calendar_row;
"
