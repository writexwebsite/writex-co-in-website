begin;

create table if not exists hiring_access_grants (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references admin_users(id) on delete cascade,
  hiring_role text not null check (hiring_role in ('hr_admin','hiring_manager','assessor','interviewer','read_only_auditor')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  granted_by_admin_user_id uuid not null references admin_users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_by_admin_user_id uuid references admin_users(id) on delete restrict,
  revoked_at timestamptz,
  reason text not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists hiring_access_grants_one_active_idx
  on hiring_access_grants(admin_user_id) where status = 'ACTIVE';
create index if not exists hiring_access_grants_status_idx
  on hiring_access_grants(status, updated_at desc);

create table if not exists hiring_access_audit (
  id uuid primary key default gen_random_uuid(),
  target_admin_user_id uuid not null references admin_users(id) on delete restrict,
  actor_admin_user_id uuid not null references admin_users(id) on delete restrict,
  action text not null check (action in ('GRANTED','ROLE_CHANGED','REVOKED')),
  previous_role text,
  next_role text,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table hiring_candidate_files
  drop constraint if exists hiring_candidate_files_file_type_check;
alter table hiring_candidate_files
  add constraint hiring_candidate_files_file_type_check check (file_type in (
    'cv','writing_sample','voice_introduction','video_introduction',
    'assessment_source','assessment_response','identity_document',
    'education_document','background_report','interview_document'
  ));
alter table hiring_candidate_files
  add column if not exists capture_source text check (capture_source in ('RECORDED','UPLOADED')),
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 600),
  add column if not exists retention_review_at timestamptz;

alter table hiring_candidate_consents
  drop constraint if exists hiring_candidate_consents_consent_type_check;
alter table hiring_candidate_consents
  add constraint hiring_candidate_consents_consent_type_check check (consent_type in (
    'application_processing','assessment_monitoring','candidate_declaration',
    'identity_verification','education_verification','background_verification',
    'talent_pool','hrms_transfer','public_verification','relationship_disclosure',
    'video_introduction'
  ));

create table if not exists hiring_video_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete restrict,
  candidate_file_id uuid not null references hiring_candidate_files(id) on delete restrict,
  reviewer_admin_user_id uuid not null references admin_users(id) on delete restrict,
  clarity text not null check (clarity in ('needs_development','acceptable','strong')),
  role_motivation text not null check (role_motivation in ('needs_development','acceptable','strong')),
  communication_structure text not null check (communication_structure in ('needs_development','acceptable','strong')),
  customer_orientation text not null check (customer_orientation in ('needs_development','acceptable','strong')),
  recommendation text not null check (recommendation in ('continue','hold','decline')),
  notes text not null,
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists hiring_video_reviews_active_idx
  on hiring_video_reviews(application_id) where superseded_at is null;

do $$
declare
  application_role text;
  target_table text;
begin
  select tableowner
  into application_role
  from pg_tables
  where schemaname = 'public'
    and tablename = 'hiring_applications';

  if application_role is null then
    raise exception 'Unable to resolve the Smart Hiring application database role.';
  end if;

  foreach target_table in array array[
    'hiring_access_grants',
    'hiring_access_audit',
    'hiring_video_reviews'
  ]
  loop
    execute format('alter table %I owner to %I', target_table, application_role);
  end loop;
end
$$;

insert into hiring_settings(setting_key, setting_value)
values (
  'sales_video_introduction_v1',
  '{"enabled":true,"targetMinSeconds":60,"targetMaxSeconds":120,"absoluteMaxSeconds":180,"maxBytes":52428800,"retentionDays":365,"prompt":"Please introduce yourself, explain why the Sales Executive role interests you, describe how you would make a new customer comfortable speaking with you, and share one example of how you would handle a hesitant customer."}'::jsonb
)
on conflict (setting_key) do nothing;

commit;
