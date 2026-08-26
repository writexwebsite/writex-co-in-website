#!/usr/bin/env bash
set -Eeuo pipefail

release_id="${1:?release id is required}"
app_root="/var/www/writex-co-in"
release_path="$app_root/releases/$release_id"
backup_root="$app_root/backups/festival-asset-governance-$release_id"
current_path="$(readlink -f "$app_root/current")"

test -d "$release_path"
test -f "$backup_root/writex_co_in_before_governance.dump"

set -a
source "$app_root/shared/.env.production"
set +a
cd "$release_path"
node scripts/audit-festival-asset-library.mjs \
  > "$backup_root/asset-recovery-audit.json"

ln -sfn "$release_path" "$app_root/current.next"
mv -Tf "$app_root/current.next" "$app_root/current"
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

node -e '
  const fs = require("fs");
  const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  console.log(JSON.stringify(report.summary));
' "$backup_root/asset-recovery-audit.json"
printf 'release_id=%s\n' "$release_id"
printf 'previous_release=%s\n' "$current_path"
printf 'backup_root=%s\n' "$backup_root"
pm2 status writex-co-in
pm2 status thewritex
