import "server-only";

import { isClientPortalTestAccessEnabled } from "@/lib/client/test-access-types";
import {
  isDatabaseConfigured,
  optionalDbQuery,
  withDbTransaction
} from "@/lib/db";

const remediationReason = "PUBLIC_TEST_ENTRY_REMOVED";
let lastDisabledEnforcementAt = 0;

export async function enforceDisabledClientPortalTestAccess() {
  if (isClientPortalTestAccessEnabled() || !isDatabaseConfigured()) return;
  if (Date.now() - lastDisabledEnforcementAt < 60_000) return;
  lastDisabledEnforcementAt = Date.now();

  try {
    const readiness = await optionalDbQuery<{ ready: boolean }>(
      `select to_regclass('public.client_portal_test_access') is not null as ready`
    );
    if (!readiness?.rows[0]?.ready) return;

    await withDbTransaction(async (query) => {
      const revoked = await query<{ id: string; test_id: string }>(
        `
          update client_portal_test_access
          set revoked_at = coalesce(revoked_at, now())
          where revoked_at is null
            and expires_at > now()
          returning id, test_id
        `
      );
      for (const access of revoked) {
        await query(
          `
            insert into client_portal_test_access_events (
              test_access_id,
              test_id_hash,
              event_type,
              result,
              metadata
            )
            values ($1, md5($2), 'security_revoked', 'success', $3::jsonb)
          `,
          [access.id, access.test_id, JSON.stringify({ reason: remediationReason })]
        );
      }
      await query(
        `
          update client_sessions
          set
            revoked_at = coalesce(revoked_at, now()),
            revocation_reason = $1
          where test_session = true
            and revoked_at is null
        `,
        [remediationReason]
      );
    });
  } catch {
    // Test sessions remain denied by session lookup even if cleanup is delayed.
    lastDisabledEnforcementAt = 0;
  }
}
