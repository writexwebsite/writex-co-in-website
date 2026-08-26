#!/usr/bin/env bash
set -Eeuo pipefail

RID="${1:?release id is required}"
ROOT="/var/www/writex-co-in"
ARCHIVE="/tmp/writex-${RID}.tgz"
RELEASE="${ROOT}/releases/${RID}"
BACKUP="${ROOT}/backups/deployments/${RID}"
ACTIVE="$(readlink -f "${ROOT}/current")"
ENV_FILE="${ROOT}/shared/.env.production"
TEMP_PORT=4302
SWITCHED=0
TEMP_PID=""
THEWRITEX_PID_BEFORE="$(pm2 pid thewritex | head -n 1)"

cleanup_temp() {
  if [[ -n "${TEMP_PID}" ]] && kill -0 "${TEMP_PID}" 2>/dev/null; then
    kill "${TEMP_PID}" 2>/dev/null || true
    wait "${TEMP_PID}" 2>/dev/null || true
  fi
}

rollback_on_error() {
  local exit_code=$?
  cleanup_temp
  if [[ "${SWITCHED}" == "1" ]]; then
    ln -sfn "${ACTIVE}" "${ROOT}/current.rollback"
    mv -Tf "${ROOT}/current.rollback" "${ROOT}/current"
    pm2 reload writex-co-in --update-env >/dev/null 2>&1 || true
  fi
  echo "DEPLOYMENT_ROLLED_BACK_TO=${ACTIVE}"
  exit "${exit_code}"
}
trap rollback_on_error ERR

test -f "${ARCHIVE}"
test -d "${ACTIVE}"
test -f "${ENV_FILE}"
test ! -e "${RELEASE}"
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/api/health)" = "200"

mkdir -p "${BACKUP}" "${RELEASE}"
chmod 700 "${BACKUP}"
printf '%s\n' "${ACTIVE}" > "${BACKUP}/previous-release.txt"
cp -p "${ENV_FILE}" "${BACKUP}/env.production"
chmod 600 "${BACKUP}/env.production"
pm2 describe writex-co-in > "${BACKUP}/pm2-writex-co-in-before.txt"
pm2 describe thewritex > "${BACKUP}/pm2-thewritex-before.txt"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

pg_dump "${DATABASE_URL}" --format=custom --file="${BACKUP}/writex-co-in-before.dump"
chmod 600 "${BACKUP}/writex-co-in-before.dump"
psql "${DATABASE_URL}" -Atqc "
  select json_build_object(
    'activeSnapshotCount', (select count(*) from active_festival_snapshots where state = 'active'),
    'activeThemeCount', (select count(*) from holiday_themes where status = 'active'),
    'exportedAt', now()
  )::text
" > "${BACKUP}/festival-state-before.json"

cp -a "${ACTIVE}/." "${RELEASE}/"
tar -xzf "${ARCHIVE}" -C "${RELEASE}"
ln -sfn "${ENV_FILE}" "${RELEASE}/.env.production"
rm -rf "${RELEASE}/.next"

cd "${RELEASE}"
pnpm exec tsx --test tests/holiday/festival-studio.test.ts
pnpm build

env HOSTNAME=127.0.0.1 PORT="${TEMP_PORT}" pnpm start > "${BACKUP}/temporary-port.log" 2>&1 &
TEMP_PID=$!
for attempt in {1..45}; do
  if [[ "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${TEMP_PORT}/api/health" || true)" == "200" ]]; then
    break
  fi
  sleep 2
done
test "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${TEMP_PORT}/api/health")" = "200"
cleanup_temp
TEMP_PID=""

ln -sfn "${RELEASE}" "${ROOT}/current.next"
mv -Tf "${ROOT}/current.next" "${ROOT}/current"
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
test "$(pm2 pid thewritex | head -n 1)" = "${THEWRITEX_PID_BEFORE}"

trap - ERR
echo "DEPLOYED_RELEASE=${RID}"
echo "PREVIOUS_RELEASE=${ACTIVE}"
echo "BACKUP=${BACKUP}"
echo "TEMPORARY_PORT_HEALTH=200"
echo "LOCAL_HEALTH=200"
echo "PUBLIC_HEALTH=200"
echo "THEWRITEX_UNTOUCHED_PID=${THEWRITEX_PID_BEFORE}"
