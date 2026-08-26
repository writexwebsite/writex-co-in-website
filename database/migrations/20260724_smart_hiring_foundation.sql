begin;

alter table admin_users drop constraint if exists admin_users_role_check;
alter table admin_users add constraint admin_users_role_check check (role in (
  'super_admin','sales','support','accounts','viewer',
  'hr_admin','hiring_manager','assessor','interviewer','read_only_auditor'
));

create table if not exists hiring_job_roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  public_title text not null,
  summary text not null,
  active boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_key in ('academic_writer', 'sales_executive'))
);

create table if not exists hiring_job_openings (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references hiring_job_roles(id) on delete restrict,
  opening_reference text not null unique,
  work_mode text not null,
  experience_preference text,
  status text not null default 'draft',
  opened_at timestamptz,
  closed_at timestamptz,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft', 'open', 'paused', 'closed', 'archived'))
);

create table if not exists hiring_applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references hiring_candidates(id) on delete cascade,
  opening_id uuid references hiring_job_openings(id) on delete set null,
  application_reference text not null unique,
  role_key text not null,
  current_stage text not null default 'application_received',
  pii_encrypted text not null,
  email_hash text not null,
  mobile_hash text not null,
  city text,
  application_payload jsonb not null default '{}'::jsonb,
  consent_version text not null,
  consented_at timestamptz not null,
  source text not null default 'careers_hub',
  assigned_admin_user_id uuid references admin_users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_key in ('academic_writer', 'sales_executive')),
  check (current_stage in (
    'application_received','eligibility_review','assessment_invited',
    'assessment_started','assessment_submitted','under_review','shortlisted',
    'interview_scheduled','interview_completed','selected','offer_released',
    'joined','talent_pool','rejected','withdrawn','expired'
  ))
);

create table if not exists hiring_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  previous_stage text,
  new_stage text not null,
  changed_by_type text not null,
  changed_by_admin_user_id uuid references admin_users(id) on delete set null,
  reason text not null,
  notes text,
  changed_at timestamptz not null default now(),
  check (changed_by_type in ('system','candidate','admin','provider'))
);

create table if not exists hiring_assessments (
  id uuid primary key default gen_random_uuid(),
  assessment_reference text not null unique,
  role_key text not null,
  title text not null,
  version integer not null default 1,
  duration_minutes integer not null,
  active boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_key in ('academic_writer', 'sales_executive')),
  check (duration_minutes between 10 and 480)
);

create table if not exists hiring_assessment_questions (
  id uuid primary key default gen_random_uuid(),
  stable_question_id text not null,
  version integer not null,
  role_key text not null,
  category text not null,
  section text not null,
  difficulty text not null,
  prompt text not null,
  options jsonb,
  scoring_rubric jsonb not null default '{}'::jsonb,
  expected_competencies text[] not null default '{}',
  variants jsonb not null default '[]'::jsonb,
  protected boolean not null default false,
  active boolean not null default false,
  created_source text not null,
  content_hash text not null,
  change_reason text,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (stable_question_id, version),
  check (role_key in ('academic_writer', 'sales_executive')),
  check (difficulty in ('foundation','intermediate','advanced')),
  check (version > 0)
);

create table if not exists hiring_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  assessment_id uuid not null references hiring_assessments(id) on delete restrict,
  session_reference text not null unique,
  access_token_hash text not null unique,
  delivered_form jsonb not null,
  watermark_reference text not null,
  state text not null default 'invited',
  accommodation jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state in ('invited','started','submitted','expired','revoked'))
);

create table if not exists hiring_assessment_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references hiring_assessment_sessions(id) on delete cascade,
  question_id uuid not null references hiring_assessment_questions(id) on delete restrict,
  question_version integer not null,
  answer_encrypted text not null,
  revision_count integer not null default 0,
  first_saved_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  locked_at timestamptz,
  unique (session_id, question_id)
);

create table if not exists hiring_assessment_integrity_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references hiring_assessment_sessions(id) on delete cascade,
  event_type text not null,
  severity text not null default 'advisory',
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_admin_user_id uuid references admin_users(id) on delete set null,
  review_outcome text,
  check (severity in ('informational','advisory','review_required'))
);

create table if not exists hiring_assessment_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references hiring_assessment_sessions(id) on delete cascade,
  automated_score numeric(5,2),
  human_score numeric(5,2),
  combined_score numeric(5,2),
  score_breakdown jsonb not null default '{}'::jsonb,
  reviewer_notes text,
  recommendation text,
  scored_by_admin_user_id uuid references admin_users(id) on delete set null,
  scored_at timestamptz,
  updated_at timestamptz not null default now(),
  check (automated_score is null or automated_score between 0 and 100),
  check (human_score is null or human_score between 0 and 100),
  check (combined_score is null or combined_score between 0 and 100)
);

create table if not exists hiring_candidate_files (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  file_type text not null,
  s3_key text not null unique,
  safe_file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  malware_scan_status text not null default 'pending',
  access_classification text not null default 'hiring_private',
  retention_review_at timestamptz,
  revoked_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (file_type in (
    'cv','writing_sample','voice_introduction','assessment_source',
    'assessment_response','identity_document','education_document',
    'background_report','interview_document'
  )),
  check (malware_scan_status in ('pending','clean','blocked','failed','not_required'))
);

