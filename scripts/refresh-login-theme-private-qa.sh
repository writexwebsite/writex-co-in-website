#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/writex-co-in"
RELEASE_ID="${1:?Release ID is required.}"
BACKUP_DIR="$ROOT/backups/deployments/$RELEASE_ID"
QA_BACKUP="$BACKUP_DIR/database-after-8k-asset.sql.gz"

bash /tmp/teardown-login-theme-private-qa.sh
if ss -ltn | grep -q ':3003 '; then
  echo "Private QA port 3003 is still in use after the scoped teardown." >&2
  ss -ltnp 'sport = :3003' >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
set -a
# shellcheck disable=SC1090
source "$ROOT/shared/.env.production"
set +a

pg_dump --no-owner --no-acl "$DATABASE_URL" | gzip -9 >"$QA_BACKUP"
bash /tmp/setup-login-theme-private-qa.sh "$QA_BACKUP"

printf 'qa_backup=%s\n' "$QA_BACKUP"
