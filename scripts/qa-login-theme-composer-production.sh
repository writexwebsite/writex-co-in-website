#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/writex-co-in"

set -a
# shellcheck disable=SC1091
source "${ROOT}/shared/.env.production"
set +a

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "
  select
    'theme=' || id || '|' || slug || '|' || status
  from holiday_themes
  where slug in ('holi', 'durga-puja', 'diwali', 'christmas')
  order by slug;
"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "
  select
    'control=' || channel ||
    '|state=' || state ||
    '|theme=' || coalesce(theme_id::text, 'default') ||
    '|version=' || version_number ||
    '|approval=' || approval_state ||
    '|mode=' || coalesce(composition_config ->> 'applyMode', 'missing')
  from holiday_login_theme_settings
  order by channel;
"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "
  select
    'holi_asset=' || asset.id ||
    '|role=' || asset.asset_role ||
    '|review=' || asset.review_status ||
    '|status=' || asset.status ||
    '|placement=' || coalesce(assignment.placement, 'none') ||
    '|assignment=' || coalesce(assignment.state, 'none')
  from holiday_theme_assets asset
  join holiday_themes theme on theme.id = asset.theme_id
  left join festival_asset_assignments assignment
    on assignment.asset_version_id = asset.id
  where theme.slug = 'holi'
    and asset.asset_role in ('login_desktop', 'login_mobile', 'login_background')
  order by asset.created_at desc, assignment.placement;
"

printf 'local_health='
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002/api/health

printf 'public_client_login='
curl -fsS -o /dev/null -w '%{http_code}\n' https://www.writex.co.in/client-login

printf 'public_employee_login='
curl -fsS -o /dev/null -w '%{http_code}\n' https://www.writex.co.in/employee-login

printf 'thewritex='
curl -fsS -o /dev/null -w '%{http_code}\n' https://thewritex.com
