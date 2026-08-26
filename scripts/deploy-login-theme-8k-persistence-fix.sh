#!/usr/bin/env bash
set -Eeuo pipefail

package_path="${1:?package path is required}"
release_id="${2:?release id is required}"
app_root="/var/www/writex-co-in"
current_link="$app_root/current"
current_path="$(readlink -f "$current_link")"
release_path="$app_root/releases/$release_id"
backup_root="$app_root/backups/deployments/$release_id"
env_file="$app_root/shared/.env.production"

test -f "$package_path"
test -d "$current_path"
test ! -e "$release_path"
test -f "$env_file"

mkdir -p "$backup_root" "$release_path"
printf '%s\n' "$current_path" >"$backup_root/previous-release.txt"
install -m 600 "$env_file" "$backup_root/.env.production"
cp -a "$current_path/." "$release_path/"
tar -xzf "$package_path" -C "$release_path"
ln -sfn "$env_file" "$release_path/.env.production"

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a
export CI=true

pg_dump --no-owner --no-acl "$DATABASE_URL" \
  | gzip -9 >"$backup_root/database-before-8k-persistence-fix.sql.gz"

cd "$release_path"
pnpm exec tsx --test tests/holiday/login-theme.test.ts
pnpm build

rollback() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 ]]; then
    ln -sfn "$current_path" "$app_root/current.rollback"
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
printf 'previous_release=%s\n' "$current_path"
printf 'backup_root=%s\n' "$backup_root"
printf 'local_health=200\n'
