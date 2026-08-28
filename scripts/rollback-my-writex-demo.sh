#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/my-writex-demo"
TARGET_NAME="${1:?Usage: rollback-my-writex-demo.sh <release-directory-name>}"
TARGET="${APP_ROOT}/releases/${TARGET_NAME}"
CURRENT="${APP_ROOT}/current"
ENV_FILE="${APP_ROOT}/shared/.env.demo"

if [[ ! -d "${TARGET}" || "$(realpath "${TARGET}")" != "${APP_ROOT}/releases/"* ]]; then
  echo "Refusing invalid My WriteX demo rollback target." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

next_link="${APP_ROOT}/.current-rollback-$$"
ln -s "${TARGET}" "${next_link}"
mv -Tf "${next_link}" "${CURRENT}"
pm2 restart my-writex-demo --update-env

for attempt in {1..30}; do
  if curl --fail --silent --show-error -H "Host: ${MY_WRITEX_DEMO_HOST}" "http://127.0.0.1:${MY_WRITEX_DEMO_PORT}/api/health" >/dev/null; then
    echo "My WriteX demo rollback verified: ${TARGET}"
    exit 0
  fi
  sleep 2
done

echo "My WriteX demo rollback health check failed." >&2
exit 1
