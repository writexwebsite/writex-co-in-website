#!/usr/bin/env bash
set -euo pipefail

app_root="/var/www/writex-co-in"
release_root="$app_root/releases"
current_release="$(readlink -f "$app_root/current")"
rollback_release="$release_root/20260808T082638Z-festival-founder-review-v3r2"

failed_releases=(
  "20260808T082638Z-festival-founder-review-v3"
  "20260808T082638Z-festival-founder-review-v3r1"
)

echo "current=$current_release"
echo "rollback=$rollback_release"
df -h "$app_root"

for release_name in "${failed_releases[@]}"; do
  target="$release_root/$release_name"
  resolved="$(realpath -m "$target")"

  [[ "$resolved" == "$release_root/"* ]]
  [[ "$resolved" != "$current_release" ]]
  [[ "$resolved" != "$rollback_release" ]]
  [[ ! -L "$target" ]]

  if [[ -d "$target" ]]; then
    du -sh "$target"
    rm -rf --one-file-system -- "$target"
    echo "removed=$target"
  else
    echo "already_absent=$target"
  fi
done

[[ "$(readlink -f "$app_root/current")" == "$current_release" ]]
curl -fsS "http://127.0.0.1:3002/api/health" >/dev/null
pm2 status writex-co-in
df -h "$app_root"
