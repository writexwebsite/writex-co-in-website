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
    ln -sfn "$ACTIVE" "$ROOT/current.rollback" && mv -Tf "$ROOT/current.rollback" "$ROOT/current"
    pm2 reload writex-co-in --update-env >/dev/null 2>&1 || true
  fi
  echo "ROLLED_BACK_TO=$ACTIVE"
  exit "$code"
}
trap rollback ERR
test -f "$ARCHIVE"; test -d "$ACTIVE"; test ! -e "$RELEASE"; test -f "$ENV"
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = 200
mkdir -p "$BACKUP" "$RELEASE"; chmod 700 "$BACKUP"
printf '%s\n' "$ACTIVE" > "$BACKUP/previous-release.txt"
cp -p "$ENV" "$BACKUP/env.production"; chmod 600 "$BACKUP/env.production"
set -a; source "$ENV"; set +a
pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP/database-before.dump"; chmod 600 "$BACKUP/database-before.dump"
cp -a "$ACTIVE/." "$RELEASE/"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -sfn "$ENV" "$RELEASE/.env.production"
rm -rf "$RELEASE/.next"
cd "$RELEASE"
pnpm build
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/20260801_complete_festival_canonical_mapping.sql
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_hero_groups where source_status='ready'")" -ge 28
test "$(psql "$DATABASE_URL" -Atqc "select count(*) from festival_pack_imports where manifest_json->>'packType'='responsive_festival_hero' and manifest_json->>'festivalSlug' is not null")" -eq 44
test "$(psql "$DATABASE_URL" -Atqc "select source_status from festival_hero_groups where festival_slug='holi'")" = source_required
ln -sfn "$RELEASE" "$ROOT/current.next"; mv -Tf "$ROOT/current.next" "$ROOT/current"; SWITCHED=1
pm2 reload writex-co-in --update-env
for i in {1..30}; do [[ "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health || true)" = 200 ]] && break; sleep 2; done
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = 200
test "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/api/health)" = 200
test "$(pm2 pid thewritex | head -n1)" = "$THEWRITEX_PID"
trap - ERR
echo "RELEASE=$RID"; echo "BACKUP=$BACKUP"; echo "PREVIOUS=$ACTIVE"; echo "HEALTH=200"; echo "THEWRITEX_UNTOUCHED=$THEWRITEX_PID"
