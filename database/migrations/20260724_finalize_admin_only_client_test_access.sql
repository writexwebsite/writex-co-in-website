begin;

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
  jsonb_build_object('reason', 'PUBLIC_TEST_ENTRY_REMOVED')
from revoked_access;

update client_sessions
set
  revoked_at = coalesce(revoked_at, now()),
  revocation_reason = 'PUBLIC_TEST_ENTRY_REMOVED'
where test_session = true
  and revoked_at is null;

commit;
