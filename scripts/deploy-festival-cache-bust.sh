#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/writex-co-in"
ARCHIVE="${1:?Festival cache patch archive path is required.}"
RELEASE_ID="${2:?Release ID is required.}"
NEW_RELEASE="${ROOT}/releases/${RELEASE_ID}"
CURRENT_RELEASE="$(readlink -f "${ROOT}/current")"
BACKUP_DIR="${ROOT}/backups/deployments/${RELEASE_ID}"
SWITCHED=0

case "${NEW_RELEASE}" in
  "${ROOT}"/releases/*) ;;
  *)
    echo "Release path escaped the WriteX release directory." >&2
    exit 1
    ;;
esac

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Festival cache patch archive was not found." >&2
  exit 1
fi

if [[ ! -d "${CURRENT_RELEASE}" ]]; then
  echo "Current WriteX release is unavailable." >&2
  exit 1
fi

if [[ -e "${NEW_RELEASE}" ]]; then
  echo "Release already exists: ${NEW_RELEASE}" >&2
  exit 1
fi

rollback_on_error() {
  if [[ "${SWITCHED}" == "1" ]]; then
    ln -s "${CURRENT_RELEASE}" "${ROOT}/.current-rollback-${RELEASE_ID}"
    mv -Tf "${ROOT}/.current-rollback-${RELEASE_ID}" "${ROOT}/current"
    pm2 reload writex-co-in --update-env >/dev/null
    echo "Health validation failed; restored ${CURRENT_RELEASE}." >&2
  fi
}
trap rollback_on_error ERR

mkdir -p "${BACKUP_DIR}"
printf '%s\n' "${CURRENT_RELEASE}" > "${BACKUP_DIR}/previous-release.txt"
cp -p "${ROOT}/shared/.env.production" "${BACKUP_DIR}/env.production.backup"

mkdir "${NEW_RELEASE}"
cp -al "${CURRENT_RELEASE}/." "${NEW_RELEASE}/"
tar --unlink-first -xzf "${ARCHIVE}" -C "${NEW_RELEASE}"

if [[ -d "${NEW_RELEASE}/.next" ]]; then
  rm -rf "${NEW_RELEASE}/.next"
fi
ln -sfn "${ROOT}/shared/.env.production" "${NEW_RELEASE}/.env.production"

cd "${NEW_RELEASE}"
set -a
# shellcheck disable=SC1091
source "${ROOT}/shared/.env.production"
set +a

pnpm build

ln -s "${NEW_RELEASE}" "${ROOT}/.current-${RELEASE_ID}"
mv -Tf "${ROOT}/.current-${RELEASE_ID}" "${ROOT}/current"
SWITCHED=1

pm2 reload writex-co-in --update-env

for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:3002/api/health >/dev/null; then
    break
  fi
  sleep 1
done

curl -fsS http://127.0.0.1:3002/api/health >/dev/null
curl -fsS https://www.writex.co.in/api/health >/dev/null
curl -fsS http://127.0.0.1:3001 >/dev/null
curl -fsS https://thewritex.com >/dev/null

SWITCHED=0
trap - ERR

printf 'release=%s\n' "${RELEASE_ID}"
printf 'previous=%s\n' "${CURRENT_RELEASE}"
printf 'backup=%s\n' "${BACKUP_DIR}"
printf 'writex_local_health=200\n'
printf 'writex_public_health=200\n'
printf 'thewritex_local_health=200\n'
printf 'thewritex_public_health=200\n'
