#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="/var/www/writex-co-in/shared/.env.production"
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

psql "${DATABASE_URL}" -Atqc "
  select jsonb_pretty(jsonb_build_object(
    'themeSlug', theme.slug,
    'themeStatus', theme.status,
    'configurationId', config.id,
    'configurationVersion', config.version,
    'studio', theme.experience_config -> 'studio'
  ))
  from holiday_themes theme
  join festival_studio_configurations config on config.theme_id = theme.id
  where theme.name ilike '%Independence Day%'
  order by config.updated_at desc
  limit 1
"
