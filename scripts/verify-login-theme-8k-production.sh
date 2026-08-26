#!/usr/bin/env bash
set -Eeuo pipefail

root="/var/www/writex-co-in"
env_file="$root/shared/.env.production"
library_asset_id="9c5ab5a0-573a-4f5b-b816-6a4467a73630"

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

printf 'active_release=%s\n' "$(basename "$(readlink -f "$root/current")")"
printf 'writex_local_health=%s\n' \
  "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)"
printf 'writex_public_home=%s\n' \
  "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/)"
printf 'writex_public_health=%s\n' \
  "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/api/health)"
printf 'writex_public_client_login=%s\n' \
  "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/client-login)"
printf 'writex_public_employee_login=%s\n' \
  "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/employee-login)"
printf 'thewritex_local_health=%s\n' \
  "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health)"
printf 'thewritex_public_home=%s\n' \
  "$(curl -sS -o /dev/null -w '%{http_code}' https://thewritex.com/)"

printf '%s\n' 'production_login_controls:'
psql "$DATABASE_URL" -X -A -F '|' -t -v ON_ERROR_STOP=1 <<'SQL'
select
  channel,
  mode,
  state,
  case when theme_id is null then 'default' else 'theme_assigned' end
from holiday_login_theme_settings
order by channel;
SQL

printf '%s\n' 'asset_versions:'
psql "$DATABASE_URL" -X -A -F '|' -t -v ON_ERROR_STOP=1 <<SQL
select
  a.version_number,
  a.safe_file_name,
  a.file_size,
  coalesce((a.asset_metadata -> 'sourceDimensions' ->> 'width')::integer, 0),
  coalesce((a.asset_metadata -> 'sourceDimensions' ->> 'height')::integer, 0),
  a.review_status,
  case when l.current_version_asset_id = a.id then 'current' else 'historical' end
from festival_asset_library l
join holiday_theme_assets a on a.library_asset_id = l.id
where l.id = '$library_asset_id'
order by a.version_number desc;
SQL

pm2 status writex-co-in
pm2 status thewritex
