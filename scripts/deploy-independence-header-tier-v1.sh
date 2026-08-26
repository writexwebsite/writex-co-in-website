#!/usr/bin/env bash
set -Eeuo pipefail

ROOT=/var/www/writex-co-in
RID=${1:?release ID is required}
PATCH_DIR=${2:?patch directory is required}
ACTIVE=$(readlink -f "$ROOT/current")
RELEASE="$ROOT/releases/$RID"
BACKUP="$ROOT/backups/deployments/$RID"
SWITCHED=0

FILES=(
  "app/globals.css"
  "components/holiday/FestivalHeaderRail.tsx"
  "components/holiday/HolidayDecorations.tsx"
  "tests/holiday/engine.test.ts"
)

rollback() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && $SWITCHED -eq 1 ]]; then
    ln -sfn "$ACTIVE" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
    runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
      pm2 reload writex-co-in --update-env >/dev/null 2>&1 || true
  fi
  exit "$exit_code"
}
trap rollback EXIT

for file in "${FILES[@]}"; do
  test -f "$PATCH_DIR/$file"
done
test -d "$ACTIVE"
test ! -e "$RELEASE"
test -f "$ROOT/shared/.env.production"
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = 200
test "$(df --output=avail -B1 "$ROOT" | tail -n1)" -gt 5368709120

mkdir -p "$BACKUP"
chmod 700 "$BACKUP"
printf '%s\n' "$ACTIVE" > "$BACKUP/active-release-before.txt"
df -P / > "$BACKUP/disk-before.txt"
runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
  pm2 jlist > "$BACKUP/pm2-before.json"
tar -czf "$BACKUP/changed-files-before.tgz" -C "$ACTIVE" "${FILES[@]}"
chmod 600 "$BACKUP/changed-files-before.tgz"

set -a
# shellcheck disable=SC1091
source "$ROOT/shared/.env.production"
set +a
psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c \
  "select id,state,configuration_hash from active_festival_snapshots order by activated_at,id" \
  > "$BACKUP/public-snapshots-before.tsv"
sha256sum "$BACKUP/public-snapshots-before.tsv" > "$BACKUP/public-snapshots-before.sha256"

cp -a "$ACTIVE" "$RELEASE"
rm -rf "$RELEASE/.next"
for file in "${FILES[@]}"; do
  install -D -o writexdeploy -g writexdeploy -m 644 \
    "$PATCH_DIR/$file" "$RELEASE/$file"
done

runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && pnpm exec eslint components/holiday/FestivalHeaderRail.tsx components/holiday/HolidayDecorations.tsx tests/holiday/engine.test.ts"
runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && pnpm exec tsc --noEmit --pretty false"
runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && pnpm exec tsx --test tests/holiday/engine.test.ts tests/holiday/festival-studio.test.ts tests/holiday/decoration-packs.test.ts"
runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && set -a && source '$ROOT/shared/.env.production' && set +a && pnpm run build"

THEWRITEX_PID_BEFORE=$(runuser -u writexdeploy -- env \
  PM2_HOME=/home/writexdeploy/.pm2 pm2 pid thewritex | tail -n 1)
ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
SWITCHED=1
runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
  pm2 reload writex-co-in --update-env

for attempt in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:3002/api/health >/dev/null; then
    break
  fi
  if [[ $attempt -eq 45 ]]; then
    echo "writex-co-in health check failed" >&2
    exit 1
  fi
  sleep 2
done

curl -fsS https://www.writex.co.in/api/health >/dev/null
curl -fsS https://www.writex.co.in/ >/dev/null
THEWRITEX_PID_AFTER=$(runuser -u writexdeploy -- env \
  PM2_HOME=/home/writexdeploy/.pm2 pm2 pid thewritex | tail -n 1)
test "$THEWRITEX_PID_BEFORE" = "$THEWRITEX_PID_AFTER"
curl -fsS http://127.0.0.1:3001/api/health >/dev/null

psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c \
  "select id,state,configuration_hash from active_festival_snapshots order by activated_at,id" \
  > "$BACKUP/public-snapshots-after.tsv"
cmp "$BACKUP/public-snapshots-before.tsv" "$BACKUP/public-snapshots-after.tsv"
sha256sum "$BACKUP/public-snapshots-after.tsv" > "$BACKUP/public-snapshots-after.sha256"

printf '%s\n' "$RID" > "$BACKUP/deployed-release.txt"
printf '%s\n' "$ACTIVE" > "$BACKUP/rollback-release.txt"
df -P / > "$BACKUP/disk-after.txt"
SWITCHED=0
trap - EXIT

echo "release=$RID"
echo "rollback=$ACTIVE"
echo "backup=$BACKUP"
echo "public_state_unchanged_during_code_deploy=yes"
echo "writex_co_in_health=200"
echo "public_health=200"
echo "server_focused_tests=passed"
echo "thewritex_pid_unchanged=$THEWRITEX_PID_AFTER"
