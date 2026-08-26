begin;

create extension if not exists pgcrypto;

alter table hiring_applications
  add column if not exists duplicate_of_application_id uuid references hiring_applications(id) on delete set null,
  add column if not exists override_reason text,
  add column if not exists override_expires_at timestamptz,
  add column if not exists submission_key_hash text,
  add column if not exists retention_state text not null default 'active_candidate',
  add column if not exists retention_review_at timestamptz,
  add column if not exists legal_hold boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table hiring_assessment_sessions
  add column if not exists back_navigation_allowed boolean not null default false,
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text,
  add column if not exists last_reconnected_at timestamptz,
  add column if not exists current_question_index integer not null default 0;

alter table hiring_candidate_interviews
  add column if not exists meeting_reference text,
  add column if not exists duration_minutes integer not null default 30,
  add column if not exists candidate_timezone text not null default 'Asia/Kolkata',
  add column if not exists reschedule_reason text,
  add column if not exists cancel_reason text,
  add column if not exists no_show_notes text,
  add column if not exists completed_at timestamptz;

alter table hiring_talent_pool
  add column if not exists skill_tags text[] not null default '{}',
  add column if not exists role_tags text[] not null default '{}',
  add column if not exists availability text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists added_by_admin_user_id uuid references admin_users(id) on delete set null,
  add column if not exists removed_at timestamptz,
  add column if not exists removal_reason text;

alter table hiring_candidate_referrals
  add column if not exists referral_source text not null default 'candidate_declared',
  add column if not exists retention_status text not null default 'not_applicable',
  add column if not exists conflict_status text not null default 'clear',
  add column if not exists safe_notes text;

create table if not exists hiring_application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  note_encrypted text not null,
  visibility text not null default 'hiring_team',
  created_by_admin_user_id uuid not null references admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check (visibility in ('hiring_team','management','verification_team'))
);

create table if not exists hiring_eligibility_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references hiring_applications(id) on delete cascade,
  role_key text not null,
  rules jsonb not null,
  automated_score numeric(5,2) not null,
  system_outcome text not null,
  reviewer_outcome text not null,
  reviewer_notes text not null,
  review_reason text not null,
  reviewed_by_admin_user_id uuid not null references admin_users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_key in ('academic_writer','sales_executive')),
  check (automated_score between 0 and 100),
  check (system_outcome in ('eligible','review')),
  check (reviewer_outcome in ('eligible','review'))
);

create table if not exists hiring_candidate_consents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references hiring_applications(id) on delete cascade,
  consent_type text not null,
  policy_version text not null,
  granted boolean not null,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  withdrawal_limitations_acknowledged boolean not null default false,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, consent_type, policy_version),
  check (consent_type in ('application_processing','assessment_monitoring','candidate_declaration','identity_verification','education_verification','background_verification','talent_pool','hrms_transfer','public_verification'))
);

create table if not exists hiring_question_bank_source_packs (
  id uuid primary key default gen_random_uuid(),
  source_pack_reference text not null unique,
  title text not null,
  description text not null,
  role_key text not null,
  protected boolean not null default false,
  active boolean not null default true,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_key in ('academic_writer','sales_executive'))
);

create table if not exists hiring_question_bank_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references hiring_assessment_questions(id) on delete restrict,
  source_pack_id uuid references hiring_question_bank_source_packs(id) on delete set null,
  stable_question_id text not null,
  version integer not null,
  immutable_content_hash text not null,
  rubric_version text not null default 'v1',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (stable_question_id, version),
  unique (question_id)
);

create table if not exists hiring_verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_case_id uuid not null references hiring_verification_cases(id) on delete cascade,
  candidate_file_id uuid not null references hiring_candidate_files(id) on delete restrict,
  document_kind text not null,
  claimed_institution text,
  claimed_programme text,
  claimed_year text,
  claimed_registration_reference_encrypted text,
  masking_status text not null default 'required',
  visual_review_status text not null default 'pending',
  digital_credential_status text not null default 'not_available',
  institution_confirmation_status text not null default 'not_requested',
  retention_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (masking_status in ('required','masked','not_required')),
  check (visual_review_status in ('pending','reviewed','discrepancy','unable_to_verify')),
  check (digital_credential_status in ('not_available','pending','verified','failed','unavailable')),
  check (institution_confirmation_status in ('not_requested','pending','confirmed','discrepancy','unavailable'))
);

