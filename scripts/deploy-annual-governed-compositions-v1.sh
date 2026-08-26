#!/usr/bin/env bash
set -Eeuo pipefail

ROOT=/var/www/writex-co-in
RID=${1:?release ID is required}
PATCH_DIR=${2:?patch directory is required}
ACTIVE=$(readlink -f "$ROOT/current")
RELEASE="$ROOT/releases/$RID"
BACKUP="$ROOT/backups/deployments/$RID"
SWITCHED=0
MIGRATED=0

FILES=(
  "lib/holiday/motif-library.ts"
  "lib/holiday/governed-motifs.ts"
  "lib/holiday/decoration-packs.ts"
  "lib/holiday/festival-review-batch.ts"
  "lib/holiday/festival-studio-repository.ts"
  "components/admin/FestivalPackStudio.tsx"
  "components/admin/FestivalStudio.tsx"
  "tests/holiday/decoration-packs.test.ts"
  "database/migrations/20260810_annual_report_governed_compositions.sql"
  "database/migrations/20260810_annual_report_governed_compositions.rollback.sql"
)

LINT_FILES=(
  "lib/holiday/motif-library.ts"
  "lib/holiday/governed-motifs.ts"
  "lib/holiday/decoration-packs.ts"
  "lib/holiday/festival-review-batch.ts"
  "lib/holiday/festival-studio-repository.ts"
  "components/admin/FestivalPackStudio.tsx"
  "components/admin/FestivalStudio.tsx"
  "tests/holiday/decoration-packs.test.ts"
)

rollback() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && $SWITCHED -eq 1 ]]; then
    ln -sfn "$ACTIVE" "$ROOT/current"
    runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
      pm2 reload writex-co-in --update-env >/dev/null
  fi
  if [[ $exit_code -ne 0 && $MIGRATED -eq 1 ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
      -f "$RELEASE/database/migrations/20260810_annual_report_governed_compositions.rollback.sql" \
      >/dev/null
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
df -P / > "$BACKUP/disk-before.txt"
runuser -u writexdeploy -- env PM2_HOME=/home/writexdeploy/.pm2 \
  pm2 jlist > "$BACKUP/pm2-before.json"
set -a
source "$ROOT/shared/.env.production"
set +a
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" \
  > "$BACKUP/database-before.dump"
sha256sum "$BACKUP/database-before.dump" > "$BACKUP/database-before.sha256"
psql "$DATABASE_URL" -X -At -c \
  "select id,state,configuration_hash,snapshot_payload::text from active_festival_snapshots order by activated_at,id" \
  > "$BACKUP/public-snapshots-before.txt"
sha256sum "$BACKUP/public-snapshots-before.txt" \
  > "$BACKUP/public-snapshots-before.sha256"

cp -a "$ACTIVE" "$RELEASE"
rm -rf "$RELEASE/.next"
for file in "${FILES[@]}"; do
  install -D -o writexdeploy -g writexdeploy -m 600 \
    "$PATCH_DIR/$file" "$RELEASE/$file"
done

runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && pnpm exec eslint ${LINT_FILES[*]}"
runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && pnpm exec tsc --noEmit"
runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && pnpm exec tsx --test tests/holiday/decoration-packs.test.ts tests/holiday/festival-studio.test.ts tests/holiday/login-theme.test.ts tests/holiday/festival-review-batch.test.ts"
runuser -u writexdeploy -- bash -c \
  "cd '$RELEASE' && set -a && source '$ROOT/shared/.env.production' && set +a && pnpm run build"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f "$RELEASE/database/migrations/20260810_annual_report_governed_compositions.sql"
MIGRATED=1

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

psql "$DATABASE_URL" -X -At -c \
  "select id,state,configuration_hash,snapshot_payload::text from active_festival_snapshots order by activated_at,id" \
  > "$BACKUP/public-snapshots-after.txt"
cmp "$BACKUP/public-snapshots-before.txt" "$BACKUP/public-snapshots-after.txt"
sha256sum "$BACKUP/public-snapshots-after.txt" \
  > "$BACKUP/public-snapshots-after.sha256"

printf '%s\n' "$RID" > "$BACKUP/deployed-release.txt"
printf '%s\n' "$ACTIVE" > "$BACKUP/rollback-release.txt"
df -P / > "$BACKUP/disk-after.txt"
SWITCHED=0
MIGRATED=0
trap - EXIT

echo "release=$RID"
echo "rollback=$ACTIVE"
echo "backup=$BACKUP"
echo "database_backup=$BACKUP/database-before.dump"
echo "public_state_unchanged=yes"
echo "writex_co_in_health=200"
echo "public_health=200"
echo "server_focused_tests=passed"
echo "thewritex_pid_unchanged=$THEWRITEX_PID_AFTER"
