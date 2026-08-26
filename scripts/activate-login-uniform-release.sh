#!/usr/bin/env bash
set -Eeuo pipefail

release_id="${1:?release id is required}"
app_root="/var/www/writex-co-in"
current_link="$app_root/current"
release_path="$app_root/releases/$release_id"
backup_root="$app_root/backups/deployments/$release_id"
previous_release="$(readlink -f "$current_link")"

test -d "$release_path"
test -f "$release_path/.next/BUILD_ID"
test -f "$app_root/shared/.env.production"
test -d "$backup_root"

ln -sfn "$app_root/shared/.env.production" "$release_path/.env.production"

rollback() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 ]]; then
    ln -sfn "$previous_release" "$app_root/current.rollback"
    mv -Tf "$app_root/current.rollback" "$current_link"
    cd "$current_link"
    pm2 reload writex-co-in --update-env || true
  fi
  exit "$exit_code"
}
trap rollback ERR

ln -sfn "$release_path" "$app_root/current.next"
mv -Tf "$app_root/current.next" "$current_link"
cd "$current_link"
pm2 reload writex-co-in --update-env

for attempt in {1..20}; do
  if curl --fail --silent --show-error \
    http://127.0.0.1:3002/api/health >/dev/null; then
    break
  fi
  if [[ "$attempt" == "20" ]]; then
    echo "WriteX health check failed after release switch." >&2
    false
  fi
  sleep 2
done

trap - ERR
printf 'release_id=%s\n' "$release_id"
printf 'previous_release=%s\n' "$previous_release"
printf 'backup_root=%s\n' "$backup_root"
printf 'local_health=200\n'
