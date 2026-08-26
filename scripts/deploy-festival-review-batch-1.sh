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

export_baseline() {
  target="$1"
  psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c "
    select 'asset', id::text, row_to_json(asset)::text
    from holiday_theme_assets asset
    union all
    select 'library', id::text, row_to_json(library)::text
    from festival_asset_library library
    union all
    select 'assignment', id::text, row_to_json(assignment)::text
    from festival_asset_assignments assignment
    order by 1,2
  " > "$target"
}

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
pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP/database-before.dump"
chmod 600 "$BACKUP/database-before.dump"
export_baseline "$BACKUP/governed-festival-library-before.tsv"
BASELINE_SHA="$(sha256sum "$BACKUP/governed-festival-library-before.tsv" | awk '{print $1}')"
printf '%s\n' "$BASELINE_SHA" > "$BACKUP/governed-festival-library-before.sha256"
ACTIVE_BEFORE="$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_pack_imports where state='active'")"
test "$ACTIVE_BEFORE" = 0

cp -a "$ACTIVE/." "$RELEASE/"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -sfn "$ENV" "$RELEASE/.env.production"
rm -rf "$RELEASE/.next"
cd "$RELEASE"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260801_festival_asset_review_batches.sql
pnpm exec tsx scripts/seed-festival-review-batch-1.mjs
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_asset_review_items")" = 120
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_asset_review_items where review_state='approved'")" = 0
pnpm exec eslint scripts/generate-festival-review-batch-1.mjs scripts/seed-festival-review-batch-1.mjs lib/holiday/festival-review-batch.ts components/admin/FestivalFounderReview.tsx app/admin/website-experience/festival-assets/review/page.tsx app/api/admin/website-experience/festival-review/route.ts
pnpm exec tsc --noEmit
pnpm exec tsx --test tests/holiday/festival-review-batch.test.ts
pnpm build

export_baseline "$BACKUP/governed-festival-library-after.tsv"
AFTER_SHA="$(sha256sum "$BACKUP/governed-festival-library-after.tsv" | awk '{print $1}')"
printf '%s\n' "$AFTER_SHA" > "$BACKUP/governed-festival-library-after.sha256"
test "$BASELINE_SHA" = "$AFTER_SHA"
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_pack_imports where state='active'")" = 0

ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
SWITCHED=1
pm2 reload writex-co-in --update-env
for i in {1..30}; do
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
echo "BASELINE_BEFORE=$BASELINE_SHA"
echo "BASELINE_AFTER=$AFTER_SHA"
echo "REVIEW_ITEMS=120"
echo "APPROVED_ITEMS=0"
echo "ACTIVE_PACKS=0"
echo "HEALTH=200"
echo "THEWRITEX_UNTOUCHED=$THEWRITEX_PID"
