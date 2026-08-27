import "server-only";

import { dbQuery, isDatabaseConfigured, optionalDbQuery } from "@/lib/db";
import { normalizeInvoiceId } from "@/lib/client/credentials";
import {
  validateClientStatusOverride,
  type ClientStatusOverrideInput
} from "@/lib/client/status-overrides";

export type ClientPortalOperationsSummary = {
  databaseReady: boolean;
  testAccessDatabaseReady: boolean;
  activeSessions: number;
  failedLogins24h: number;
  rateLimitEvents24h: number;
  disabledClients: number;
  providers: Array<{
    provider: string;
    mode: string;
    status: string;
    lastSuccessAt: string | null;
    checkedAt: string;
  }>;
};

export async function getClientPortalOperationsSummary(): Promise<ClientPortalOperationsSummary> {
  if (!isDatabaseConfigured()) {
    return {
      databaseReady: false,
      testAccessDatabaseReady: false,
      activeSessions: 0,
      failedLogins24h: 0,
      rateLimitEvents24h: 0,
      disabledClients: 0,
      providers: []
    };
  }
  try {
    const [counts, providers] = await Promise.all([
      dbQuery<{
        active_sessions: string;
        failed_logins: string;
        rate_limits: string;
        disabled_clients: string;
        test_access_ready: boolean;
      }>(`
        select
          (select count(*) from client_sessions
            where revoked_at is null and expires_at > now()
              and idle_expires_at > now())::text as active_sessions,
          (select count(*) from client_login_attempts
            where succeeded = false
              and created_at > now() - interval '24 hours')::text as failed_logins,
          (select count(*) from client_portal_audit
            where action = 'rate_limit'
              and created_at > now() - interval '24 hours')::text as rate_limits,
          (select count(*) from client_access_controls
            where access_status = 'disabled')::text as disabled_clients,
          (to_regclass('public.client_portal_test_access') is not null)
            as test_access_ready
      `),
      dbQuery<{
        provider: string;
        mode: string;
        status: string;
        last_success_at: string | null;
        checked_at: string;
      }>(`
        select provider, mode, status, last_success_at, checked_at
        from client_provider_health
        order by provider
      `)
    ]);
    const row = counts.rows[0];
    return {
      databaseReady: true,
      testAccessDatabaseReady: Boolean(row?.test_access_ready),
      activeSessions: Number(row?.active_sessions || 0),
      failedLogins24h: Number(row?.failed_logins || 0),
      rateLimitEvents24h: Number(row?.rate_limits || 0),
      disabledClients: Number(row?.disabled_clients || 0),
      providers: providers.rows.map((provider) => ({
        provider: provider.provider,
        mode: provider.mode,
        status: provider.status,
        lastSuccessAt: provider.last_success_at,
        checkedAt: provider.checked_at
      }))
    };
  } catch {
    return {
      databaseReady: false,
      testAccessDatabaseReady: false,
      activeSessions: 0,
      failedLogins24h: 0,
      rateLimitEvents24h: 0,
      disabledClients: 0,
      providers: []
    };
  }
}

export async function findClientPortalRecord(invoiceReference: string) {
  if (!isDatabaseConfigured()) return null;
  const invoiceId = normalizeInvoiceId(invoiceReference);
  try {
    const [access, sessions, snapshot, override, audit] = await Promise.all([
      optionalDbQuery<{
        access_status: string;
        disabled_reason: string | null;
        updated_at: string;
      }>(
        `select access_status, disabled_reason, updated_at
         from client_access_controls where invoice_id = $1 limit 1`,
        [invoiceId]
      ),
      optionalDbQuery<{
        id: string;
        created_at: string;
        last_seen_at: string | null;
        expires_at: string;
        revoked_at: string | null;
      }>(
        `select id, created_at, last_seen_at, expires_at, revoked_at
         from client_sessions where invoice_id = $1
         order by created_at desc limit 20`,
        [invoiceId]
      ),
      optionalDbQuery<{
        service_type: string | null;
        currency: string | null;
        payment_status: string | null;
        synced_at: string | null;
      }>(
        `select service_type, currency, payment_status, synced_at
         from portal_invoice_cache where invoice_id = $1 limit 1`,
        [invoiceId]
      ),
      optionalDbQuery<{
        mode: string;
        public_stage: string | null;
        approved_public_message: string | null;
        expires_at: string | null;
      }>(
        `select mode, public_stage, approved_public_message, expires_at
         from client_status_overrides
         where invoice_id = $1 and reverted_at is null limit 1`,
        [invoiceId]
      ),
      optionalDbQuery<{
        action: string;
        result: string;
        created_at: string;
      }>(
        `select action, result, created_at
         from client_portal_audit where invoice_id = $1
         order by created_at desc limit 20`,
        [invoiceId]
      )
    ]);
    return {
      invoiceReference: invoiceId,
      access: access?.rows[0] || {
        access_status: "enabled",
        disabled_reason: null,
        updated_at: null
      },
      sessions: sessions?.rows || [],
      billingSnapshot: snapshot?.rows[0] || null,
      statusOverride: override?.rows[0] || null,
      audit: audit?.rows || []
    };
  } catch {
    return null;
  }
}

