begin;

alter table client_portal_test_access_events
  drop constraint if exists client_portal_test_access_events_event_type_check;

alter table client_portal_test_access_events
  add constraint client_portal_test_access_events_event_type_check
  check (
    event_type in (
      'generated',
      'login_failed',
      'login_succeeded',
      'single_use_consumed',
      'launched',
      'revoked',
      'security_revoked'
    )
  );

with revoked_access as (
  update client_portal_test_access
  set revoked_at = coalesce(revoked_at, now())
  where revoked_at is null
    and expires_at > now()
  returning id, test_id
)
insert into client_portal_test_access_events (
  test_access_id,
  test_id_hash,
  event_type,
  result,
  metadata
)
select
  id,
  md5(test_id),
  'security_revoked',
  'success',
  jsonb_build_object(
    'reason',
    'security_remediation_public_client_login_test_access_removed'
  )
from revoked_access;

update client_sessions
set
  revoked_at = coalesce(revoked_at, now()),
  revocation_reason = 'security_remediation_public_client_login_test_access_removed'
where test_session = true
  and revoked_at is null;

commit;
