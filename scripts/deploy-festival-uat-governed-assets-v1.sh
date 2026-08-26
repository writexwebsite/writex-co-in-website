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

test -f "$ARCHIVE"
test -d "$ACTIVE"
test ! -e "$RELEASE"
test -f "$ENV"
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = 200

mkdir -p "$BACKUP" "$RELEASE"
chmod 700 "$BACKUP"
printf '%s\n' "$ACTIVE" > "$BACKUP/previous-release.txt"
cp -p "$ENV" "$BACKUP/env.production"
chmod 600 "$BACKUP/env.production"

set -a
# shellcheck disable=SC1090
source "$ENV"
set +a
pg_dump "$DATABASE_URL" --format=custom \
  --table='holiday_*' --table='festival_*' \
  --file="$BACKUP/festival-data-before.dump"
chmod 600 "$BACKUP/festival-data-before.dump"

psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c "
  select 'active_snapshots',count(*) from active_festival_snapshots where state='active'
  union all select 'active_schedules',count(*)
    from festival_studio_configurations where activation_status='scheduled'
  union all select 'review_batch_1_items',count(*)
    from festival_asset_review_items item
    join festival_asset_review_batches batch on batch.id=item.batch_id
    where batch.stable_key='festival-review-batch-1'
  union all select 'uat_review_items',count(*)
    from festival_asset_review_items item
    join festival_asset_review_batches batch on batch.id=item.batch_id
    where batch.stable_key='festival-uat-assets-v1'
  order by 1
" > "$BACKUP/state-before.tsv"

cp -a "$ACTIVE/." "$RELEASE/"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -sfn "$ENV" "$RELEASE/.env.production"
rm -rf "$RELEASE/.next"

cd "$RELEASE"
pnpm exec tsc --noEmit --pretty false
pnpm exec tsx --test \
  tests/holiday/festival-review-batch.test.ts \
  tests/holiday/festival-studio.test.ts
pnpm build

psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c "
  select 'active_snapshots',count(*) from active_festival_snapshots where state='active'
  union all select 'active_schedules',count(*)
    from festival_studio_configurations where activation_status='scheduled'
  union all select 'review_batch_1_items',count(*)
    from festival_asset_review_items item
    join festival_asset_review_batches batch on batch.id=item.batch_id
    where batch.stable_key='festival-review-batch-1'
  union all select 'uat_review_items',count(*)
    from festival_asset_review_items item
    join festival_asset_review_batches batch on batch.id=item.batch_id
    where batch.stable_key='festival-uat-assets-v1'
  order by 1
" > "$BACKUP/state-after-build.tsv"
cmp "$BACKUP/state-before.tsv" "$BACKUP/state-after-build.tsv"

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

trap - ERR
echo "RELEASE=$RID"
echo "BACKUP=$BACKUP"
echo "PREVIOUS=$ACTIVE"
echo "HEALTH=200"
echo "THEWRITEX_UNTOUCHED=$THEWRITEX_PID"
