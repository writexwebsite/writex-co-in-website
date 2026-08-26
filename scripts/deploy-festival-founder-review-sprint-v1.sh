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

export_governed_library() {
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

export_review_sources() {
  target="$1"
  psql "$DATABASE_URL" -X -A -F $'\t' -v ON_ERROR_STOP=1 -c "
    select stable_asset_id,source_s3_key,thumbnail_s3_key,checksum_sha256,
      mime_type,width,height,metadata_json::text
    from festival_asset_review_items item
    join festival_asset_review_batches batch on batch.id=item.batch_id
    where batch.stable_key='festival-review-batch-1'
    order by stable_asset_id
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

export_governed_library "$BACKUP/governed-library-before.tsv"
export_review_sources "$BACKUP/review-sources-before.tsv"
GOVERNED_BEFORE="$(sha256sum "$BACKUP/governed-library-before.tsv" | awk '{print $1}')"
SOURCES_BEFORE="$(sha256sum "$BACKUP/review-sources-before.tsv" | awk '{print $1}')"
DECISIONS_BEFORE="$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_asset_review_items where review_state<>'visual_review_required'")"
ACTIVE_BEFORE="$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_pack_imports where state='active'")"
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_asset_review_items")" = 120
test "$ACTIVE_BEFORE" = 0

cp -a "$ACTIVE/." "$RELEASE/"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -sfn "$ENV" "$RELEASE/.env.production"
rm -rf "$RELEASE/.next"
cd "$RELEASE"
pnpm exec eslint components/admin/FestivalFounderReview.tsx lib/holiday/festival-review-batch.ts app/admin/website-experience/festival-assets/review/page.tsx app/api/admin/website-experience/festival-review/route.ts tests/holiday/festival-review-batch.test.ts
pnpm exec tsc --noEmit
pnpm exec tsx --test tests/holiday/festival-review-batch.test.ts
pnpm build

export_governed_library "$BACKUP/governed-library-after.tsv"
export_review_sources "$BACKUP/review-sources-after.tsv"
GOVERNED_AFTER="$(sha256sum "$BACKUP/governed-library-after.tsv" | awk '{print $1}')"
SOURCES_AFTER="$(sha256sum "$BACKUP/review-sources-after.tsv" | awk '{print $1}')"
DECISIONS_AFTER="$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_asset_review_items where review_state<>'visual_review_required'")"
ACTIVE_AFTER="$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_pack_imports where state='active'")"
test "$GOVERNED_BEFORE" = "$GOVERNED_AFTER"
test "$SOURCES_BEFORE" = "$SOURCES_AFTER"
test "$DECISIONS_BEFORE" = "$DECISIONS_AFTER"
test "$ACTIVE_AFTER" = 0

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
echo "GOVERNED_BEFORE=$GOVERNED_BEFORE"
echo "GOVERNED_AFTER=$GOVERNED_AFTER"
echo "REVIEW_SOURCES_BEFORE=$SOURCES_BEFORE"
echo "REVIEW_SOURCES_AFTER=$SOURCES_AFTER"
echo "REVIEW_ITEMS=120"
echo "DECISIONS=$DECISIONS_AFTER"
echo "ACTIVE_PACKS=0"
echo "HEALTH=200"
echo "THEWRITEX_UNTOUCHED=$THEWRITEX_PID"
