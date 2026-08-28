#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/my-writex-demo"
RELEASES_DIR="${APP_ROOT}/releases"
SHARED_DIR="${APP_ROOT}/shared"
LOG_DIR="${APP_ROOT}/logs"
DATA_DIR="${SHARED_DIR}/data"
ACME_DIR="${APP_ROOT}/acme"
CURRENT_LINK="${APP_ROOT}/current"
ENV_FILE="${SHARED_DIR}/.env.demo"
PORT_FILE="${SHARED_DIR}/port"
SOURCE_DIR="${SOURCE_DIR:-$(pwd)}"
RELEASE_ID="${RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "${SOURCE_DIR}" rev-parse --short HEAD 2>/dev/null || printf source)}"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
DEMO_HOST="demo.writex.co.in"
SERVER_IP="43.205.194.174"
REVIEW_CODE_HASH="05c831a0205441614dd07086a086485687b28f0f6efc6c2cc1daf628a91b1481"
PREVIOUS_TARGET=""

if [[ "${EUID}" -eq 0 ]]; then
  echo "Run this script as the dedicated deployment user, not root." >&2
  exit 1
fi
if [[ ! -f "${SOURCE_DIR}/package.json" || ! -f "${SOURCE_DIR}/pnpm-lock.yaml" ]]; then
  echo "Invalid My WriteX demo source directory." >&2
  exit 1
fi
if [[ -e "${RELEASE_DIR}" ]]; then
  echo "Release already exists: ${RELEASE_DIR}" >&2
  exit 1
fi

prod_release_before="$(readlink -f /var/www/writex-co-in/current 2>/dev/null || true)"
prod_pid_before="$(pm2 pid writex-co-in 2>/dev/null | tail -n 1 || true)"
thewritex_pid_before="$(pm2 pid thewritex 2>/dev/null | tail -n 1 || true)"
prod_nginx_hash_before="$(sudo sha256sum /etc/nginx/sites-available/writex.co.in 2>/dev/null | awk '{print $1}' || true)"

sudo install -d -o "$(id -un)" -g www-data -m 750 \
  "${APP_ROOT}" "${RELEASES_DIR}" "${SHARED_DIR}" "${LOG_DIR}" "${DATA_DIR}" "${ACME_DIR}"

if [[ -f "${PORT_FILE}" ]]; then
  DEMO_PORT="$(tr -cd '0-9' < "${PORT_FILE}")"
  if [[ -z "${DEMO_PORT}" ]]; then
    echo "Stored demo port is invalid." >&2
    exit 1
  fi
else
  DEMO_PORT=""
  for candidate in $(seq 3100 3199); do
    if ! ss -ltn "sport = :${candidate}" | grep -q LISTEN; then
      DEMO_PORT="${candidate}"
      break
    fi
  done
  if [[ -z "${DEMO_PORT}" ]]; then
    echo "No free isolated demo port was found." >&2
    exit 1
  fi
  printf '%s\n' "${DEMO_PORT}" > "${PORT_FILE}"
  chmod 600 "${PORT_FILE}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  umask 077
  auth_secret="$(openssl rand -hex 48)"
  review_session="$(openssl rand -hex 32)"
  cat > "${ENV_FILE}" <<ENV
