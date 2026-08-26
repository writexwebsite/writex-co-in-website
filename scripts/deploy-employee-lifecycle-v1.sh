#!/usr/bin/env bash
set -euo pipefail

RID="${1:?release id is required}"
ARCHIVE="${2:?source archive is required}"
ROOT="/var/www/writex-co-in"
CURRENT="$(readlink -f "$ROOT/current")"
RELEASE="$ROOT/releases/$RID"
BACKUP="$ROOT/backups/deployments/$RID"
STAGING="$(mktemp -d)"
SWITCHED=false

cleanup() {
  rm -rf "$STAGING"
}

rollback() {
  local exit_code=$?
  if [[ "$SWITCHED" == "true" ]]; then
    ln -sfn "$CURRENT" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
    source "$ROOT/shared/.env.production"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$RELEASE/database/migrations/20260818_employee_lifecycle.rollback.sql" || true
    PM2_HOME=/home/writexdeploy/.pm2 pm2 reload writex-co-in --update-env || true
  fi
  cleanup
  exit "$exit_code"
}

trap rollback ERR
trap cleanup EXIT

mkdir -p "$RELEASE" "$BACKUP"
printf '%s\n' "$CURRENT" > "$BACKUP/previous-release.txt"
df -h / > "$BACKUP/disk-before.txt"
PM2_HOME=/home/writexdeploy/.pm2 pm2 describe writex-co-in > "$BACKUP/pm2-before.txt"

source "$ROOT/shared/.env.production"
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > "$BACKUP/database-before.dump"
pg_restore --list "$BACKUP/database-before.dump" > "$BACKUP/database-before.list"
psql "$DATABASE_URL" -X -A -F '|' -Atc \
  "select id,employee_code,display_name,employment_status from employees order by employee_code" \
  > "$BACKUP/employees-before.txt"

rsync -a --link-dest="$CURRENT" "$CURRENT/" "$RELEASE/"
rm -rf "$RELEASE/.next"
mkdir -p "$RELEASE/.next"
tar -xzf "$ARCHIVE" -C "$STAGING"
rsync -a "$STAGING/" "$RELEASE/"
rm -f "$RELEASE/RELEASE_ID"
printf '%s\n' "$RID" > "$RELEASE/RELEASE_ID"

cd "$RELEASE"
pnpm run build
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260818_employee_lifecycle.sql
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from information_schema.columns where table_name='employees' and column_name in ('archived_at','archive_previous_employment_status','archive_previous_academy_enabled','lifecycle_version')")" = "4"

ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
SWITCHED=true
PM2_HOME=/home/writexdeploy/.pm2 pm2 reload writex-co-in --update-env

for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3002/api/health > "$BACKUP/health-after.json"; then
    break
  fi
  sleep 2
done
curl --fail --silent --show-error --max-time 10 https://www.writex.co.in/api/health > "$BACKUP/public-health-after.json"
test "$(readlink -f "$ROOT/current")" = "$RELEASE"
df -h / > "$BACKUP/disk-after.txt"
printf '%s\n' "$RID" > "$BACKUP/deployed-release.txt"
trap - ERR
