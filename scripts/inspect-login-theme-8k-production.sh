#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"
ENV_FILE="$APP_ROOT/shared/.env.production"
LIBRARY_ASSET_ID="9c5ab5a0-573a-4f5b-b816-6a4467a73630"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

psql "$DATABASE_URL" -X -A -F '|' -t -v ON_ERROR_STOP=1 <<SQL
select
  table_name,
  string_agg(column_name, ',' order by ordinal_position)
from information_schema.columns
where table_name in (
  'holiday_theme_assets',
  'festival_asset_library',
  'festival_asset_assignments'
)
group by table_name
order by table_name;

select
  a.id,
  a.version_number,
  a.safe_file_name,
  a.file_size,
  coalesce((a.asset_metadata -> 'sourceDimensions' ->> 'width')::integer, 0),
  coalesce((a.asset_metadata -> 'sourceDimensions' ->> 'height')::integer, 0),
  a.review_status,
  case when l.current_version_asset_id = a.id then 'current' else 'historical' end,
  (
    select count(*)
    from festival_asset_assignments fa
    where fa.library_asset_id = l.id
      and fa.asset_version_id = a.id
      and fa.state = 'active'
  )
from festival_asset_library l
join holiday_theme_assets a on a.library_asset_id = l.id
where l.id = '$LIBRARY_ASSET_ID'
order by a.version_number desc;
SQL
