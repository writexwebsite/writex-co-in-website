begin;

alter table hiring_assessment_questions
  add column if not exists title text,
  add column if not exists instructions text,
  add column if not exists source_material text,
  add column if not exists answer_type text not null default 'long_text',
  add column if not exists expected_time_minutes integer not null default 15,
  add column if not exists maximum_score numeric(6,2) not null default 100,
  add column if not exists required boolean not null default true,
  add column if not exists randomization_eligible boolean not null default true,
  add column if not exists back_navigation_rule text not null default 'session_default',
  add column if not exists auto_scoring_rule jsonb not null default '{}'::jsonb,
  add column if not exists human_review_required boolean not null default true,
  add column if not exists anti_cheat_sensitivity text not null default 'standard',
  add column if not exists viva_follow_up_required boolean not null default false,
  add column if not exists lifecycle_status text not null default 'published',
  add column if not exists display_order integer not null default 100,
  add column if not exists published_at timestamptz,
  add column if not exists published_by_admin_user_id uuid references admin_users(id) on delete set null;

update hiring_assessment_questions
set title=coalesce(title, left(prompt, 120)),
    lifecycle_status=case
      when archived_at is not null then 'archived'
      when active then 'active'
      else 'published'
    end,
    published_at=coalesce(published_at, created_at)
where title is null
   or lifecycle_status not in ('draft','published','active','disabled','archived');

alter table hiring_assessment_questions
  drop constraint if exists hiring_assessment_questions_answer_type_check,
  add constraint hiring_assessment_questions_answer_type_check check (answer_type in (
    'long_text','short_text','structured_response','editing_task',
    'source_based_response','voice_response','scenario_response','file_interaction'
  )),
  drop constraint if exists hiring_assessment_questions_back_navigation_rule_check,
  add constraint hiring_assessment_questions_back_navigation_rule_check check (back_navigation_rule in (
    'session_default','allowed','locked_after_next'
  )),
  drop constraint if exists hiring_assessment_questions_anti_cheat_sensitivity_check,
  add constraint hiring_assessment_questions_anti_cheat_sensitivity_check check (anti_cheat_sensitivity in (
    'low','standard','high'
  )),
  drop constraint if exists hiring_assessment_questions_lifecycle_status_check,
  add constraint hiring_assessment_questions_lifecycle_status_check check (lifecycle_status in (
    'draft','published','active','disabled','archived'
  )),
  drop constraint if exists hiring_assessment_questions_expected_time_check,
  add constraint hiring_assessment_questions_expected_time_check check (expected_time_minutes between 1 and 240),
  drop constraint if exists hiring_assessment_questions_maximum_score_check,
  add constraint hiring_assessment_questions_maximum_score_check check (maximum_score > 0 and maximum_score <= 1000);

create index if not exists hiring_questions_role_lifecycle_order_idx
  on hiring_assessment_questions(role_key,lifecycle_status,display_order,created_at desc);

create table if not exists hiring_system_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  assessment_session_id uuid references hiring_assessment_sessions(id) on delete set null,
  review_version integer not null,
  system_version text not null,
  rule_version text not null,
  question_set_version text,
  eligibility_outcome text not null,
  assessment_score numeric(6,2),
  integrity_risk text not null,
  recommendation text not null,
  reasoning jsonb not null default '[]'::jsonb,
  attention jsonb not null default '[]'::jsonb,
  confidence text not null,
  calculated_scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique(application_id,review_version),
  check (review_version > 0),
  check (eligibility_outcome in ('pass','review','fail')),
  check (assessment_score is null or assessment_score between 0 and 100),
  check (integrity_risk in ('low','review','high')),
  check (recommendation in ('recommended_accept','recommended_reject','manual_review_required')),
  check (confidence in ('high','medium','low'))
);

create unique index if not exists hiring_system_reviews_current_idx
  on hiring_system_reviews(application_id)
  where superseded_at is null;

create table if not exists hiring_admin_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  system_review_id uuid references hiring_system_reviews(id) on delete set null,
  decision text not null,
  admin_score numeric(6,2),
  structured_notes jsonb not null default '{}'::jsonb,
  notes text,
  recommendation_action text not null,
  override_status text not null,
  override_reason text,
  reviewed_by_admin_user_id uuid not null references admin_users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  superseded_at timestamptz,
  check (decision in ('accept','reject','hold','talent_pool','request_reassessment','request_viva')),
  check (admin_score is null or admin_score between 0 and 100),
  check (recommendation_action in ('confirm','override','independent')),
  check (override_status in ('confirmed','overridden','not_applicable')),
  check ((override_status <> 'overridden') or length(trim(coalesce(override_reason,''))) >= 3)
);

create unique index if not exists hiring_admin_reviews_current_idx
  on hiring_admin_reviews(application_id)
  where superseded_at is null;

create table if not exists hiring_final_decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  admin_review_id uuid not null references hiring_admin_reviews(id) on delete restrict,
  outcome text not null,
  reason text not null,
  decided_by_admin_user_id uuid not null references admin_users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  superseded_at timestamptz,
  check (outcome in ('selected','rejected','talent_pool','hold','offer_released'))
);

create unique index if not exists hiring_final_decisions_current_idx
  on hiring_final_decisions(application_id)
  where superseded_at is null;

insert into hiring_settings(setting_key,setting_value)
values
  ('smart_hiring_rules_v1', '{
    "version":"smart-hiring-rules-v1",
    "eligibilityPassThreshold":70,
    "eligibilityReviewThreshold":55,
    "assessmentAcceptThreshold":75,
    "assessmentRejectThreshold":50,
    "integrityFocusReviewCount":4,
    "integrityPasteReviewCount":1,
    "talentPoolThreshold":60,
    "autoProgressToAdminReview":true,
    "writerVivaRequired":true,
    "salesInterviewRequired":true,
    "finalDecisionRequiresAdmin":true
  }'::jsonb)
on conflict(setting_key) do nothing;

commit;
