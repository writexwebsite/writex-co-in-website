begin;

alter table holiday_login_theme_settings
  add column if not exists composition_config jsonb not null default '{
    "version": 1,
    "applyMode": "hero_themed_form",
    "appearanceMode": "system",
    "hero": {
      "embeddedUiState": "needs_review",
      "safeCropApproved": true,
      "focalX": 25,
      "focalY": 50,
      "zoom": 1.9,
      "mobileMode": "form_first",
      "lightOverlayOpacity": 0.04,
      "darkOverlayOpacity": 0.34
    },
    "formSkin": {
      "mode": "extracted_theme",
      "cardOpacity": 0.9,
      "blurPx": 24,
      "borderWidthPx": 1,
      "radiusPx": 28,
      "glowStrength": 0.18,
      "light": {
        "cardBackground": "#ffffff",
        "headingColor": "#111d62",
        "bodyColor": "#4d5b89",
        "inputBackground": "#ffffff",
        "inputBorder": "#d8d7ef",
        "focusRing": "#6d28d9",
        "ctaStart": "#6d28d9",
        "ctaEnd": "#e83874"
      },
      "dark": {
        "cardBackground": "#111632",
        "headingColor": "#f7f8ff",
        "bodyColor": "#c4cae5",
        "inputBackground": "#080b20",
        "inputBorder": "#353b68",
        "focusRing": "#a78bfa",
        "ctaStart": "#7c3aed",
        "ctaEnd": "#f43f7d"
      }
    },
    "background": {
      "enabled": true,
      "intensity": 0.22,
      "texture": "festival_ambience"
    }
  }'::jsonb,
  add column if not exists version_number integer not null default 1,
  add column if not exists approval_state text not null default 'approved',
  add column if not exists previous_approved_config jsonb,
  add column if not exists last_validated_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references admin_users(id) on delete set null;

alter table holiday_login_theme_settings
  drop constraint if exists holiday_login_theme_settings_approval_state_check;
alter table holiday_login_theme_settings
  add constraint holiday_login_theme_settings_approval_state_check
  check (approval_state in ('draft', 'validated', 'approved'));

create table if not exists holiday_login_theme_versions (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  theme_id uuid references holiday_themes(id) on delete set null,
  version_number integer not null,
  composition_config jsonb not null,
  version_state text not null default 'draft',
  changed_by uuid references admin_users(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now(),
  check (channel in ('client', 'employee', 'admin')),
  check (version_state in ('draft', 'validated', 'approved', 'active', 'archived', 'restored')),
  unique (channel, version_number)
);

create index if not exists holiday_login_theme_versions_recent_idx
  on holiday_login_theme_versions (channel, version_number desc);

insert into holiday_login_theme_versions (
  channel,
  theme_id,
  version_number,
  composition_config,
  version_state,
  changed_by,
  change_reason
)
select
  control.channel,
  control.theme_id,
  control.version_number,
  control.composition_config,
  case when control.state = 'theme_active' then 'active' else 'approved' end,
  control.last_changed_by,
  'login_theme_composer_migration'
from holiday_login_theme_settings control
where not exists (
  select 1
  from holiday_login_theme_versions existing
  where existing.channel = control.channel
    and existing.version_number = control.version_number
);

insert into holiday_theme_audit (
  theme_id,
  actor_type,
  action,
  affected_scope,
  safe_metadata
)
select
  control.theme_id,
  'system',
  'login_theme_composer_migrated',
  control.channel || '_login',
  jsonb_build_object(
    'version', control.version_number,
    'singleRealForm', true,
    'safeHeroRail', true,
    'mobileMode', 'form_first'
  )
from holiday_login_theme_settings control
where not exists (
  select 1
  from holiday_theme_audit audit
  where audit.action = 'login_theme_composer_migrated'
    and audit.affected_scope = control.channel || '_login'
);

commit;
