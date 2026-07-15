#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"

echo "Current release: $(readlink -f "${APP_ROOT}/current")"
pm2 describe writex-co-in >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3002/api/health
echo
ss -ltnp | grep -E '127\.0\.0\.1:3002\b'
sudo nginx -t
curl --fail --silent --show-error --head https://www.writex.co.in/

set -a
# shellcheck disable=SC1090
source "${APP_ROOT}/shared/.env.production"
set +a

test "$(psql "${DATABASE_URL}" -Atqc 'select current_database()')" = "writex_co_in"
echo "Production verification passed."
