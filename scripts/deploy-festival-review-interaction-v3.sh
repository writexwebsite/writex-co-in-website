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
  app/globals.css
  app/api/admin/website-experience/assets/route.ts
  app/api/admin/website-experience/festival-review/route.ts
  components/admin/FestivalAssetLibrary.tsx
  components/admin/FestivalFounderReview.tsx
  components/holiday/HolidayDecorations.tsx
  lib/holiday/festival-review-batch.ts
  lib/holiday/festival-review-standard.ts
  lib/holiday/festival-studio-repository.ts
  lib/holiday/types.ts
  lib/holiday/validation.ts
  public/festival-assets/uat/diwali/diwali-axo-hand-lantern-v2.svg
  tests/holiday/festival-review-batch.test.ts
  tests/holiday/festival-review-standard.test.ts
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

export_festival_state() {
  target="$1"
  psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c "
    select 'active_snapshot', id::text, row_to_json(record)::text
      from active_festival_snapshots record
    union all
    select 'assignment', id::text, row_to_json(record)::text
      from festival_asset_assignments record
    union all
    select 'asset_library', id::text, row_to_json(record)::text
      from festival_asset_library record
    union all
    select 'review_batch', id::text, row_to_json(record)::text
      from festival_asset_review_batches record
    union all
    select 'review_item', id::text, row_to_json(record)::text
      from festival_asset_review_items record
    union all
    select 'studio_configuration', id::text, row_to_json(record)::text
      from festival_studio_configurations record
    order by 1,2
  " > "$target"
}

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
backup_files=()
for file in "${changed_files[@]}"; do
  [[ -f "$ACTIVE/$file" ]] && backup_files+=("$file")
done
tar -czf "$BACKUP/changed-files-before.tgz" -C "$ACTIVE" "${backup_files[@]}"
chmod 600 "$BACKUP/changed-files-before.tgz"

set -a
# shellcheck disable=SC1090
source "$ENV"
set +a
pg_dump "$DATABASE_URL" --format=custom --compress=9 \
  --table='holiday_*' --table='festival_*' \
  --file="$BACKUP/festival-data-before.dump"
chmod 600 "$BACKUP/festival-data-before.dump"

export_festival_state "$BACKUP/festival-state-before.tsv"
export_public_state "$BACKUP/public-state-before.tsv"
STATE_BEFORE="$(sha256sum "$BACKUP/festival-state-before.tsv" | awk '{print $1}')"

cp -a "$ACTIVE/." "$RELEASE/"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -sfn "$ENV" "$RELEASE/.env.production"
rm -rf "$RELEASE/.next"
if [[ -L "$RELEASE/node_modules" ]]; then
  unlink "$RELEASE/node_modules"
fi

cd "$RELEASE"
pnpm install --frozen-lockfile
pnpm exec eslint \
  app/api/admin/website-experience/assets/route.ts \
  app/api/admin/website-experience/festival-review/route.ts \
  components/admin/FestivalAssetLibrary.tsx \
  components/admin/FestivalFounderReview.tsx \
  components/holiday/HolidayDecorations.tsx \
  lib/holiday/festival-review-batch.ts \
  lib/holiday/festival-review-standard.ts \
  lib/holiday/festival-studio-repository.ts \
  lib/holiday/types.ts \
  lib/holiday/validation.ts
pnpm exec tsc --noEmit --pretty false
pnpm exec tsx --test \
  tests/holiday/festival-review-batch.test.ts \
  tests/holiday/festival-review-standard.test.ts
pnpm build

export_festival_state "$BACKUP/festival-state-after-build.tsv"
export_public_state "$BACKUP/public-state-after-build.tsv"
STATE_AFTER="$(sha256sum "$BACKUP/festival-state-after-build.tsv" | awk '{print $1}')"
test "$STATE_BEFORE" = "$STATE_AFTER"
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

export_festival_state "$BACKUP/festival-state-after-deploy.tsv"
export_public_state "$BACKUP/public-state-after-deploy.tsv"
STATE_DEPLOYED="$(sha256sum "$BACKUP/festival-state-after-deploy.tsv" | awk '{print $1}')"
test "$STATE_BEFORE" = "$STATE_DEPLOYED"
cmp "$BACKUP/public-state-before.tsv" "$BACKUP/public-state-after-deploy.tsv"

trap - ERR
echo "RELEASE=$RID"
echo "BACKUP=$BACKUP"
echo "PREVIOUS=$ACTIVE"
echo "FESTIVAL_STATE_BEFORE=$STATE_BEFORE"
echo "FESTIVAL_STATE_AFTER=$STATE_DEPLOYED"
echo "HEALTH=200"
echo "THEWRITEX_UNTOUCHED=$THEWRITEX_PID"
