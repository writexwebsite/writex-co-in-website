begin;

alter table hiring_candidate_file_access_audit
  drop constraint if exists hiring_candidate_file_access_audit_action_check;

alter table hiring_candidate_file_access_audit
  add constraint hiring_candidate_file_access_audit_action_check
  check (
    action in (
      'signed_retrieval',
      'previewed',
      'revoked',
      'deleted',
      'metadata_viewed'
    )
  );

commit;