export async function setClientPortalAccess({
  invoiceReference,
  enabled,
  reason,
  adminUserId
}: {
  invoiceReference: string;
  enabled: boolean;
  reason?: string;
  adminUserId: string;
}) {
  const invoiceId = normalizeInvoiceId(invoiceReference);
  await dbQuery(
    `
      insert into client_access_controls (
        invoice_id, access_status, disabled_reason, disabled_at,
        disabled_by_admin_user_id
      )
      values ($1, $2, $3, case when $2 = 'disabled' then now() else null end, $4)
      on conflict (invoice_id) do update set
        access_status = excluded.access_status,
        disabled_reason = excluded.disabled_reason,
        disabled_at = excluded.disabled_at,
        disabled_by_admin_user_id = excluded.disabled_by_admin_user_id,
        updated_at = now()
    `,
    [invoiceId, enabled ? "enabled" : "disabled", reason || null, adminUserId]
  );
  if (!enabled) {
    await dbQuery(
      `update client_sessions
       set revoked_at = now(), revocation_reason = 'portal_access_disabled'
       where invoice_id = $1 and revoked_at is null`,
      [invoiceId]
    );
  }
}

export async function revokeClientPortalSession(
  sessionId: string,
  reason: string
) {
  await dbQuery(
    `update client_sessions
     set revoked_at = now(), revocation_reason = $2
     where id = $1 and revoked_at is null`,
    [sessionId, reason]
  );
}

export async function saveClientStatusOverride({
  invoiceReference,
  input,
  adminUserId
}: {
  invoiceReference: string;
  input: ClientStatusOverrideInput;
  adminUserId: string;
}) {
  const invoiceId = normalizeInvoiceId(invoiceReference);
  const facts = await optionalDbQuery<{
    approved_deliverable: boolean;
    work_complete: boolean;
  }>(
    `
      select
        coalesce((safe_details->>'approvedDeliverableAvailable')::boolean, false)
          as approved_deliverable,
        coalesce((safe_details->>'workComplete')::boolean, false)
          as work_complete
      from client_provider_health
      where provider = 'pmt_project'
      limit 1
    `
  );
  const validation = validateClientStatusOverride(input, {
    approvedDeliverableAvailable:
      facts?.rows[0]?.approved_deliverable === true,
    workComplete: facts?.rows[0]?.work_complete === true
  });
  if (!validation.valid) return validation;

  await dbQuery(
    `update client_status_overrides
     set reverted_at = now()
     where invoice_id = $1 and reverted_at is null`,
    [invoiceId]
  );

  if (validation.value.mode !== "automatic") {
    await dbQuery(
      `
        insert into client_status_overrides (
          invoice_id, mode, public_stage, approved_public_message,
          public_deadline, override_reason, expires_at,
          created_by_admin_user_id
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        invoiceId,
        validation.value.mode,
        validation.value.publicStage,
        validation.value.approvedPublicMessage,
        validation.value.publicDeadline,
        validation.value.overrideReason,
        validation.value.expiresAt,
        adminUserId
      ]
    );
  }

  return validation;
}
