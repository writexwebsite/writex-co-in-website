#!/usr/bin/env bash
set -Eeuo pipefail

printf 'active_release='
readlink -f /var/www/writex-co-in/current
pm2 status writex-co-in
pm2 status thewritex

set -a
source /var/www/writex-co-in/shared/.env.production
set +a

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
select 'asset_versions=' || count(*) from holiday_theme_assets;
select 'active_assets=' || count(*) from holiday_theme_assets where status = 'active';
select 'version_links=' || count(*) from holiday_theme_assets where previous_asset_id is not null;
select 'themes_referencing_assets=' || count(distinct theme_id) from holiday_theme_assets;
SQL
