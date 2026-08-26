#!/usr/bin/env bash
set -Eeuo pipefail

QA_DATABASE="writex_co_in_login_theme_qa"

sudo -n -u postgres psql "${QA_DATABASE}" -v ON_ERROR_STOP=1 -Atc "
  select
    channel,
    mode,
    state,
    enabled,
    coalesce(theme_id::text, 'default'),
    approval_state
  from holiday_login_theme_settings
  order by channel;
"

sudo -n -u postgres psql "${QA_DATABASE}" -v ON_ERROR_STOP=1 -Atc "
  select
    slug,
    status,
    is_enabled,
    apply_to_login_screens,
    apply_to_client_login,
    experience_config ->> 'approvalStatus'
  from holiday_themes
  where slug = 'holi';
"
