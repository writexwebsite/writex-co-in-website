#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"
RELEASES_DIR="${APP_ROOT}/releases"
CURRENT_LINK="${APP_ROOT}/current"
ENV_FILE="${APP_ROOT}/shared/.env.production"
RELEASE_ID="${1:-}"

if [[ -z "${RELEASE_ID}" || ! "${RELEASE_ID}" =~ ^[0-9]{8}T[0-9]{6}Z(-[A-Za-z0-9._-]+)?$ ]]; then
  echo "Usage: $0 <release-id, for example 20260715T120000Z>" >&2
  exit 1
fi

load_runtime_env() {
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
}

restart_writex() {
  load_runtime_env
  if [[ -n "$(pm2 pid writex-co-in 2>/dev/null || true)" ]]; then
    pm2 restart writex-co-in --update-env
  else
    pm2 start "${CURRENT_LINK}/ecosystem.config.cjs" --only writex-co-in --update-env
  fi
}

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
    restart_writex || true
  fi
  exit "${exit_code}"
}
trap restore_previous ERR

restart_writex
curl --fail --retry 10 --retry-delay 2 --retry-connrefused http://127.0.0.1:3002/api/health

trap - ERR
echo "Rollback verified: ${RELEASE_ID}"
