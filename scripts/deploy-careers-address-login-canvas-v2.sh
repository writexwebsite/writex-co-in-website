#!/usr/bin/env bash
set -Eeuo pipefail

RID="20260801T084421Z-careers-address-login-canvas-v2"
ROOT="/var/www/writex-co-in"
ARCHIVE="/tmp/writex-${RID}.tgz"
RELEASE="${ROOT}/releases/${RID}"
BACKUP="${ROOT}/backups/deployments/${RID}"
ACTIVE="$(readlink -f "${ROOT}/current")"
MIGRATION_BACKUP="${BACKUP}/hiring-role-labels-before.json"
MIGRATION_APPLIED=0
SWITCHED=0

rollback_on_error() {
  local exit_code=$?
  if [[ "${SWITCHED}" == "1" ]]; then
    ln -sfn "${ACTIVE}" "${ROOT}/current"
    pm2 reload writex-co-in --update-env >/dev/null 2>&1 || true
  fi
  if [[ "${MIGRATION_APPLIED}" == "1" ]]; then
    (
      cd "${RELEASE}"
      MIGRATION_MODE=restore MIGRATION_BACKUP_PATH="${MIGRATION_BACKUP}" \
        node --env-file="${ROOT}/shared/.env.production" \
        scripts/apply-hiring-role-label-migration.mjs
    ) || true
  fi
  echo "DEPLOYMENT_ROLLED_BACK_TO=${ACTIVE}"
  exit "${exit_code}"
}
trap rollback_on_error ERR

test -f "${ARCHIVE}"
test -d "${ACTIVE}"
test ! -e "${RELEASE}"
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = "200"

mkdir -p "${BACKUP}" "${RELEASE}"
chmod 700 "${BACKUP}"
printf '%s\n' "${ACTIVE}" > "${BACKUP}/previous-release.txt"
cp -p "${ROOT}/shared/.env.production" "${BACKUP}/env.production"
chmod 600 "${BACKUP}/env.production"

cp -a "${ACTIVE}/." "${RELEASE}/"
tar -xzf "${ARCHIVE}" -C "${RELEASE}"
ln -sfn "${ROOT}/shared/.env.production" "${RELEASE}/.env.production"
rm -rf "${RELEASE}/.next"

cd "${RELEASE}"
pnpm build

MIGRATION_BACKUP_PATH="${MIGRATION_BACKUP}" \
  node --env-file="${ROOT}/shared/.env.production" \
  scripts/apply-hiring-role-label-migration.mjs
MIGRATION_APPLIED=1

ln -sfn "${RELEASE}" "${ROOT}/current"
SWITCHED=1
pm2 reload writex-co-in --update-env

for attempt in {1..30}; do
  if [[ "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health || true)" == "200" ]]; then
    break
  fi
  sleep 2
done

test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = "200"
test "$(curl -sS -o /dev/null -w '%{http_code}' https://www.writex.co.in/api/health)" = "200"

trap - ERR
echo "DEPLOYED_RELEASE=${RID}"
echo "PREVIOUS_RELEASE=${ACTIVE}"
echo "BACKUP=${BACKUP}"