NODE_ENV=production
APP_ENV=demo
NEXT_PUBLIC_SITE_URL=https://${DEMO_HOST}
MY_WRITEX_DEMO_HOST=${DEMO_HOST}
MY_WRITEX_DEMO_PORT=${DEMO_PORT}
MY_WRITEX_DEMO_MODE=true
MY_WRITEX_ENABLED=true
MY_WRITEX_DEMO_ACCOUNT_ENABLED=true
MY_WRITEX_LTS_INTEGRATION_ENABLED=false
MY_WRITEX_CUSTOMER_MASTER_ENABLED=false
MY_WRITEX_REAL_REQUESTS_ENABLED=false
MY_WRITEX_PRODUCTION_AUTH_ENABLED=false
MY_WRITEX_LOCAL_MOCK_ENABLED=false
MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED=false
MY_WRITEX_DEV_FIXTURES=false
CLIENT_AUTH_PROVIDER=disabled
CLIENT_SESSION_COOKIE_NAME=__Host-my_writex_demo_session
CLIENT_SESSION_EXPIRY_SECONDS=3600
CLIENT_SESSION_IDLE_EXPIRY_SECONDS=1800
CLIENT_LOGIN_MAX_ATTEMPTS=6
AUTH_COOKIE_SECRET=${auth_secret}
MY_WRITEX_DEMO_REVIEW_CODE_HASH=${REVIEW_CODE_HASH}
MY_WRITEX_DEMO_REVIEW_SESSION_TOKEN=${review_session}
MY_WRITEX_REQUEST_STORE_PATH=${DATA_DIR}/requests.json
HEALTHCHECK_REQUIRE_DATABASE=false
DATABASE_URL=
LTS_API_BASE_URL=
LTS_API_KEY=
PMT_API_BASE_URL=
PMT_API_KEY=
NEXT_PUBLIC_DEMO_LOGIN_ENABLED=false
ENV
  chmod 600 "${ENV_FILE}"
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a
node "${SOURCE_DIR}/scripts/validate-my-writex-demo-env.mjs"

mkdir -p "${RELEASE_DIR}"
rsync -a --delete \
  --exclude='.git/' \
  --exclude='.next/' \
  --exclude='node_modules/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.log' \
  --exclude='.local/' \
  --exclude='reports/' \
  --exclude='artifacts/' \
  "${SOURCE_DIR}/" "${RELEASE_DIR}/"

(
  cd "${RELEASE_DIR}"
  pnpm install --frozen-lockfile
  pnpm exec tsx --test \
    tests/client-portal/my-writex-live-demo.test.ts \
    tests/client-portal/my-writex-stage3a.test.ts
)

# The demo artifact intentionally excludes production-only back-office routes.
# Keep every removal anchored to the newly created release directory so the
# source checkout and the live production release cannot be touched.
prune_demo_route() {
  local relative_path="$1"
  local target="${RELEASE_DIR}/${relative_path}"
  if [[ "${target}" != "${RELEASE_DIR}/"* || "${target}" == "${RELEASE_DIR}/" ]]; then
    echo "Refusing unsafe demo route prune: ${target}" >&2
    exit 1
  fi
  rm -rf -- "${target}"
}

prune_demo_route "app/admin"
prune_demo_route "app/api/admin"
prune_demo_route "app/api/client/dashboard"
prune_demo_route "app/api/client/download"
prune_demo_route "app/api/client/files"
prune_demo_route "app/api/client/invoices"
prune_demo_route "app/api/client/overview"
prune_demo_route "app/api/client/payment-proof"
prune_demo_route "app/api/client/payment-status"
prune_demo_route "app/api/client/preview"
prune_demo_route "app/api/client/project"
prune_demo_route "app/api/client/requests"
prune_demo_route "app/api/client/revision-request"
prune_demo_route "app/api/client/validate"
prune_demo_route "app/api/client/work-journey"
prune_demo_route "app/api/contact"
prune_demo_route "app/api/demo"
prune_demo_route "app/api/employee"
prune_demo_route "app/api/hiring"
prune_demo_route "app/api/jobs"
prune_demo_route "app/api/quote"
prune_demo_route "app/api/tools"
prune_demo_route "app/api/trust"
prune_demo_route "app/api/upload-brief"
prune_demo_route "app/api/website-experience"
prune_demo_route "app/about-us"
prune_demo_route "app/academic-integrity"
prune_demo_route "app/access-denied"
prune_demo_route "app/assignment-support"
prune_demo_route "app/client"
prune_demo_route "app/contact"
prune_demo_route "app/dissertation-thesis-support"
prune_demo_route "app/editing-proofreading"
prune_demo_route "app/employee"
prune_demo_route "app/employee-login"
prune_demo_route "app/formatting-referencing"
prune_demo_route "app/help"
prune_demo_route "app/plagiarism-ai-review"
prune_demo_route "app/pricing"
prune_demo_route "app/privacy"
prune_demo_route "app/reviews"
prune_demo_route "app/samples"
prune_demo_route "app/sop-admissions-writing"
prune_demo_route "app/templates"
prune_demo_route "app/terms"
prune_demo_route "app/tools"

