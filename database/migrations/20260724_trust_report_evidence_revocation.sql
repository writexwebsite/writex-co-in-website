begin;

alter table trust_suspicious_reports
  add column if not exists evidence_revoked_at timestamptz,
  add column if not exists evidence_revoked_by_admin_id uuid
    references admin_users(id) on delete set null,
  add column if not exists evidence_revocation_reason text;

alter table trust_suspicious_reports
  drop constraint if exists trust_suspicious_reports_evidence_revocation_check;

alter table trust_suspicious_reports
  add constraint trust_suspicious_reports_evidence_revocation_check
  check (
    (evidence_revoked_at is null and evidence_revocation_reason is null) or
    (evidence_revoked_at is not null and
      char_length(trim(evidence_revocation_reason)) between 3 and 240)
  );

commit;
