#!/usr/bin/env bash
set -Eeuo pipefail

RID="${1:?release id required}"
ROOT=/var/www/writex-co-in
ARCHIVE="/tmp/writex-${RID}.tgz"
ACTIVE="$(readlink -f "$ROOT/current")"
RELEASE="$ROOT/releases/$RID"
BACKUP="$ROOT/backups/deployments/$RID"
ENV="$ROOT/shared/.env.production"
SWITCHED=0
THEWRITEX_PID="$(pm2 pid thewritex | head -n1)"
export CI=true

changed_files=(
  lib/holiday/festival-studio-repository.ts
  tests/holiday/festival-studio.test.ts
)

rollback() {
  code=$?
  if [[ "$SWITCHED" = 1 ]]; then
    ln -sfn "$ACTIVE" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
    pm2 reload writex-co-in --update-env >/dev/null 2>&1 || true
  fi
  echo "ROLLED_BACK_TO=$ACTIVE"
  exit "$code"
}
trap rollback ERR

export_public_state() {
  target="$1"
  psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c "
    select 'active_pack_imports', count(*)::text
      from festival_pack_imports where state='active'
    union all
    select 'active_snapshots', count(*)::text
      from active_festival_snapshots where state='active'
    union all
    select 'active_studio_configurations', count(*)::text
      from festival_studio_configurations where activation_status='active'
    union all
    select 'scheduled_studio_configurations', count(*)::text
      from festival_studio_configurations where activation_status='scheduled'
    order by 1
  " > "$target"
}

test -f "$ARCHIVE"
test -d "$ACTIVE"
test ! -e "$RELEASE"
test -f "$ENV"
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = 200
test "$(df --output=avail -B1 "$ROOT" | tail -n1)" -gt 5368709120

mkdir -p "$BACKUP" "$RELEASE"
chmod 700 "$BACKUP"
printf '%s\n' "$ACTIVE" > "$BACKUP/previous-release.txt"
pm2 describe writex-co-in > "$BACKUP/writex-co-in-process.txt"
cp -p "$ENV" "$BACKUP/env.production"
chmod 600 "$BACKUP/env.production"
tar -czf "$BACKUP/changed-files-before.tgz" -C "$ACTIVE" "${changed_files[@]}"
chmod 600 "$BACKUP/changed-files-before.tgz"

set -a
# shellcheck disable=SC1090
source "$ENV"
set +a
pg_dump "$DATABASE_URL" --format=custom --compress=9 \
  --table='holiday_*' --table='festival_*' \
  --file="$BACKUP/festival-data-before.dump"
chmod 600 "$BACKUP/festival-data-before.dump"
export_public_state "$BACKUP/public-state-before.tsv"

cp -a "$ACTIVE/." "$RELEASE/"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -sfn "$ENV" "$RELEASE/.env.production"
rm -rf "$RELEASE/.next"
if [[ -L "$RELEASE/node_modules" ]]; then
  unlink "$RELEASE/node_modules"
fi

cd "$RELEASE"
pnpm install --frozen-lockfile
pnpm exec eslint lib/holiday/festival-studio-repository.ts
pnpm exec tsc --noEmit --pretty false
pnpm exec tsx --test tests/holiday/festival-studio.test.ts
pnpm build
export_public_state "$BACKUP/public-state-after-build.tsv"
cmp "$BACKUP/public-state-before.tsv" "$BACKUP/public-state-after-build.tsv"

ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
SWITCHED=1
pm2 reload writex-co-in --update-env
for _ in {1..45}; do
  [[ "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health || true)" = 200 ]] && break
  sleep 2
done
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = 200
test "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/api/health)" = 200
test "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/)" = 200
test "$(pm2 pid thewritex | head -n1)" = "$THEWRITEX_PID"
export_public_state "$BACKUP/public-state-after-deploy.tsv"
cmp "$BACKUP/public-state-before.tsv" "$BACKUP/public-state-after-deploy.tsv"

trap - ERR
echo "RELEASE=$RID"
echo "BACKUP=$BACKUP"
echo "PREVIOUS=$ACTIVE"
echo "HEALTH=200"
echo "THEWRITEX_UNTOUCHED=$THEWRITEX_PID"
