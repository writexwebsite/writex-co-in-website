#!/usr/bin/env bash
set -Eeuo pipefail

QA_DATABASE="writex_co_in_login_theme_qa"
FOCAL_X="${1:?Focal X is required.}"
ZOOM="${2:?Zoom is required.}"

sudo -n -u postgres psql "${QA_DATABASE}" -v ON_ERROR_STOP=1 \
  -v focal_x="${FOCAL_X}" \
  -v zoom="${ZOOM}" <<'SQL'
update holiday_login_theme_settings
set
  composition_config = jsonb_set(
    jsonb_set(
      jsonb_set(
        composition_config,
        '{hero,focalX}',
        to_jsonb(:'focal_x'::numeric),
        true
      ),
      '{hero,zoom}',
      to_jsonb(:'zoom'::numeric),
      true
    ),
    '{hero,embeddedUiState}',
    '"contains_embedded_ui"'::jsonb,
    true
  ),
  updated_at = now()
where channel = 'client';

select
  channel,
  composition_config #>> '{hero,focalX}' as focal_x,
  composition_config #>> '{hero,zoom}' as zoom,
  composition_config #>> '{hero,embeddedUiState}' as embedded_ui_state
from holiday_login_theme_settings
where channel = 'client';
SQL
