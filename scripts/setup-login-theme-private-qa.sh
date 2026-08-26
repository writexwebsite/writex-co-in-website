#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/writex-co-in"
QA_DATABASE="writex_co_in_login_theme_qa"
QA_PORT="3003"
QA_PID_FILE="/tmp/writex-login-theme-qa.pid"
BACKUP="${1:?Production database backup path is required.}"

if [[ ! -f "${BACKUP}" ]]; then
  echo "The production backup required for private QA was not found." >&2
  exit 1
fi

if ss -ltn | grep -q ":${QA_PORT} "; then
  echo "Private QA port ${QA_PORT} is already in use." >&2
  exit 1
fi

if sudo -n -u postgres psql -Atc \
  "select 1 from pg_database where datname = '${QA_DATABASE}'" |
  grep -q '^1$'; then
  echo "Private QA database already exists; refusing to overwrite it." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "${ROOT}/shared/.env.production"
set +a

if [[ "${DATABASE_URL}" == *"?"* ]]; then
  DATABASE_BASE="${DATABASE_URL%%\?*}"
  DATABASE_QUERY="?${DATABASE_URL#*\?}"
else
  DATABASE_BASE="${DATABASE_URL}"
  DATABASE_QUERY=""
fi
QA_DATABASE_URL="${DATABASE_BASE%/*}/${QA_DATABASE}${DATABASE_QUERY}"

sudo -n -u postgres createdb -O writex_co_in_app "${QA_DATABASE}"
gzip -dc "${BACKUP}" | psql "${QA_DATABASE_URL}" -v ON_ERROR_STOP=1 >/dev/null
psql "${QA_DATABASE_URL}" -v ON_ERROR_STOP=1 \
  -f "${ROOT}/current/database/migrations/20260729_login_theme_composer.sql" \
  >/dev/null

psql "${QA_DATABASE_URL}" -v ON_ERROR_STOP=1 <<'SQL'
update holiday_themes
set
  status = 'active',
  is_enabled = true,
  apply_to_login_screens = true,
  apply_to_client_login = true,
  experience_config = jsonb_set(
    coalesce(experience_config, '{}'::jsonb),
    '{approvalStatus}',
    '"approved"'::jsonb,
    true
  ),
  updated_at = now()
where slug = 'holi';

update holiday_login_theme_settings
set
  mode = 'holiday',
  state = 'theme_active',
  theme_id = (select id from holiday_themes where slug = 'holi' limit 1),
  enabled = true,
  approval_state = 'approved',
  updated_at = now()
where channel = 'client';
SQL

cd "${ROOT}/current"
nohup env \
  DATABASE_URL="${QA_DATABASE_URL}" \
  WRITEX_INTERNAL_APP_URL="http://127.0.0.1:${QA_PORT}" \
  pnpm start -H 127.0.0.1 -p "${QA_PORT}" \
  > /tmp/writex-login-theme-qa.log 2>&1 &
printf '%s\n' "$!" > "${QA_PID_FILE}"

for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${QA_PORT}/api/health" >/dev/null; then
    printf 'private_qa=ready\n'
    printf 'port=%s\n' "${QA_PORT}"
    exit 0
  fi
  sleep 1
done

cat /tmp/writex-login-theme-qa.log >&2
exit 1
