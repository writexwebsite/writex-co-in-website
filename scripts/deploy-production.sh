#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"
RELEASES_DIR="${APP_ROOT}/releases"
SHARED_DIR="${APP_ROOT}/shared"
LOG_DIR="${APP_ROOT}/logs"
BACKUP_DIR="${APP_ROOT}/backups"
CURRENT_LINK="${APP_ROOT}/current"
ENV_FILE="${SHARED_DIR}/.env.production"
SOURCE_DIR="${SOURCE_DIR:-$(pwd)}"
RELEASE_ID="${RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
PREVIOUS_TARGET=""

if [[ "${EUID}" -eq 0 ]]; then
  echo "Run this script as the dedicated WriteX deploy user, not root." >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DIR}/package.json" || ! -f "${SOURCE_DIR}/pnpm-lock.yaml" ]]; then
  echo "SOURCE_DIR is not a valid WriteX release source: ${SOURCE_DIR}" >&2
  exit 1
fi

if [[ -e "${RELEASE_DIR}" ]]; then
  echo "Release already exists: ${RELEASE_DIR}" >&2
  exit 1
fi

install -d -m 750 "${APP_ROOT}" "${RELEASES_DIR}" "${SHARED_DIR}" "${LOG_DIR}" "${BACKUP_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Create ${ENV_FILE} from .env.production.example before deploying." >&2
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

mkdir -p "${RELEASE_DIR}"
rsync -a --delete \
  --exclude='.git/' \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.log' \
  --exclude='.codex-*' \
  --exclude='.next.stale-*' \
  --exclude='artifacts/' \
  --exclude='handoff/' \
  --exclude='handoff-work/' \
  --exclude='tmp/' \
  "${SOURCE_DIR}/" "${RELEASE_DIR}/"

ln -s "${ENV_FILE}" "${RELEASE_DIR}/.env.production"

(
  cd "${RELEASE_DIR}"
  node --env-file="${ENV_FILE}" scripts/validate-production-env.mjs
  pnpm install --frozen-lockfile
  pnpm run lint
  pnpm run typecheck
  pnpm run build
)

if [[ -L "${CURRENT_LINK}" ]]; then
  PREVIOUS_TARGET="$(readlink -f "${CURRENT_LINK}")"
  bash "${RELEASE_DIR}/scripts/backup-production.sh"
fi

NEXT_LINK="${APP_ROOT}/.current-${RELEASE_ID}"
ln -s "${RELEASE_DIR}" "${NEXT_LINK}"
mv -Tf "${NEXT_LINK}" "${CURRENT_LINK}"

rollback_on_error() {
  local exit_code=$?
  if [[ -n "${PREVIOUS_TARGET}" && -d "${PREVIOUS_TARGET}" ]]; then
    echo "Deployment failed; restoring ${PREVIOUS_TARGET}." >&2
    restore_link="${APP_ROOT}/.current-restore-${RELEASE_ID}"
    ln -s "${PREVIOUS_TARGET}" "${restore_link}"
    mv -Tf "${restore_link}" "${CURRENT_LINK}"
    restart_writex || true
  elif [[ "$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)" == "${RELEASE_DIR}" ]]; then
    rm -f -- "${CURRENT_LINK}"
    pm2 delete writex-co-in >/dev/null 2>&1 || true
  fi
  exit "${exit_code}"
}
trap rollback_on_error ERR

restart_writex

for attempt in {1..20}; do
  if curl --fail --silent --show-error http://127.0.0.1:3002/api/health >/dev/null; then
    break
  fi
  if [[ "${attempt}" -eq 20 ]]; then
    echo "Health check failed after deployment." >&2
    false
  fi
  sleep 2
done

trap - ERR

mapfile -t old_releases < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n "+$((KEEP_RELEASES + 1))" | cut -d' ' -f2-)
for old_release in "${old_releases[@]:-}"; do
  if [[ -n "${old_release}" && "${old_release}" == "${RELEASES_DIR}/"* && "${old_release}" != "$(readlink -f "${CURRENT_LINK}")" ]]; then
    rm -rf -- "${old_release}"
  fi
done

echo "Deployment verified: ${RELEASE_ID}"
