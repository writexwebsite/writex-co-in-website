#!/usr/bin/env bash
set -Eeuo pipefail

phase="${1:?QA phase is required.}"
root="/var/www/writex-co-in"
env_file="$root/shared/.env.production"

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

if [[ "$DATABASE_URL" == *"?"* ]]; then
  database_base="${DATABASE_URL%%\?*}"
  database_query="?${DATABASE_URL#*\?}"
else
  database_base="$DATABASE_URL"
  database_query=""
fi
export DATABASE_URL="${database_base%/*}/writex_co_in_login_theme_qa${database_query}"

cd "$root/current"
NODE_OPTIONS="--conditions=react-server" \
  pnpm exec tsx scripts/qa-login-theme-composer-actions.ts "$phase"
