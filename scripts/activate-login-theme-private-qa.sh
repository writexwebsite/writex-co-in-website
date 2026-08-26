#!/usr/bin/env bash
set -Eeuo pipefail

QA_DATABASE="writex_co_in_login_theme_qa"

sudo -n -u postgres psql "${QA_DATABASE}" -v ON_ERROR_STOP=1 -Atc "
  update holiday_login_theme_settings
  set
    mode = 'holiday',
    state = 'theme_active',
    theme_id = (select id from holiday_themes where slug = 'holi' limit 1),
    enabled = true,
    approval_state = 'approved',
    last_failure_code = null,
    updated_at = now()
  where channel = 'client'
  returning channel || '|' || state || '|' || theme_id;
"
