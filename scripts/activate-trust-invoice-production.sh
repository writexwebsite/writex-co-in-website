#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="writex-co-in"
APP_ROOT="/var/www/writex-co-in"
CURRENT_LINK="${APP_ROOT}/current"
NEW_RELEASE="${APP_ROOT}/releases/20261028T2220Z-trust-invoice-a1bc739"
ROLLBACK_ENV="${APP_ROOT}/.trust-invoice-rollback-env-20261028.json"
PM2_BIN="$(command -v pm2)"

OLD_RELEASE="$(readlink -f "${CURRENT_LINK}")"
OLD_PID="$(sudo -u writexdeploy pm2 pid "${APP_NAME}" | tail -n1)"

test -n "${OLD_RELEASE}"
test "${OLD_RELEASE}" != "${NEW_RELEASE}"
test "${OLD_PID}" -gt 0
test -x "${PM2_BIN}"
test -f "${NEW_RELEASE}/.env.production"
test -d "${NEW_RELEASE}/.next"

node - "${OLD_PID}" "${ROLLBACK_ENV}" <<'NODE'
const fs = require("fs");

const [pid, outputPath] = process.argv.slice(2);
const raw = fs.readFileSync(`/proc/${pid}/environ`, "utf8");
const environment = {};

for (const entry of raw.split("\0")) {
  if (!entry) continue;
  const separator = entry.indexOf("=");
  if (separator < 1) continue;
  environment[entry.slice(0, separator)] = entry.slice(separator + 1);
}

fs.writeFileSync(outputPath, `${JSON.stringify(environment)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
NODE
chown writexdeploy:writexdeploy "${ROLLBACK_ENV}"
chmod 0600 "${ROLLBACK_ENV}"

reload_with_env_file() {
  local release="$1"
  sudo -u writexdeploy sh -c \
    "cd '${release}' && exec node --env-file=.env.production '${PM2_BIN}' reload '${APP_NAME}' --update-env"
}

reload_with_saved_env() {
  sudo -u writexdeploy node - "${ROLLBACK_ENV}" "${PM2_BIN}" "${APP_NAME}" <<'NODE'
const fs = require("fs");
const { spawnSync } = require("child_process");

const [environmentPath, pm2Bin, appName] = process.argv.slice(2);
const savedEnvironment = JSON.parse(fs.readFileSync(environmentPath, "utf8"));
const result = spawnSync(
  pm2Bin,
  ["reload", appName, "--update-env"],
  {
    env: { ...process.env, ...savedEnvironment },
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
NODE
}

wait_for_http() {
  local url="$1" attempt
  for attempt in $(seq 1 60); do
    if curl --silent --fail --max-time 10 "${url}" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  printf 'WEBSITE_READINESS_TIMEOUT url=%s\n' "${url}" >&2
  return 1
}

rollback() {
  local status=$?
  trap - ERR
  set +e
  sudo -u writexdeploy ln -sfn "${OLD_RELEASE}" "${CURRENT_LINK}"
  reload_with_saved_env
  wait_for_http http://127.0.0.1:3002/api/health
  rm -f "${ROLLBACK_ENV}"
  printf 'WEBSITE_ACTIVATION=ROLLED_BACK\nOLD_RELEASE=%s\n' "${OLD_RELEASE}"
  exit "${status}"
}
trap rollback ERR

sudo -u writexdeploy ln -sfn "${NEW_RELEASE}" "${CURRENT_LINK}"
reload_with_env_file "${NEW_RELEASE}"

wait_for_http http://127.0.0.1:3002/api/health
wait_for_http http://127.0.0.1:3002/trust-centre

invoice_status="$(curl --silent --show-error --max-time 20 \
  -o /tmp/writex-invoice-production-probe.json \
  -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  --data '{"invoiceNumber":"TEST-NOT-REAL","mobile":"9999999999"}' \
  http://127.0.0.1:3002/api/trust/verify-invoice)"
test "${invoice_status}" = "200"

node <<'NODE'
const fs = require("fs");
const payload = JSON.parse(
  fs.readFileSync("/tmp/writex-invoice-production-probe.json", "utf8"),
);

if (payload.verified !== false || "customer" in payload) {
  process.exit(1);
}
NODE
rm -f /tmp/writex-invoice-production-probe.json

NEW_PID="$(sudo -u writexdeploy pm2 pid "${APP_NAME}" | tail -n1)"
test "${NEW_PID}" -gt 0
test "${NEW_PID}" != "${OLD_PID}"
test "$(readlink -f "${CURRENT_LINK}")" = "${NEW_RELEASE}"
sudo -u writexdeploy pm2 save >/dev/null

rm -f "${ROLLBACK_ENV}"
trap - ERR
printf 'WEBSITE_ACTIVATION=SUCCESS\nOLD_RELEASE=%s\nNEW_RELEASE=%s\nOLD_PID=%s\nNEW_PID=%s\n' \
  "${OLD_RELEASE}" "${NEW_RELEASE}" "${OLD_PID}" "${NEW_PID}"
