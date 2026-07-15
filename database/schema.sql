create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'viewer',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update admin_users
set role = 'viewer'
where role not in ('super_admin', 'sales', 'support', 'accounts', 'viewer');

alter table admin_users
  drop constraint if exists admin_users_role_check;

alter table admin_users
  add constraint admin_users_role_check
  check (role in ('super_admin', 'sales', 'support', 'accounts', 'viewer'));

create table if not exists quote_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  whatsapp text not null,
  country text not null,
  service_required text not null,
  academic_level text not null,
  subject text not null,
  word_count integer,
  deadline date,
  instructions text not null,
  document_condition text,
  referencing_style text,
  urgency text,
  rubric_available text,
  draft_available text,
  supervisor_comments_available text,
  file_name text,
  file_size bigint,
  file_type text,
  lead_intelligence jsonb,
  uploaded_file_asset_id uuid,
  source text not null default 'website_quote_form',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table quote_leads
  alter column email drop not null;

alter table quote_leads
  add column if not exists document_condition text,
  add column if not exists referencing_style text,
  add column if not exists urgency text,
  add column if not exists rubric_available text,
  add column if not exists draft_available text,
  add column if not exists supervisor_comments_available text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_type text,
  add column if not exists lead_intelligence jsonb,
  add column if not exists assigned_to_admin_user_id uuid references admin_users(id) on delete set null,
  add column if not exists lead_priority text not null default 'normal',
  add column if not exists lead_quality text not null default 'unqualified',
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists quoted_amount numeric(12, 2),
  add column if not exists quoted_currency text not null default 'INR',
  add column if not exists converted_amount numeric(12, 2),
  add column if not exists converted_currency text not null default 'INR',
  add column if not exists expected_close_date date,
  add column if not exists loss_reason text,
  add column if not exists converted_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists page_path text,
  add column if not exists landing_page text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists device_type text,
  add column if not exists source_channel text;

alter table quote_leads
  add column if not exists phone_raw text,
  add column if not exists phone_normalized text,
  add column if not exists tool_type text,
  add column if not exists template_id text,
  add column if not exists lead_score integer not null default 0,
  add column if not exists phone_confidence text,
  add column if not exists queue text not null default 'General Enquiries',
  add column if not exists next_action_at timestamptz,
  add column if not exists consent_timestamp timestamptz,
  add column if not exists main_support_need text,
  add column if not exists recommended_service text,
  add column if not exists suggested_first_contact_message text,
  add column if not exists download_status text not null default 'not_requested',
  add column if not exists assigned_at timestamptz,
  add column if not exists first_contact_at timestamptz,
  add column if not exists sla_due_at timestamptz,
  add column if not exists sla_breached_at timestamptz,
  add column if not exists reassigned_at timestamptz,
  add column if not exists existing_client boolean not null default false;

update quote_leads set phone_raw = whatsapp where phone_raw is null;
update quote_leads set phone_normalized = whatsapp where phone_normalized is null;

alter table quote_leads
  drop constraint if exists quote_leads_phone_confidence_check,
  drop constraint if exists quote_leads_download_status_check;

alter table quote_leads
  add constraint quote_leads_phone_confidence_check
  check (phone_confidence is null or phone_confidence in ('high', 'medium', 'low', 'suspicious')),
  add constraint quote_leads_download_status_check
  check (download_status in ('not_requested', 'unlocked', 'downloaded', 'failed'));

create table if not exists tool_sessions (
  id uuid primary key default gen_random_uuid(),
  anonymous_session_id text not null,
  tool_type text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  completion_percent integer not null default 0,
  preview_generated_at timestamptz,
  download_requested_at timestamptz,
  lead_id uuid references quote_leads(id) on delete set null,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anonymous_session_id, tool_type)
);

create table if not exists template_downloads (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  lead_id uuid not null references quote_leads(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  source text not null default 'template_library',
  created_at timestamptz not null default now()
);

create table if not exists tool_download_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  lead_id uuid not null references quote_leads(id) on delete cascade,
  tool_type text not null,
  template_id text,
  document_payload jsonb not null,
  expires_at timestamptz not null,
  downloaded_at timestamptz,
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists term_plan_interests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references quote_leads(id) on delete set null,
  name text not null,
  whatsapp text not null,
  country text not null,
  institution text,
  expected_deadlines integer not null,
  term_start date not null,
  term_end date not null,
  support_areas text[] not null default '{}',
  consent_timestamp timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_permissions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references admin_users(id) on delete cascade,
  permission_code text not null,
  created_at timestamptz not null default now(),
  unique (admin_user_id, permission_code)
);

