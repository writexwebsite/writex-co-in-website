#!/usr/bin/env bash
set -Eeuo pipefail
for url in \
  http://127.0.0.1:3002/api/health \
  https://www.writex.co.in/api/health \
  https://www.writex.co.in/ \
  https://www.writex.co.in/admin/website-experience/festival-assets \
  https://www.writex.co.in/client-login \
  https://www.writex.co.in/employee-login
do
  code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url")"
  printf '%s %s\n' "$code" "$url"
done
