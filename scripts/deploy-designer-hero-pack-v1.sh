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
    select 'group', id::text, festival_slug, festival_name, source_status,
      coalesce(default_variant_slug,''), coalesce(source_message,'')
    from festival_hero_groups
    union all
    select 'pack', id::text, coalesce(manifest_json->>'festivalSlug',''),
      coalesce(manifest_json->>'festivalName',''), state,
      coalesce(manifest_json->>'variantSlug',''), manifest_json::text
    from festival_pack_imports
    where manifest_json->>'packType' = 'responsive_festival_hero'
    union all
    select 'studio', id::text, festival_slug, festival_name, activation_status,
      coalesce(selected_variant_slug,''),
      concat_ws('|', coalesce(festival_group_id::text,''), coalesce(selected_variant_pack_id::text,''),
        coalesce(client_login_hero_asset_id::text,''), coalesce(employee_login_hero_asset_id::text,''),
        coalesce(website_hero_asset_id::text,''))
    from festival_studio_configurations
    order by 1, 3, 6, 2
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
export_baseline "$BACKUP/existing-festival-mapping-before.tsv"
BASELINE_SHA="$(sha256sum "$BACKUP/existing-festival-mapping-before.tsv" | awk '{print $1}')"
printf '%s\n' "$BASELINE_SHA" > "$BACKUP/existing-festival-mapping-before.sha256"
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_pack_imports where state='active'")" = 0

cp -a "$ACTIVE/." "$RELEASE/"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -sfn "$ENV" "$RELEASE/.env.production"
rm -rf "$RELEASE/.next"
cd "$RELEASE"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260801_designer_hero_packs.sql
test "$(psql "$DATABASE_URL" -Atqc "select to_regclass('public.designer_hero_packs') is not null")" = t
pnpm exec eslint app/api/admin/website-experience/designer-hero-packs/route.ts components/admin/DesignerHeroPackManager.tsx app/admin/website-experience/designer-hero-packs/page.tsx
pnpm exec tsc --noEmit
pnpm exec tsx --test tests/holiday/festival-studio.test.ts tests/holiday/festival-hero-pilot.test.ts
pnpm build

export_baseline "$BACKUP/existing-festival-mapping-after.tsv"
AFTER_SHA="$(sha256sum "$BACKUP/existing-festival-mapping-after.tsv" | awk '{print $1}')"
printf '%s\n' "$AFTER_SHA" > "$BACKUP/existing-festival-mapping-after.sha256"
test "$BASELINE_SHA" = "$AFTER_SHA"
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from designer_hero_packs")" = 0
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
test "$(pm2 pid thewritex | head -n1)" = "$THEWRITEX_PID"

trap - ERR
echo "RELEASE=$RID"
echo "BACKUP=$BACKUP"
echo "PREVIOUS=$ACTIVE"
echo "BASELINE_BEFORE=$BASELINE_SHA"
echo "BASELINE_AFTER=$AFTER_SHA"
echo "ACTIVE_PACKS=0"
echo "DESIGNER_PACKS=0"
echo "HEALTH=200"
echo "THEWRITEX_UNTOUCHED=$THEWRITEX_PID"