install -m 644 "${RELEASE_DIR}/deploy/my-writex-demo/app-layout.tsx" "${RELEASE_DIR}/app/layout.tsx"
install -m 644 "${RELEASE_DIR}/deploy/my-writex-demo/app-page.tsx" "${RELEASE_DIR}/app/page.tsx"
install -m 644 "${RELEASE_DIR}/deploy/my-writex-demo/app-robots.ts" "${RELEASE_DIR}/app/robots.ts"
install -m 644 "${RELEASE_DIR}/deploy/my-writex-demo/app-sitemap.ts" "${RELEASE_DIR}/app/sitemap.ts"
install -m 644 "${RELEASE_DIR}/deploy/my-writex-demo/tsconfig.demo.json" "${RELEASE_DIR}/tsconfig.json"

(
  cd "${RELEASE_DIR}"
  pnpm exec eslint \
    app/api/client/auth/login/route.ts \
    app/api/dev/my-writex-review-auth/route.ts \
    app/api/dev/my-writex-requests \
    app/api/my-writex/requests \
    app/dev/my-writex-requests/page.tsx \
    app/client-login/page.tsx \
    app/my-writex/layout.tsx \
    components/client/ClientLoginForm.tsx \
    components/my-writex/DemoReviewAccessForm.tsx \
    components/my-writex/MyWritexShell.tsx \
    components/my-writex/RequestInspector.tsx \
    lib/my-writex \
    proxy.ts
  pnpm run typecheck
  pnpm run build
)

if [[ ! -f "${MY_WRITEX_REQUEST_STORE_PATH}" ]]; then
  (
    cd "${RELEASE_DIR}"
    pnpm exec tsx scripts/reset-my-writex-demo.ts
  )
fi

if [[ -L "${CURRENT_LINK}" ]]; then
  PREVIOUS_TARGET="$(readlink -f "${CURRENT_LINK}")"
fi
next_link="${APP_ROOT}/.current-${RELEASE_ID}"
ln -s "${RELEASE_DIR}" "${next_link}"
mv -Tf "${next_link}" "${CURRENT_LINK}"

rollback_on_error() {
  exit_code=$?
  if [[ -n "${PREVIOUS_TARGET}" && -d "${PREVIOUS_TARGET}" ]]; then
    restore_link="${APP_ROOT}/.current-restore-${RELEASE_ID}"
    ln -s "${PREVIOUS_TARGET}" "${restore_link}"
    mv -Tf "${restore_link}" "${CURRENT_LINK}"
    pm2 restart my-writex-demo --update-env >/dev/null 2>&1 || true
  else
    pm2 delete my-writex-demo >/dev/null 2>&1 || true
    rm -f "${CURRENT_LINK}"
  fi
  exit "${exit_code}"
}
trap rollback_on_error ERR

if pm2 describe my-writex-demo >/dev/null 2>&1; then
  pm2 restart my-writex-demo --update-env
else
  pm2 start "${CURRENT_LINK}/deploy/my-writex-demo/ecosystem.config.cjs" --only my-writex-demo --update-env
fi

for attempt in {1..30}; do
  if curl --fail --silent --show-error -H "Host: ${DEMO_HOST}" "http://127.0.0.1:${DEMO_PORT}/api/health" >/dev/null; then
    break
  fi
  if [[ "${attempt}" -eq 30 ]]; then
    echo "My WriteX demo health check failed." >&2
    false
  fi
  sleep 2
done

nginx_template="${CURRENT_LINK}/deploy/my-writex-demo/nginx-http.conf"
if sudo test -f "/etc/letsencrypt/live/${DEMO_HOST}/fullchain.pem"; then
  nginx_template="${CURRENT_LINK}/deploy/my-writex-demo/nginx-https.conf"
fi
sed "s/__DEMO_PORT__/${DEMO_PORT}/g" "${nginx_template}" > "${APP_ROOT}/my-writex-demo.nginx.conf"
if sudo test -e /etc/nginx/sites-available/my-writex-demo && \
   ! sudo grep -q '^# MY_WRITEX_ISOLATED_DEMO$' /etc/nginx/sites-available/my-writex-demo; then
  echo "Refusing to overwrite an unrecognized Nginx site." >&2
  false
