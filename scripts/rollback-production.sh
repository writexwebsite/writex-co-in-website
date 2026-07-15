#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"
RELEASES_DIR="${APP_ROOT}/releases"
CURRENT_LINK="${APP_ROOT}/current"
RELEASE_ID="${1:-}"

if [[ -z "${RELEASE_ID}" || ! "${RELEASE_ID}" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "Usage: $0 <release-id, for example 20260715T120000Z>" >&2
  exit 1
fi

TARGET_RELEASE="${RELEASES_DIR}/${RELEASE_ID}"
if [[ ! -d "${TARGET_RELEASE}" || ! -f "${TARGET_RELEASE}/ecosystem.config.cjs" ]]; then
  echo "Release is not available: ${TARGET_RELEASE}" >&2
  exit 1
fi

PREVIOUS_TARGET="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
bash "${APP_ROOT}/current/scripts/backup-production.sh"

ROLLBACK_LINK="${APP_ROOT}/.current-rollback-${RELEASE_ID}"
ln -s "${TARGET_RELEASE}" "${ROLLBACK_LINK}"
mv -Tf "${ROLLBACK_LINK}" "${CURRENT_LINK}"

restore_previous() {
  local exit_code=$?
  if [[ -n "${PREVIOUS_TARGET}" && -d "${PREVIOUS_TARGET}" ]]; then
    restore_link="${APP_ROOT}/.current-restore-${RELEASE_ID}"
    ln -s "${PREVIOUS_TARGET}" "${restore_link}"
    mv -Tf "${restore_link}" "${CURRENT_LINK}"
    pm2 startOrReload "${CURRENT_LINK}/ecosystem.config.cjs" --only writex-co-in --update-env || true
  fi
  exit "${exit_code}"
}
trap restore_previous ERR

pm2 startOrReload "${CURRENT_LINK}/ecosystem.config.cjs" --only writex-co-in --update-env
curl --fail --retry 10 --retry-delay 2 --retry-connrefused http://127.0.0.1:3002/api/health

trap - ERR
echo "Rollback verified: ${RELEASE_ID}"