create table if not exists hiring_candidate_file_access_audit (
  id uuid primary key default gen_random_uuid(),
  candidate_file_id uuid not null references hiring_candidate_files(id) on delete cascade,
  admin_user_id uuid not null references admin_users(id) on delete restrict,
  action text not null,
  reason text not null,
  correlation_id text,
  created_at timestamptz not null default now(),
  check (action in ('signed_retrieval','revoked','deleted','metadata_viewed'))
);

create table if not exists hiring_retention_queue (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references hiring_applications(id) on delete cascade,
  retention_category text not null,
  review_due_at timestamptz not null,
  deletion_requested_at timestamptz,
  legal_hold boolean not null default false,
  status text not null default 'scheduled',
  completed_at timestamptz,
  completed_by_admin_user_id uuid references admin_users(id) on delete set null,
  safe_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (retention_category in ('active_candidate','selected','joined','rejected','withdrawn','expired','talent_pool','legal_hold','deletion_requested')),
  check (status in ('scheduled','review_due','deletion_pending','blocked_by_legal_hold','completed','cancelled'))
);

create index if not exists hiring_application_notes_idx on hiring_application_notes(application_id, created_at desc);
create index if not exists hiring_eligibility_outcome_idx on hiring_eligibility_reviews(reviewer_outcome, reviewed_at desc);
create unique index if not exists hiring_application_submission_key_idx on hiring_applications(submission_key_hash) where submission_key_hash is not null;
create index if not exists hiring_consents_application_idx on hiring_candidate_consents(application_id, consent_type, updated_at desc);
create index if not exists hiring_interviews_schedule_idx on hiring_candidate_interviews(status, scheduled_at);
create index if not exists hiring_talent_pool_review_idx on hiring_talent_pool(active, review_at);
create index if not exists hiring_verification_documents_case_idx on hiring_verification_documents(verification_case_id, created_at desc);
create index if not exists hiring_file_access_audit_idx on hiring_candidate_file_access_audit(candidate_file_id, created_at desc);
create index if not exists hiring_retention_due_idx on hiring_retention_queue(status, review_due_at);

insert into hiring_job_openings (role_id, opening_reference, work_mode, experience_preference, status, opened_at)
select id, 'WX-OPEN-WRITER-2026', 'Remote', 'Evidence-led academic writing and editing experience preferred.', 'open', now()
from hiring_job_roles where role_key='academic_writer'
on conflict (opening_reference) do update set status='open', opened_at=coalesce(hiring_job_openings.opened_at,excluded.opened_at);

insert into hiring_job_openings (role_id, opening_reference, work_mode, experience_preference, status, opened_at)
select id, 'WX-OPEN-SALES-2026', 'Office or approved hybrid', 'Consultative customer communication experience preferred.', 'open', now()
from hiring_job_roles where role_key='sales_executive'
on conflict (opening_reference) do update set status='open', opened_at=coalesce(hiring_job_openings.opened_at,excluded.opened_at);

update hiring_job_roles set active=true, updated_at=now() where role_key in ('academic_writer','sales_executive');

insert into hiring_question_bank_source_packs (source_pack_reference,title,description,role_key,protected,active)
values
  ('WX-BASE-WRITER-V1','Academic Writer Base Pack','Protected foundation questions and rubrics for the Academic Writer assessment.','academic_writer',true,true),
  ('WX-BASE-SALES-V1','Sales Executive Base Pack','Protected foundation questions and rubrics for the Sales Executive assessment.','sales_executive',true,true)
on conflict (source_pack_reference) do nothing;