create table if not exists referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_reference text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references referral_codes(id) on delete cascade,
  anonymous_session_id text,
  created_at timestamptz not null default now()
);

create table if not exists referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references referral_codes(id) on delete cascade,
  lead_id uuid references quote_leads(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_conversion_id uuid not null references referral_conversions(id) on delete cascade,
  reward_type text not null default 'account_credit',
  status text not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

update quote_leads
set lead_priority = 'normal'
where lead_priority not in ('low', 'normal', 'high', 'urgent');

update quote_leads
set lead_quality = 'unqualified'
where lead_quality not in ('unqualified', 'low', 'medium', 'high', 'premium', 'spam');

update quote_leads
set quoted_currency = 'INR'
where quoted_currency is null;

update quote_leads
set converted_currency = 'INR'
where converted_currency is null;

update quote_leads
set loss_reason = null
where loss_reason is not null
  and loss_reason not in (
    'price_high',
    'no_response',
    'deadline_missed',
    'irrelevant_request',
    'competitor',
    'not_serviceable',
    'spam',
    'other'
  );

alter table quote_leads
  drop constraint if exists quote_leads_priority_check,
  drop constraint if exists quote_leads_quality_check,
  drop constraint if exists quote_leads_loss_reason_check;

alter table quote_leads
  add constraint quote_leads_priority_check
  check (lead_priority in ('low', 'normal', 'high', 'urgent')),
  add constraint quote_leads_quality_check
  check (lead_quality in ('unqualified', 'low', 'medium', 'high', 'premium', 'spam')),
  add constraint quote_leads_loss_reason_check
  check (
    loss_reason is null or loss_reason in (
      'price_high',
      'no_response',
      'deadline_missed',
      'irrelevant_request',
      'competitor',
      'not_serviceable',
      'spam',
      'other'
    )
  );

alter table quote_leads
  drop constraint if exists quote_leads_status_check;

update quote_leads
set status = 'new'
where status not in ('new', 'contacted', 'quoted', 'converted', 'lost', 'spam');

alter table quote_leads
  add constraint quote_leads_status_check
  check (status in ('new', 'contacted', 'quoted', 'converted', 'lost', 'spam'));

create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  quote_lead_id uuid not null references quote_leads(id) on delete cascade,
  admin_user_id uuid references admin_users(id) on delete set null,
  note text not null,
  visibility text not null default 'internal',
  created_at timestamptz not null default now()
);

alter table lead_notes
  add column if not exists lead_id uuid references quote_leads(id) on delete cascade;

update lead_notes
set lead_id = quote_lead_id
where lead_id is null;

create table if not exists client_sessions (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  whatsapp text not null,
  session_token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  ip_address text,
  user_agent text
);

alter table client_sessions
  add column if not exists access_level text not null default 'full',
  add column if not exists security_mode text not null default 'access_code';

