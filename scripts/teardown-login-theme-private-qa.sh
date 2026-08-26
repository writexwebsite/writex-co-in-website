#!/usr/bin/env bash
set -Eeuo pipefail

QA_DATABASE="writex_co_in_login_theme_qa"
QA_PID_FILE="/tmp/writex-login-theme-qa.pid"

if [[ -f "${QA_PID_FILE}" ]]; then
  QA_PID="$(cat "${QA_PID_FILE}")"
  if [[ "${QA_PID}" =~ ^[0-9]+$ ]] && kill -0 "${QA_PID}" 2>/dev/null; then
    kill "${QA_PID}"
    for _ in {1..20}; do
      if ! kill -0 "${QA_PID}" 2>/dev/null; then
        break
      fi
      sleep 0.25
    done
  fi
fi

sudo -n -u postgres dropdb --if-exists "${QA_DATABASE}"
printf 'private_qa=removed\n'