with seed(stable_id,role_key,category,section,difficulty,prompt,rubric,competencies,variants) as (
  values
  ('WXQ-WR-SOURCE-001','academic_writer','source_comprehension','written','intermediate','Read the released source extract. Identify its central claim, two supporting points, and one limitation without introducing facts that are not present in the source.', '{"accuracy":40,"evidenceUse":30,"limitations":20,"clarity":10}'::jsonb, array['source comprehension','evidence discipline','critical reading'], '["Use the candidate-specific source extract supplied in the assessment."]'::jsonb),
  ('WXQ-WR-ARGUMENT-001','academic_writer','argument_development','written','advanced','Develop a concise, defensible argument from the released evidence. State the position, connect each reason to evidence, address a plausible counterpoint, and end with a proportionate conclusion.', '{"thesis":20,"reasoning":35,"evidenceUse":25,"counterargument":10,"clarity":10}'::jsonb, array['argument development','reasoning','structure'], '["The evidence bundle and topic variables are candidate-specific."]'::jsonb),
  ('WXQ-WR-EDIT-001','academic_writer','editing','editing','intermediate','Edit the released paragraph for clarity, logical flow, academic tone, grammar, and concision. Preserve the original meaning and provide a brief change rationale.', '{"meaningPreserved":25,"clarity":25,"grammar":20,"flow":20,"rationale":10}'::jsonb, array['editing','academic tone','revision judgement'], '[]'::jsonb),
  ('WXQ-WR-GRAMMAR-001','academic_writer','grammar','editing','foundation','Correct the released sentences and explain the three most important grammar or punctuation decisions in plain language.', '{"accuracy":60,"explanation":25,"clarity":15}'::jsonb, array['grammar','punctuation','explanation'], '[]'::jsonb),
  ('WXQ-WR-REF-001','academic_writer','referencing','written','intermediate','Using the citation details released with this question, produce the required in-text citation and reference-list entry, then identify any missing bibliographic information.', '{"formatAccuracy":45,"consistency":25,"missingData":20,"clarity":10}'::jsonb, array['referencing','source integrity'], '["The required referencing style is assigned per assessment."]'::jsonb),
  ('WXQ-WR-RESEARCH-001','academic_writer','research_reasoning','written','advanced','Propose a focused research approach for the released brief. Define the research question, evidence-selection criteria, likely limitations, and a safe method for handling conflicting sources.', '{"researchQuestion":20,"method":30,"sourceCriteria":25,"limitations":15,"ethics":10}'::jsonb, array['research design','source evaluation','limitations'], '[]'::jsonb),
  ('WXQ-WR-REVISION-001','academic_writer','revision','written','intermediate','A reviewer says the draft is descriptive rather than analytical. Explain the revision plan and rewrite the released excerpt to demonstrate analysis rather than summary.', '{"diagnosis":25,"revisionPlan":25,"analysis":35,"clarity":15}'::jsonb, array['revision','analysis','feedback response'], '[]'::jsonb),
  ('WXQ-WR-SUBJECT-001','academic_writer','subject_variant','written','advanced','Respond to the candidate-specific subject prompt using only the released evidence and clearly label any assumption that cannot be verified from that evidence.', '{"subjectReasoning":35,"evidenceDiscipline":30,"assumptions":20,"clarity":15}'::jsonb, array['subject reasoning','evidence discipline'], '["Business","Management","Healthcare","Social Sciences","Computing"]'::jsonb),
  ('WXQ-WR-VIVA-001','academic_writer','viva','viva','advanced','Explain one substantive choice made in your written assessment, the evidence behind it, and what you would change if a key source were shown to be unreliable.', '{"ownership":30,"reasoning":35,"adaptability":25,"communication":10}'::jsonb, array['authorship confidence','oral reasoning','adaptability'], '[]'::jsonb),
  ('WXQ-SA-QUALIFY-001','sales_executive','lead_qualification','written','intermediate','Review the released enquiry and identify the minimum questions needed to clarify scope, deadline, academic level, available files, and the appropriate next step.', '{"discovery":35,"prioritisation":25,"safety":20,"clarity":20}'::jsonb, array['lead qualification','scope discovery','customer safety'], '[]'::jsonb),
  ('WXQ-SA-DISCOVERY-001','sales_executive','discovery','written','intermediate','Write a concise discovery conversation for the released customer scenario. Establish the need without promising an unsupported price, outcome, or deadline.', '{"rapport":20,"questions":30,"accuracy":25,"nextStep":15,"tone":10}'::jsonb, array['consultative discovery','expectation setting'], '[]'::jsonb),
  ('WXQ-SA-PRICE-001','sales_executive','price_objection','written','intermediate','Respond to a customer who says the quote is too high. Explain scope-based pricing, preserve trust, and offer a legitimate next step without inventing a discount.', '{"empathy":20,"valueExplanation":30,"accuracy":25,"nextStep":15,"ethics":10}'::jsonb, array['objection handling','value communication','ethical sales'], '[]'::jsonb),
  ('WXQ-SA-TRUST-001','sales_executive','trust_objection','written','advanced','A prospect is worried about impersonation and payment safety. Explain how to verify a representative and invoice through the WriteX Trust Centre without requesting sensitive information.', '{"safety":40,"trust":25,"accuracy":20,"clarity":15}'::jsonb, array['trust building','payment safety','privacy'], '[]'::jsonb),
  ('WXQ-SA-FOLLOWUP-001','sales_executive','follow_up','written','foundation','Write a respectful follow-up after a prospect has not replied for two days. Keep it useful, brief, and free from pressure or false urgency.', '{"tone":30,"relevance":25,"brevity":20,"nextStep":15,"ethics":10}'::jsonb, array['follow-up','written communication'], '[]'::jsonb),
  ('WXQ-SA-CLOSE-001','sales_executive','closing','written','advanced','For the released qualified enquiry, propose a clear close that confirms scope-review steps, avoids unsupported guarantees, and records the customer decision accurately.', '{"clarity":25,"accuracy":30,"customerChoice":20,"process":15,"ethics":10}'::jsonb, array['closing','expectation management','record quality'], '[]'::jsonb),
  ('WXQ-SA-COMPLAINT-001','sales_executive','complaint_handling','written','advanced','A customer says the promised update was missed. Draft the first response, identify what must be checked internally, and state what must not be promised before verification.', '{"empathy":25,"ownership":20,"verification":25,"safeCommitment":20,"tone":10}'::jsonb, array['complaint handling','escalation','safe commitments'], '[]'::jsonb),
  ('WXQ-SA-ETHICS-001','sales_executive','ethical_sales','written','intermediate','A customer asks you to guarantee a grade and pay a personal UPI ID. Explain the correct response and escalation path.', '{"refusal":30,"paymentSafety":30,"escalation":25,"clarity":15}'::jsonb, array['ethical sales','payment protection','escalation'], '[]'::jsonb),
  ('WXQ-SA-VOICE-001','sales_executive','voice_pitch','voice','intermediate','Record a sixty-to-ninety-second introduction for the released enquiry. Explain how WriteX reviews requirements and identify the next safe action.', '{"clarity":25,"confidence":20,"accuracy":25,"structure":20,"tone":10}'::jsonb, array['voice communication','process explanation','trust'], '[]'::jsonb),
  ('WXQ-SA-VIVA-001','sales_executive','viva','viva','advanced','Defend one decision from your sales assessment and explain how you would respond if new information changed the customer scope or risk level.', '{"ownership":30,"reasoning":30,"adaptability":25,"communication":15}'::jsonb, array['decision ownership','oral reasoning','adaptability'], '[]'::jsonb)
)
insert into hiring_assessment_questions (
  stable_question_id,version,role_key,category,section,difficulty,prompt,
  scoring_rubric,expected_competencies,variants,protected,active,created_source,
  content_hash,change_reason
)
select stable_id,1,role_key,category,section,difficulty,prompt,rubric,competencies,variants,
       true,true,'protected_base_seed',encode(digest(convert_to(prompt,'UTF8'),'sha256'),'hex'),
       'Initial protected production base question'
