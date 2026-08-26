#!/usr/bin/env bash
set -euo pipefail

set -a
. /var/www/writex-co-in/shared/.env.production
set +a

echo "active_release=$(readlink -f /var/www/writex-co-in/current)"
echo "disk=$(df -P / | awk 'NR==2 {print $3 ":" $4 ":" $5}')"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -At <<'SQL'
select 'table=' || table_name
from information_schema.tables
where table_schema='public'
  and (table_name like 'holiday_%' or table_name like 'festival_%' or table_name like '%festival%' or table_name like '%schedule%')
order by table_name;

select table_name || '.' || column_name || ':' || data_type
from information_schema.columns
where table_schema='public'
  and table_name in (
    'holiday_control',
    'holiday_themes',
    'holiday_theme_assets',
    'holiday_theme_configurations',
    'holiday_theme_packages',
    'festival_asset_library',
    'festival_asset_versions',
    'festival_asset_assignments',
    'festival_asset_review_batches',
    'festival_asset_review_items',
    'festival_studio_configurations',
    'festival_draft_configurations',
    'festival_preview_snapshots',
    'festival_active_snapshots',
    'active_festival_snapshots',
    'holiday_theme_schedules'
  )
order by table_name, ordinal_position;

select 'count.' || relname || '=' || n_live_tup
from pg_stat_user_tables
where relname in (
  'holiday_themes','holiday_theme_assets','festival_asset_library',
  'festival_asset_assignments','festival_asset_review_batches',
  'festival_asset_review_items','festival_studio_configurations',
  'festival_draft_configurations','festival_preview_snapshots',
  'festival_active_snapshots','active_festival_snapshots','holiday_theme_schedules'
)
order by relname;
SQL
