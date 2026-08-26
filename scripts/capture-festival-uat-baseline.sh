#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="/var/www/writex-co-in/backups/festival-uat/${timestamp}"
mkdir -p "$backup_root"

set -a
. /var/www/writex-co-in/shared/.env.production
set +a

active_release="$(readlink -f /var/www/writex-co-in/current)"
printf '%s\n' "$active_release" > "$backup_root/active-release.txt"
pm2 jlist | node -e '
let input="";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const rows=JSON.parse(input).filter(item => ["writex-co-in","thewritex"].includes(item.name));
  process.stdout.write(JSON.stringify(rows.map(item => ({
    name:item.name,
    status:item.pm2_env.status,
    pid:item.pid,
    restarts:item.pm2_env.restart_time,
    cwd:item.pm2_env.pm_cwd
  })),null,2));
});
' > "$backup_root/pm2-state.json"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges \
  --table=public.holiday_themes \
  --table=public.holiday_theme_assets \
  --table=public.festival_asset_library \
  --table=public.festival_asset_assignments \
  --table=public.festival_asset_audit \
  --table=public.festival_asset_review_batches \
  --table=public.festival_asset_review_items \
  --table=public.festival_asset_review_audit \
  --table=public.festival_studio_configurations \
  --table=public.festival_studio_configuration_versions \
  --table=public.festival_draft_configurations \
  --table=public.festival_preview_snapshots \
  --table=public.active_festival_snapshots \
  --file="$backup_root/festival-state.dump"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -At > "$backup_root/baseline.txt" <<'SQL'
select 'captured_at=' || now();
select 'active_snapshot_count=' || count(*) from active_festival_snapshots where state='active';
select 'active_snapshot=' || coalesce(string_agg(id::text || ':' || festival_slug || ':' || state, ',' order by activated_at desc),'none') from active_festival_snapshots where state='active';
select 'scheduled_configuration_count=' || count(*) from festival_studio_configurations where activation_status='scheduled';
select 'scheduled_configurations=' || coalesce(string_agg(id::text || ':' || festival_slug || ':' || coalesce(start_at::text,'') || ':' || coalesce(end_at::text,''), ',' order by start_at),'none') from festival_studio_configurations where activation_status='scheduled';
select 'review_batch_counts=' || coalesce(string_agg(batch.stable_key || ':' || count_by_batch.item_count, ',' order by batch.stable_key),'none')
from festival_asset_review_batches batch
join lateral (select count(*)::text item_count from festival_asset_review_items item where item.batch_id=batch.id) count_by_batch on true;
select 'asset_library_count=' || count(*) from festival_asset_library;
select 'approved_asset_version_count=' || count(*) from holiday_theme_assets where review_status='approved';
select 'configuration_count=' || count(*) from festival_studio_configurations;
select 'draft_count=' || count(*) from festival_draft_configurations;
SQL

sha256sum "$backup_root/festival-state.dump" "$backup_root/baseline.txt" > "$backup_root/SHA256SUMS"
chmod -R go-rwx "$backup_root"
printf '%s\n' "$backup_root"
