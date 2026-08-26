begin;

create table if not exists hiring_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_reference text not null unique,
  application_role text not null,
  department text,
  reporting_line_reference_hash text,
  access_domains text[] not null default '{}',
  application_status text not null default 'applied',
  applied_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    application_status in (
      'applied',
      'assessment',
      'shortlisted',
      'offer_pending',
      'offered',
      'hired',
      'withdrawn',
      'rejected'
    )
  )
);

create table if not exists hiring_candidate_disclosures (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references hiring_candidates(id) on delete cascade,
  knows_applicant_or_employee boolean not null,
  related_person_name_encrypted text,
  relationship_type text,
  related_role text,
  disclosure_details_encrypted text,
  encryption_version text,
  disclosed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    knows_applicant_or_employee = false
    or (
      related_person_name_encrypted is not null
      and relationship_type is not null
      and related_role is not null
      and disclosure_details_encrypted is not null
    )
  )
);

create table if not exists hiring_candidate_identifiers (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references hiring_candidates(id) on delete cascade,
  signal_type text not null,
  value_hash text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (candidate_id, signal_type, value_hash),
  check (
    signal_type in (
      'ip',
      'device_fingerprint',
      'browser_device_profile',
      'address',
      'referral_source',
      'emergency_contact',
      'uploaded_file_metadata',
      'assessment_session_behaviour'
    )
  )
);

create table if not exists hiring_candidate_similarity_artifacts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references hiring_candidates(id) on delete cascade,
  artifact_type text not null,
  exact_hash text not null,
  signature_hashes text[] not null default '{}',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (candidate_id, artifact_type, exact_hash),
  check (
    artifact_type in (
      'assessment_answer',
      'repeated_language',
      'voice_script_pattern'
    )
  )
);

create table if not exists hiring_connected_candidate_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_a_id uuid not null references hiring_candidates(id) on delete cascade,
  candidate_b_id uuid not null references hiring_candidates(id) on delete cascade,
  risk_level text not null,
  risk_score integer not null,
  review_status text not null default 'pending_review',
  decision text,
  requires_human_review boolean not null,
  requires_management_approval boolean not null,
  automatic_rejection boolean not null default false,
  reviewer_notes text,
  reviewed_by_admin_user_id uuid references admin_users(id) on delete set null,
  reviewed_at timestamptz,
  final_offer_approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  final_offer_approved_at timestamptz,
  first_detected_at timestamptz not null default now(),
  last_evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_a_id, candidate_b_id),
  check (candidate_a_id <> candidate_b_id),
  check (risk_level in ('low', 'review', 'high')),
  check (risk_score between 0 and 100),
  check (
    review_status in (
      'pending_review',
      'in_review',
      'approved',
      'declined',
      'false_positive'
    )
  ),
  check (
    decision is null
    or decision in (
      'approved_no_additional_controls',
      'approved_with_controls',
      'declined_after_review',
      'false_positive'
    )
  ),
  check (automatic_rejection = false)
);

create table if not exists hiring_connected_candidate_signals (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references hiring_connected_candidate_reviews(id) on delete cascade,
  signal_type text not null,
  signal_weight integer not null,
  confidence text not null,
  safe_details jsonb not null default '{}'::jsonb,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  unique (review_id, signal_type),
  check (signal_weight between 0 and 100),
  check (confidence in ('low', 'medium', 'high'))
);

create table if not exists hiring_connected_candidate_controls (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references hiring_connected_candidate_reviews(id) on delete cascade,
  separate_assessors boolean not null default false,
  separate_reporting_lines boolean not null default false,
  restricted_cross_system_access boolean not null default false,
  enhanced_probation_monitoring boolean not null default false,
  no_direct_work_allocation_authority boolean not null default false,
  no_shared_approval_chain boolean not null default false,
  post_joining_audit_required boolean not null default false,
  control_notes text,
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hiring_connected_candidate_audit (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references hiring_candidates(id) on delete set null,
  review_id uuid references hiring_connected_candidate_reviews(id) on delete set null,
  actor_type text not null,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  action text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (actor_type in ('candidate', 'system', 'admin')),
  check (
    action in (
      'relationship_disclosure',
      'risk_flag_created',
      'risk_flag_updated',
      'reviewer_decision',
      'override',
      'final_offer_approval',
      'post_joining_restrictions'
    )
  )
);

create index if not exists hiring_candidate_identifier_lookup_idx
  on hiring_candidate_identifiers(signal_type, value_hash);
create index if not exists hiring_similarity_artifact_type_idx
  on hiring_candidate_similarity_artifacts(artifact_type, observed_at desc);
create index if not exists hiring_connected_review_risk_idx
  on hiring_connected_candidate_reviews(risk_level, review_status, updated_at desc);
create index if not exists hiring_connected_review_candidate_a_idx
  on hiring_connected_candidate_reviews(candidate_a_id);
create index if not exists hiring_connected_review_candidate_b_idx
  on hiring_connected_candidate_reviews(candidate_b_id);
create index if not exists hiring_connected_audit_review_idx
  on hiring_connected_candidate_audit(review_id, created_at desc);

drop trigger if exists set_hiring_candidates_updated_at on hiring_candidates;
create trigger set_hiring_candidates_updated_at
before update on hiring_candidates
for each row execute function set_updated_at();

drop trigger if exists set_hiring_candidate_disclosures_updated_at
  on hiring_candidate_disclosures;
create trigger set_hiring_candidate_disclosures_updated_at
before update on hiring_candidate_disclosures
for each row execute function set_updated_at();

drop trigger if exists set_hiring_connected_candidate_reviews_updated_at
  on hiring_connected_candidate_reviews;
create trigger set_hiring_connected_candidate_reviews_updated_at
before update on hiring_connected_candidate_reviews
for each row execute function set_updated_at();

drop trigger if exists set_hiring_connected_candidate_controls_updated_at
  on hiring_connected_candidate_controls;
create trigger set_hiring_connected_candidate_controls_updated_at
before update on hiring_connected_candidate_controls
for each row execute function set_updated_at();

commit;
