#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/var/www/writex-co-in"
RELEASE_ROOT="$APP_ROOT/current"
ENV_FILE="$APP_ROOT/shared/.env.production"
SOURCE_ASSET_ID="9c5ab5a0-573a-4f5b-b816-6a4467a73630"
MASTER_FILE="/tmp/holi-uploaded-master-7680w.webp"
OUT_FILE="/tmp/promote-login-hero-8k.out"
ERR_FILE="/tmp/promote-login-hero-8k.err"

test -f "$MASTER_FILE"
test -f "$RELEASE_ROOT/scripts/promote-login-hero-8k-version.ts"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

cd "$RELEASE_ROOT"
set +e
NODE_OPTIONS="--conditions=react-server" \
  pnpm exec tsx scripts/promote-login-hero-8k-version.ts \
  "$SOURCE_ASSET_ID" \
  "$MASTER_FILE" \
  >"$OUT_FILE" 2>"$ERR_FILE"
status=$?
set -e

printf 'exit=%s\n' "$status"
printf 'stdout_bytes=%s\n' "$(wc -c <"$OUT_FILE")"
printf 'stderr_bytes=%s\n' "$(wc -c <"$ERR_FILE")"
printf '%s\n' '--- stdout tail ---'
tail -n 5 "$OUT_FILE"
printf '%s\n' '--- stderr tail ---'
tail -n 20 "$ERR_FILE"

exit "$status"