create table if not exists hiring_candidate_interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  interview_type text not null,
  status text not null default 'scheduled',
  scheduled_at timestamptz,
  interviewer_admin_user_id uuid references admin_users(id) on delete set null,
  structured_notes text,
  recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('scheduled','rescheduled','completed','no_show','cancelled'))
);

create table if not exists hiring_candidate_interview_scores (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references hiring_candidate_interviews(id) on delete cascade,
  competency_key text not null,
  score numeric(5,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (interview_id, competency_key),
  check (score between 0 and 100)
);

create table if not exists hiring_talent_pool (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references hiring_applications(id) on delete cascade,
  category text not null,
  notes text,
  review_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (category in ('ready_now','interview_ready','trainable','freelance_pool','future_hire','hold','rejected'))
);

create table if not exists hiring_candidate_referrals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references hiring_applications(id) on delete cascade,
  referral_code_hash text not null,
  referrer_reference_hash text,
  joined_status text not null default 'not_joined',
  payout_status text not null default 'not_applicable',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hiring_verification_cases (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  verification_type text not null,
  status text not null default 'not_started',
  consent_recorded_at timestamptz,
  assigned_admin_user_id uuid references admin_users(id) on delete set null,
  method text,
  source_reference text,
  discrepancy_count integer not null default 0,
  candidate_clarification_encrypted text,
  final_clearance_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, verification_type),
  check (verification_type in ('identity','aadhaar','education','background','employment','reference'))
);

create table if not exists hiring_verification_decisions (
  id uuid primary key default gen_random_uuid(),
  verification_case_id uuid not null references hiring_verification_cases(id) on delete cascade,
  decision text not null,
  reason text not null,
  evidence_reviewed jsonb not null default '[]'::jsonb,
  notes text not null,
  conditions jsonb not null default '[]'::jsonb,
  review_at timestamptz,
  decided_by_admin_user_id uuid not null references admin_users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  check (decision in (
    'approved_for_hiring','approved_with_conditions','additional_verification',
    'candidate_clarification','return_to_reviewer','unable_to_verify',
    'not_approved_for_hiring','reopened'
  ))
);

create table if not exists hiring_audit_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references hiring_applications(id) on delete set null,
  actor_type text not null,
  actor_reference text,
  action text not null,
  entity_type text not null,
  entity_reference text,
  safe_metadata jsonb not null default '{}'::jsonb,
  correlation_id text,
  created_at timestamptz not null default now(),
  check (actor_type in ('candidate','admin','system','provider'))
);

create table if not exists hiring_notifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references hiring_applications(id) on delete cascade,
  notification_type text not null,
  recipient_hash text not null,
  provider text,
  provider_message_reference text,
  status text not null,
  safe_failure_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists hiring_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_by_admin_user_id uuid references admin_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists hiring_hrms_sync (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references hiring_applications(id) on delete cascade,
  hrms_employee_reference text,
  sync_status text not null default 'not_ready',
  department_mapping text,
  designation_mapping text,
  official_mobile_status text,
  joining_status text,
  last_attempted_at timestamptz,
  last_successful_at timestamptz,
  safe_failure_reason text,
  updated_at timestamptz not null default now(),
  check (sync_status in ('not_ready','ready_for_hrms','sync_pending','synced','sync_failed','manual_review'))
);

create table if not exists hiring_trust_publish_status (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references hiring_applications(id) on delete cascade,
  eligible boolean not null default false,
  approved boolean not null default false,
  publish_status text not null default 'blocked',
  blocked_reasons text[] not null default '{}',
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  check (publish_status in ('blocked','eligible','approved','published','revoked'))
);

create index if not exists hiring_applications_stage_idx
  on hiring_applications(role_key, current_stage, submitted_at desc);
create index if not exists hiring_applications_contact_lookup_idx
  on hiring_applications(email_hash, mobile_hash);
create index if not exists hiring_status_history_application_idx
  on hiring_application_status_history(application_id, changed_at desc);
create index if not exists hiring_assessment_sessions_application_idx
  on hiring_assessment_sessions(application_id, created_at desc);
create index if not exists hiring_integrity_session_idx
  on hiring_assessment_integrity_events(session_id, occurred_at desc);
create index if not exists hiring_files_application_idx
  on hiring_candidate_files(application_id, file_type, created_at desc);
create index if not exists hiring_verification_queue_idx
  on hiring_verification_cases(verification_type, status, updated_at desc);
create index if not exists hiring_audit_application_idx
  on hiring_audit_logs(application_id, created_at desc);

insert into hiring_job_roles (role_key, public_title, summary, active)
values
  ('academic_writer', 'Academic Writer', 'Research-led academic writing, editing and revision support.', false),
  ('sales_executive', 'Sales Executive', 'Consultative lead qualification, trust building and customer communication.', false)
on conflict (role_key) do nothing;

commit;