from seed
on conflict (stable_question_id,version) do nothing;

insert into hiring_question_bank_versions (
  question_id,source_pack_id,stable_question_id,version,immutable_content_hash,rubric_version,published_at
)
select q.id,p.id,q.stable_question_id,q.version,q.content_hash,'v1',now()
from hiring_assessment_questions q
join hiring_question_bank_source_packs p
  on p.role_key=q.role_key and p.protected=true
where q.protected=true and q.version=1
on conflict (stable_question_id,version) do nothing;

insert into hiring_assessments (assessment_reference,role_key,title,version,duration_minutes,active,configuration)
values
  ('WX-ASSESS-WRITER-V1','academic_writer','Academic Writer Assessment',1,90,true,'{"questionCount":8,"backNavigation":false,"humanReviewRequired":true,"weights":{"written":70,"viva":30}}'::jsonb),
  ('WX-ASSESS-SALES-V1','sales_executive','Sales Executive Assessment',1,75,true,'{"questionCount":8,"backNavigation":false,"humanReviewRequired":true,"weights":{"written":55,"voice":20,"viva":25}}'::jsonb)
on conflict (assessment_reference) do nothing;

insert into hiring_settings(setting_key,setting_value)
values
  ('privacy_retention','{"active_candidate_days":180,"selected_days":365,"joined_days":90,"rejected_days":180,"withdrawn_days":90,"expired_days":90,"talent_pool_days":365,"legal_review_required":true}'::jsonb),
  ('assessment_security','{"copy_warning_threshold":3,"focus_warning_threshold":4,"large_insertion_threshold":500,"human_review_required":true,"screenshot_prevention_claimed":false}'::jsonb),
  ('provider_status','{"hrms":"unavailable","aadhaar":"unavailable","background":"manual_review","malware":"unavailable","trust_publishing":"disabled"}'::jsonb)
on conflict (setting_key) do nothing;

commit;
