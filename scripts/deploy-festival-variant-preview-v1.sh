#!/usr/bin/env bash
set -Eeuo pipefail

ROOT=/var/www/writex-co-in
RID=${1:?release ID is required}
PATCH_DIR=${2:?patch directory is required}
ACTIVE=$(readlink "$ROOT/current")
RELEASE="$ROOT/releases/$RID"
BACKUP="$ROOT/backups/deployments/$RID"
SWITCHED=0

FILES=(
  "app/globals.css"
  "app/api/website-experience/theme/route.ts"
  "components/admin/FestivalPackStudio.tsx"
  "components/holiday/HolidayDecorations.tsx"
  "database/migrations/20260804_festival_studio_source_group_configurations.sql"
  "lib/holiday/active-festival-snapshot.ts"
  "lib/holiday/public.ts"
  "lib/holiday/types.ts"
)

rollback() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && $SWITCHED -eq 1 ]]; then
    ln -sfn "$ACTIVE" "$ROOT/current"
    runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
      pm2 reload writex-co-in --update-env >/dev/null
  fi
  exit "$exit_code"
}
trap rollback EXIT

for file in "${FILES[@]}"; do
  test -f "$PATCH_DIR/$file"
done
test ! -e "$RELEASE"

mkdir -p "$BACKUP"
printf '%s\n' "$ACTIVE" > "$BACKUP/active-release-before.txt"
runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
  pm2 jlist > "$BACKUP/pm2-before.json"

cp -al "$ACTIVE" "$RELEASE"
rm -rf "$RELEASE/.next"
for file in "${FILES[@]}"; do
  rm -f "$RELEASE/$file"
  install -o writexdeploy -g writexdeploy -m 600 \
    "$PATCH_DIR/$file" "$RELEASE/$file"
done

runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && set -a && source '$ROOT/shared/.env.production' && set +a && pnpm run build"

THEWRITEX_PID_BEFORE=$(runuser -u writexdeploy -- env \
  PM2_HOME=/home/writexdeploy/.pm2 pm2 pid thewritex | tail -n 1)

ln -sfn "$RELEASE" "$ROOT/current"
SWITCHED=1
runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
  pm2 reload writex-co-in --update-env

for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3002/api/health >/dev/null; then
    break
  fi
  if [[ $attempt -eq 30 ]]; then
    echo "writex-co-in health check failed" >&2
    exit 1
  fi
  sleep 2
done

curl -fsS https://www.writex.co.in/api/health >/dev/null
THEWRITEX_PID_AFTER=$(runuser -u writexdeploy -- env \
  PM2_HOME=/home/writexdeploy/.pm2 pm2 pid thewritex | tail -n 1)
test "$THEWRITEX_PID_BEFORE" = "$THEWRITEX_PID_AFTER"
curl -fsS http://127.0.0.1:3001/api/health >/dev/null

printf '%s\n' "$RID" > "$BACKUP/deployed-release.txt"
printf '%s\n' "$ACTIVE" > "$BACKUP/rollback-release.txt"
SWITCHED=0
trap - EXIT

echo "release=$RID"
echo "rollback=$ACTIVE"
echo "backup=$BACKUP"
echo "writex_co_in_health=200"
echo "public_health=200"
echo "thewritex_pid_unchanged=$THEWRITEX_PID_AFTER"
