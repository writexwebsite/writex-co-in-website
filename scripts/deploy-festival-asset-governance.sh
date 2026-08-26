#!/usr/bin/env bash
set -Eeuo pipefail

package_path="${1:?package path is required}"
release_id="${2:?release id is required}"
app_root="/var/www/writex-co-in"
release_path="$app_root/releases/$release_id"
current_path="$(readlink -f "$app_root/current")"
backup_root="$app_root/backups/festival-asset-governance-$release_id"

test -f "$package_path"
test -d "$current_path"
test ! -e "$release_path"

mkdir -p "$backup_root" "$release_path"
printf '%s\n' "$current_path" > "$backup_root/previous-release.txt"
cp -a "$app_root/shared/.env.production" "$backup_root/.env.production"
cp -a "$current_path/." "$release_path/"
tar -xzf "$package_path" -C "$release_path"
ln -sfn "$app_root/shared/.env.production" "$release_path/.env.production"

cd "$release_path"
pnpm install --frozen-lockfile
pnpm build

set -a
source "$app_root/shared/.env.production"
set +a
pg_dump --format=custom --no-owner --no-acl \
  --file="$backup_root/writex_co_in_before_governance.dump" \
  "$DATABASE_URL"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f "$release_path/database/migrations/20260729_festival_asset_governance.sql"
node "$release_path/scripts/audit-festival-asset-library.mjs" \
  > "$backup_root/asset-recovery-audit.json"

ln -sfn "$release_path" "$app_root/current.next"
mv -Tf "$app_root/current.next" "$app_root/current"
cd "$app_root/current"
pm2 reload writex-co-in --update-env

for attempt in {1..20}; do
  if curl --fail --silent --show-error \
    http://127.0.0.1:3002/api/health >/dev/null; then
    break
  fi
  if [[ "$attempt" == "20" ]]; then
    ln -sfn "$current_path" "$app_root/current.rollback"
    mv -Tf "$app_root/current.rollback" "$app_root/current"
    cd "$app_root/current"
    pm2 reload writex-co-in --update-env
    echo "Health check failed; application pointer rolled back." >&2
    exit 1
  fi
  sleep 2
done

printf 'release_id=%s\n' "$release_id"
printf 'previous_release=%s\n' "$current_path"
printf 'backup_root=%s\n' "$backup_root"
printf 'database_backup=%s\n' "$backup_root/writex_co_in_before_governance.dump"
printf 'recovery_audit=%s\n' "$backup_root/asset-recovery-audit.json"