create table if not exists client_portal_credentials (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null unique,
  client_id text,
  whatsapp_normalized text not null,
  access_code_hash text not null,
  is_active boolean not null default true,
  failed_attempt_count integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  code_created_at timestamptz not null default now(),
  code_rotated_at timestamptz,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_portal_credentials_invoice_idx on client_portal_credentials(invoice_id);

create table if not exists employee_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  session_token_hash text not null,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists employee_sessions_token_idx on employee_sessions(session_token_hash);

create table if not exists portal_invoice_cache (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null unique,
  client_name text,
  whatsapp text,
  service_type text,
  subject text,
  deadline date,
  total_amount numeric(12, 2),
  paid_amount numeric(12, 2),
  balance_amount numeric(12, 2),
  currency text,
  payment_status text,
  work_status text,
  raw_lts_payload jsonb,
  raw_pmt_payload jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists file_assets (
  id uuid primary key default gen_random_uuid(),
  invoice_id text,
  quote_lead_id uuid references quote_leads(id) on delete set null,
  asset_type text not null,
  s3_key text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by text not null,
  created_at timestamptz not null default now()
);

update file_assets
set asset_type = case
  when asset_type in ('brief', 'quote-brief') then 'quote_brief'
  when asset_type = 'payment-proof' then 'payment_proof'
  when asset_type = 'final' then 'final_delivery'
  else asset_type
end
where asset_type in ('brief', 'quote-brief', 'payment-proof', 'final');

alter table file_assets
  drop constraint if exists file_assets_asset_type_check;

alter table file_assets
  add constraint file_assets_asset_type_check
  check (
    asset_type in (
      'quote_brief',
      'rubric',
      'draft',
      'sop_prompt',
      'dissertation_chapter',
      'payment_proof',
      'preview',
      'final_delivery',
      'revision_attachment',
      'other'
    )
  );

alter table quote_leads
  drop constraint if exists quote_leads_uploaded_file_asset_id_fkey;

alter table quote_leads
  add constraint quote_leads_uploaded_file_asset_id_fkey
  foreign key (uploaded_file_asset_id)
  references file_assets(id)
  on delete set null;

create table if not exists preview_download_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  client_session_id uuid references client_sessions(id) on delete set null,
  action text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  client_session_id uuid references client_sessions(id) on delete set null,
  event_type text not null,
  amount numeric(12, 2),
  currency text,
  payment_method text,
  payment_reference text,
  payment_date date,
  payment_status text,
  pmt_payment_status text,
  verification_status text,
  local_verification_status text,
  proof_file_asset_id uuid references file_assets(id) on delete set null,
  client_name text,
  whatsapp text,
  notes text,
  admin_notes text,
  source text not null,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payment_events
  add column if not exists client_session_id uuid references client_sessions(id) on delete set null,
  add column if not exists currency text,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_date date,
  add column if not exists pmt_payment_status text,
  add column if not exists verification_status text,
  add column if not exists local_verification_status text,
  add column if not exists proof_file_asset_id uuid references file_assets(id) on delete set null,
  add column if not exists client_name text,
  add column if not exists whatsapp text,
  add column if not exists notes text,
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz not null default now();

update payment_events
set verification_status = 'pending'
where verification_status is null
  and event_type in ('proof_submitted', 'verification_pending');

update payment_events
set local_verification_status = coalesce(local_verification_status, verification_status)
where event_type in ('proof_submitted', 'verification_pending', 'verified_local', 'rejected');

create table if not exists integration_logs (
  id uuid primary key default gen_random_uuid(),
  system text not null,
  endpoint text not null,
  request_id text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id text,
  actor_email text,
  entity_type text not null,
  entity_id text,
  action text not null,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists lead_activity_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references quote_leads(id) on delete cascade,
  admin_user_id uuid references admin_users(id) on delete set null,
  activity_type text not null,
  note text,
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists revision_requests (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  client_session_id uuid references client_sessions(id) on delete set null,
  request_type text not null,
  issue_category text not null,
  related_section text,
  priority text not null default 'normal',
  message text not null,
  file_asset_id uuid references file_assets(id) on delete set null,
  status text not null default 'submitted',
  lts_event_id text,
  internal_note text,
  client_name text,
  whatsapp text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table revision_requests
  drop constraint if exists revision_requests_status_check,
  drop constraint if exists revision_requests_priority_check;

alter table revision_requests
  add constraint revision_requests_status_check
  check (
    status in (
      'submitted',
      'under_review',
      'accepted',
      'needs_clarification',
      'out_of_scope',
      'completed',
      'rejected',
      'closed'
    )
  ),
  add constraint revision_requests_priority_check
  check (priority in ('normal', 'urgent'));

create table if not exists sla_alerts (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  alert_type text not null,
  severity text not null,
  status text not null default 'open',
  assigned_to_admin_user_id uuid references admin_users(id) on delete set null,
  message text not null,
  recommended_action text,
  sla_deadline timestamptz,
  breached_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by_admin_user_id uuid references admin_users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by_admin_user_id uuid references admin_users(id) on delete set null,
  metadata jsonb,
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sla_alerts
  drop constraint if exists sla_alerts_severity_check,
  drop constraint if exists sla_alerts_status_check;

alter table sla_alerts
  add constraint sla_alerts_severity_check
  check (severity in ('ok', 'warning', 'breached', 'critical')),
  add constraint sla_alerts_status_check
  check (status in ('open', 'acknowledged', 'resolved', 'dismissed'));

create index if not exists client_sessions_invoice_idx on client_sessions(invoice_id);
create index if not exists client_sessions_token_idx on client_sessions(session_token_hash);
create index if not exists quote_leads_created_at_idx on quote_leads(created_at desc);
create index if not exists quote_leads_status_idx on quote_leads(status, created_at desc);
create index if not exists quote_leads_assigned_idx on quote_leads(assigned_to_admin_user_id, status, created_at desc);
create index if not exists quote_leads_follow_up_idx on quote_leads(next_follow_up_at, status);
create index if not exists quote_leads_source_channel_idx on quote_leads(source_channel, created_at desc);
create index if not exists quote_leads_tool_idx on quote_leads(tool_type, created_at desc);
create index if not exists quote_leads_queue_idx on quote_leads(queue, status, created_at desc);
create index if not exists quote_leads_sla_due_idx on quote_leads(sla_due_at, status);
create index if not exists tool_sessions_tool_idx on tool_sessions(tool_type, started_at desc);
create index if not exists tool_sessions_lead_idx on tool_sessions(lead_id);
create index if not exists template_downloads_template_idx on template_downloads(template_id, downloaded_at desc);
create index if not exists tool_download_tokens_expiry_idx on tool_download_tokens(expires_at);
create index if not exists term_plan_interests_created_idx on term_plan_interests(created_at desc);
create index if not exists lead_notes_quote_lead_idx on lead_notes(quote_lead_id, created_at desc);
create index if not exists lead_notes_lead_idx on lead_notes(lead_id, created_at desc);
create index if not exists file_assets_invoice_idx on file_assets(invoice_id);
create index if not exists file_assets_quote_lead_idx on file_assets(quote_lead_id);
create index if not exists preview_download_logs_invoice_idx on preview_download_logs(invoice_id, created_at desc);
create index if not exists payment_events_invoice_idx on payment_events(invoice_id, created_at desc);
create index if not exists payment_events_verification_idx on payment_events(verification_status, created_at desc);
create index if not exists payment_events_proof_file_idx on payment_events(proof_file_asset_id);
create index if not exists integration_logs_system_idx on integration_logs(system, created_at desc);
create index if not exists audit_logs_created_at_idx on audit_logs(created_at desc);
create index if not exists audit_logs_entity_idx on audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_action_idx on audit_logs(action, created_at desc);
create index if not exists lead_activity_logs_lead_idx on lead_activity_logs(lead_id, created_at desc);
create index if not exists revision_requests_invoice_idx on revision_requests(invoice_id, created_at desc);
create index if not exists revision_requests_status_idx on revision_requests(status, created_at desc);
create index if not exists sla_alerts_status_idx on sla_alerts(status, severity, created_at desc);
create unique index if not exists sla_alerts_open_unique_idx
  on sla_alerts(entity_type, entity_id, alert_type)
  where status in ('open', 'acknowledged');

drop trigger if exists set_admin_users_updated_at on admin_users;
create trigger set_admin_users_updated_at
before update on admin_users
for each row execute function set_updated_at();

drop trigger if exists set_quote_leads_updated_at on quote_leads;
create trigger set_quote_leads_updated_at
before update on quote_leads
for each row execute function set_updated_at();

drop trigger if exists set_portal_invoice_cache_updated_at on portal_invoice_cache;
create trigger set_portal_invoice_cache_updated_at
before update on portal_invoice_cache
for each row execute function set_updated_at();

drop trigger if exists set_payment_events_updated_at on payment_events;
create trigger set_payment_events_updated_at
before update on payment_events
for each row execute function set_updated_at();

drop trigger if exists set_revision_requests_updated_at on revision_requests;
create trigger set_revision_requests_updated_at
before update on revision_requests
for each row execute function set_updated_at();

drop trigger if exists set_sla_alerts_updated_at on sla_alerts;
create trigger set_sla_alerts_updated_at
before update on sla_alerts
for each row execute function set_updated_at();

drop trigger if exists set_tool_sessions_updated_at on tool_sessions;
create trigger set_tool_sessions_updated_at
before update on tool_sessions
for each row execute function set_updated_at();