fi
sudo install -o root -g root -m 644 "${APP_ROOT}/my-writex-demo.nginx.conf" /etc/nginx/sites-available/my-writex-demo
if [[ ! -L /etc/nginx/sites-enabled/my-writex-demo ]]; then
  sudo ln -s /etc/nginx/sites-available/my-writex-demo /etc/nginx/sites-enabled/my-writex-demo
fi
sudo nginx -t
sudo systemctl reload nginx

resolved_ip="$(getent ahostsv4 "${DEMO_HOST}" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
if [[ "${resolved_ip}" == "${SERVER_IP}" ]] && ! sudo test -f "/etc/letsencrypt/live/${DEMO_HOST}/fullchain.pem"; then
  sudo certbot certonly --webroot -w "${ACME_DIR}" -d "${DEMO_HOST}" \
    --non-interactive --agree-tos --email info@writex.co.in --keep-until-expiring
  sed "s/__DEMO_PORT__/${DEMO_PORT}/g" "${CURRENT_LINK}/deploy/my-writex-demo/nginx-https.conf" > "${APP_ROOT}/my-writex-demo.nginx.conf"
  sudo install -o root -g root -m 644 "${APP_ROOT}/my-writex-demo.nginx.conf" /etc/nginx/sites-available/my-writex-demo
  sudo nginx -t
  sudo systemctl reload nginx
fi

cat > "${APP_ROOT}/reset-my-writex-demo" <<'RESET'
#!/usr/bin/env bash
set -Eeuo pipefail
set -a
source /var/www/my-writex-demo/shared/.env.demo
set +a
cd /var/www/my-writex-demo/current
pnpm exec tsx scripts/reset-my-writex-demo.ts
RESET
chmod 750 "${APP_ROOT}/reset-my-writex-demo"

cat > "${APP_ROOT}/rollback-my-writex-demo" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
exec bash /var/www/my-writex-demo/current/scripts/rollback-my-writex-demo.sh "$@"
ROLLBACK
chmod 750 "${APP_ROOT}/rollback-my-writex-demo"

pm2 save >/dev/null

prod_release_after="$(readlink -f /var/www/writex-co-in/current 2>/dev/null || true)"
prod_pid_after="$(pm2 pid writex-co-in 2>/dev/null | tail -n 1 || true)"
thewritex_pid_after="$(pm2 pid thewritex 2>/dev/null | tail -n 1 || true)"
prod_nginx_hash_after="$(sudo sha256sum /etc/nginx/sites-available/writex.co.in 2>/dev/null | awk '{print $1}' || true)"

if [[ "${prod_release_before}" != "${prod_release_after}" || \
      "${prod_pid_before}" != "${prod_pid_after}" || \
      "${thewritex_pid_before}" != "${thewritex_pid_after}" || \
      "${prod_nginx_hash_before}" != "${prod_nginx_hash_after}" ]]; then
  echo "Production isolation invariant changed; manual incident review is required." >&2
  false
fi

trap - ERR

mapfile -t old_releases < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +5 | cut -d' ' -f2-)
for old_release in "${old_releases[@]:-}"; do
  if [[ -n "${old_release}" && "${old_release}" == "${RELEASES_DIR}/"* && "${old_release}" != "$(readlink -f "${CURRENT_LINK}")" ]]; then
    rm -rf -- "${old_release}"
  fi
done

tls_ready=false
if sudo test -f "/etc/letsencrypt/live/${DEMO_HOST}/fullchain.pem"; then tls_ready=true; fi
echo "DEMO_RELEASE=${RELEASE_DIR}"
echo "DEMO_PORT=${DEMO_PORT}"
echo "DEMO_TLS_READY=${tls_ready}"
echo "DEMO_RESET=${APP_ROOT}/reset-my-writex-demo"
echo "DEMO_ROLLBACK=${APP_ROOT}/rollback-my-writex-demo"
echo "PRODUCTION_ISOLATION=verified"
