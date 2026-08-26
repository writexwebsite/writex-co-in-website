begin;

create table if not exists hiring_eligibility_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique
    references hiring_applications(id) on delete cascade,
  role_key text not null,
  rules jsonb not null,
  automated_score numeric(5,2) not null,
  system_outcome text not null,
  reviewer_outcome text not null,
  reviewer_notes text not null,
  review_reason text not null,
  reviewed_by_admin_user_id uuid not null
    references admin_users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_key in ('academic_writer', 'sales_executive')),
  check (automated_score between 0 and 100),
  check (system_outcome in ('eligible', 'review')),
  check (reviewer_outcome in ('eligible', 'review'))
);

create index if not exists hiring_eligibility_outcome_idx
  on hiring_eligibility_reviews (reviewer_outcome, reviewed_at desc);

commit;
