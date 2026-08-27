import "server-only";

import bcrypt from "bcryptjs";
import { ApiError, unauthorized } from "@/lib/api/response";
import {
  getClientSessionIdleSeconds,
  getClientSessionMaxAgeSeconds
} from "@/lib/auth";
import {
  generateClientTestId,
  generateClientTestPassword
} from "@/lib/client/test-access-credentials";
import {
  getClientTestAccessStatus,
  getUserAgentCategory,
  isClientPortalTestAccessEnabled,
  isSafeClientTestInvoiceReference,
  normalizeClientTestId,
  normalizeClientTestInvoiceReference,
  type ClientTestAccessAuditEvent,
  type ClientTestAccessRecord,
  type ClientTestAccessSummary,
  type ClientTestProfileReference
} from "@/lib/client/test-access-types";
import {
  dbQuery,
  isDatabaseConfigured,
  optionalDbQuery,
  withDbTransaction
} from "@/lib/db";
import { hashValue, randomToken } from "@/lib/security";

const genericLoginFailure =
  "Unable to verify the temporary test access details.";

type TestAccessRow = {
  id: string;
  test_id: string;
  password_hash: string;
  test_profile_reference: ClientTestProfileReference;
  test_invoice_reference: string;
  expires_at: string;
  single_use: boolean;
  used_at: string | null;
  revoked_at: string | null;
  created_by_admin_id: string;
  created_by_email: string | null;
  created_at: string;
  reason: string;
  last_used_at: string | null;
};

type TestAccessEventRow = {
  id: string;
  event_type: ClientTestAccessAuditEvent["eventType"];
  result: ClientTestAccessAuditEvent["result"];
  user_agent_category: string | null;
  created_at: string;
};

export function assertClientPortalTestAccessEnabled() {
  if (!isClientPortalTestAccessEnabled()) {
    throw new ApiError(404, "NOT_FOUND", "Not found.");
  }
}

function assertTestAccessDatabase() {
  if (!isDatabaseConfigured()) {
    throw new ApiError(
      503,
      "NOT_CONFIGURED",
      "Temporary Client Portal test access storage is not configured."
    );
  }
}

function mapSafeRecord(row: TestAccessRow): ClientTestAccessRecord {
  return {
    id: row.id,
    testId: row.test_id,
    testProfileReference: row.test_profile_reference,
    testInvoiceReference: row.test_invoice_reference,
    expiresAt: row.expires_at,
    singleUse: row.single_use,
    usedAt: row.used_at,
    revokedAt: row.revoked_at,
    createdByAdminId: row.created_by_admin_id,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    reason: row.reason,
    lastUsedAt: row.last_used_at,
    status: getClientTestAccessStatus({
      expiresAt: row.expires_at,
      singleUse: row.single_use,
      usedAt: row.used_at,
      revokedAt: row.revoked_at
    })
  };
}

async function recordTestAccessEvent({
  testAccessId,
  testIdHash,
  eventType,
  result,
  ipHash,
  userAgentCategory,
  metadata
}: {
  testAccessId?: string;
  testIdHash: string;
  eventType:
    | "generated"
    | "login_failed"
    | "login_succeeded"
    | "single_use_consumed"
    | "launched"
    | "revoked"
    | "security_revoked";
  result: "success" | "denied" | "failed";
  ipHash?: string;
  userAgentCategory?: string;
  metadata?: Record<string, unknown>;
}) {
  await optionalDbQuery(
    `
      insert into client_portal_test_access_events (
        test_access_id,
        test_id_hash,
        event_type,
        result,
        ip_hash,
        user_agent_category,
        metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      testAccessId ?? null,
      testIdHash,
      eventType,
      result,
      ipHash ?? null,
      userAgentCategory ?? null,
      JSON.stringify(metadata || {})
    ]
  );
}

export async function listClientPortalTestAccess() {
  assertClientPortalTestAccessEnabled();
  assertTestAccessDatabase();
  const result = await dbQuery<TestAccessRow>(
    `
      select
        access.id,
        access.test_id,
        access.password_hash,
        access.test_profile_reference,
        access.test_invoice_reference,
        access.expires_at,
        access.single_use,
        access.used_at,
        access.revoked_at,
        access.created_by_admin_id,
        admin.email as created_by_email,
        access.created_at,
        access.reason,
        access.last_used_at
      from client_portal_test_access access
      left join admin_users admin on admin.id = access.created_by_admin_id
      order by access.created_at desc
      limit 200
    `
  );
  return result.rows.map(mapSafeRecord);
}

export async function getClientPortalTestAccessSummary(
  records?: ClientTestAccessRecord[]
): Promise<ClientTestAccessSummary> {
  assertClientPortalTestAccessEnabled();
  assertTestAccessDatabase();
  const safeRecords = records ?? (await listClientPortalTestAccess());
  const sessions = await dbQuery<{ active_sessions: string }>(
    `
      select count(*)::text as active_sessions
      from client_sessions
      where test_session = true
        and revoked_at is null
        and expires_at > now()
        and absolute_expires_at > now()
        and idle_expires_at > now()
    `
  );
  return {
    active: safeRecords.filter((record) => record.status === "active").length,
    used: safeRecords.filter((record) => record.status === "used").length,
    expired: safeRecords.filter((record) => record.status === "expired").length,
    revoked: safeRecords.filter((record) => record.status === "revoked").length,
    activeSessions: Number(sessions.rows[0]?.active_sessions || 0)
  };
}

export async function listClientPortalTestAccessAudit(
  testAccessId: string
): Promise<ClientTestAccessAuditEvent[]> {
  assertClientPortalTestAccessEnabled();
  assertTestAccessDatabase();
  const result = await dbQuery<TestAccessEventRow>(
    `
      select id, event_type, result, user_agent_category, created_at
      from client_portal_test_access_events
      where test_access_id = $1
      order by created_at desc
      limit 100
    `,
    [testAccessId]
  );
  return result.rows.map((event) => ({
    id: event.id,
    eventType: event.event_type,
    result: event.result,
    userAgentCategory: event.user_agent_category,
    createdAt: event.created_at
  }));
}

export async function createClientPortalTestAccess({
  testProfileReference,
  testInvoiceReference,
  durationMinutes,
  singleUse,
  reason,
  adminUserId,
  ipAddress,
  userAgent
}: {
  testProfileReference: ClientTestProfileReference;
  testInvoiceReference: string;
  durationMinutes: 15 | 30 | 60;
  singleUse: boolean;
  reason: string;
  adminUserId: string;
  ipAddress: string;
  userAgent: string;
}) {
  assertClientPortalTestAccessEnabled();
  assertTestAccessDatabase();
  const normalizedInvoice =
    normalizeClientTestInvoiceReference(testInvoiceReference);
  if (!isSafeClientTestInvoiceReference(normalizedInvoice)) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Use a sanitized invoice reference beginning with WX-TEST-."
    );
  }

  const unrecoverableSecret = generateClientTestPassword();
  const passwordHash = await bcrypt.hash(unrecoverableSecret, 12);
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  let created: TestAccessRow | null = null;

  for (let attempt = 0; attempt < 4 && !created; attempt += 1) {
    const testId = generateClientTestId();
    try {
      const result = await dbQuery<TestAccessRow>(
        `
          insert into client_portal_test_access (
            test_id,
            password_hash,
            test_profile_reference,
            test_invoice_reference,
            expires_at,
            single_use,
            created_by_admin_id,
            reason
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning
            id,
            test_id,
            password_hash,
            test_profile_reference,
            test_invoice_reference,
            expires_at,
            single_use,
            used_at,
            revoked_at,
            created_by_admin_id,
            null::text as created_by_email,
            created_at,
            reason,
            last_used_at
        `,
        [
          testId,
          passwordHash,
          testProfileReference,
          normalizedInvoice,
          expiresAt.toISOString(),
          singleUse,
          adminUserId,
          reason.trim()
        ]
      );
      created = result.rows[0] || null;
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      if (code !== "23505") throw error;
    }
  }

  if (!created) {
    throw new ApiError(
      500,
      "SERVER_ERROR",
      "Temporary access could not be generated."
    );
  }

  await recordTestAccessEvent({
    testAccessId: created.id,
    testIdHash: hashValue(created.test_id),
    eventType: "generated",
    result: "success",
    ipHash: hashValue(ipAddress),
    userAgentCategory: getUserAgentCategory(userAgent),
    metadata: {
      durationMinutes,
      singleUse,
      testProfileReference
    }
  });

  return {
    record: mapSafeRecord(created)
  };
}

export async function launchClientPortalTestAccess({
  id,
  adminUserId,
  ipAddress,
  userAgent
}: {
  id: string;
  adminUserId: string;
  ipAddress: string;
  userAgent: string;
}) {
  assertClientPortalTestAccessEnabled();
  assertTestAccessDatabase();
  const ipHash = hashValue(ipAddress);
  const userAgentCategory = getUserAgentCategory(userAgent);

  const lookup = await dbQuery<TestAccessRow>(
    `
      select
        access.id,
        access.test_id,
        access.password_hash,
        access.test_profile_reference,
        access.test_invoice_reference,
        access.expires_at,
        access.single_use,
        access.used_at,
        access.revoked_at,
        access.created_by_admin_id,
        admin.email as created_by_email,
        access.created_at,
        access.reason,
        access.last_used_at
      from client_portal_test_access access
      left join admin_users admin on admin.id = access.created_by_admin_id
      where access.id = $1
      limit 1
    `,
    [id]
  );
  const row = lookup.rows[0];

  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Temporary access was not found.");
  }

  const testIdHash = hashValue(normalizeClientTestId(row.test_id));
  const status = getClientTestAccessStatus({
    expiresAt: row.expires_at,
    singleUse: row.single_use,
    usedAt: row.used_at,
    revokedAt: row.revoked_at
  });
  if (status !== "active") {
    await recordTestAccessEvent({
      testAccessId: row.id,
      testIdHash,
      eventType: "launched",
      result: "denied",
      ipHash,
      userAgentCategory,
      metadata: { reason: status, adminUserId }
    });
    throw unauthorized(genericLoginFailure);
  }

  const remainingSeconds = Math.max(
    1,
    Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000)
  );
  const maxAgeSeconds = Math.min(
    remainingSeconds,
    getClientSessionMaxAgeSeconds()
  );
  const idleSeconds = Math.min(
    maxAgeSeconds,
    getClientSessionIdleSeconds()
  );
  const sessionToken = randomToken();
  const sessionTokenHash = hashValue(sessionToken);
  const sessionExpiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const idleExpiresAt = new Date(Date.now() + idleSeconds * 1000);

  const transaction = await withDbTransaction(async (query) => {
    const consumed = await query<{ id: string }>(
      `
        update client_portal_test_access
        set
          used_at = coalesce(used_at, now()),
          last_used_ip_hash = $2,
          last_used_at = now()
        where id = $1
          and revoked_at is null
          and expires_at > now()
          and (single_use = false or used_at is null)
        returning id
      `,
      [row.id, ipHash]
    );
    if (!consumed[0]) throw unauthorized(genericLoginFailure);

    const sessions = await query<{ id: string }>(
      `
        insert into client_sessions (
          invoice_id,
          whatsapp,
          session_token_hash,
          expires_at,
          idle_expires_at,
          absolute_expires_at,
          client_reference,
          client_display_name,
          verified_at,
          ip_address,
          user_agent,
          access_level,
          security_mode,
          test_session,
          test_access_id,
          test_profile_reference
        )
        values (
          $1, 'test-session', $2, $3, $4, $3, $5, 'Test Client', now(),
          $6, $7, 'restricted', 'temporary_test_access', true, $8, $9
        )
        returning id
      `,
      [
        row.test_invoice_reference,
        sessionTokenHash,
        sessionExpiresAt.toISOString(),
        idleExpiresAt.toISOString(),
        `TEST:${row.test_profile_reference}`,
        `sha256:${ipHash}`,
        userAgentCategory,
        row.id,
        row.test_profile_reference
      ]
    );

    await query(
      `
        insert into client_portal_test_access_events (
          test_access_id,
          test_id_hash,
          event_type,
          result,
          ip_hash,
          user_agent_category,
          metadata
        )
        values ($1, $2, 'login_succeeded', 'success', $3, $4, $5::jsonb)
      `,
      [
        row.id,
        testIdHash,
        ipHash,
        userAgentCategory,
        JSON.stringify({ singleUse: row.single_use, adminUserId })
      ]
    );

    await query(
      `
        insert into client_portal_test_access_events (
          test_access_id,
          test_id_hash,
          event_type,
          result,
          ip_hash,
          user_agent_category,
          metadata
        )
        values ($1, $2, 'launched', 'success', $3, $4, $5::jsonb)
      `,
      [
        row.id,
        testIdHash,
        ipHash,
        userAgentCategory,
        JSON.stringify({ adminUserId, sessionId: sessions[0]?.id })
      ]
    );

    if (row.single_use) {
      await query(
        `
          insert into client_portal_test_access_events (
            test_access_id,
            test_id_hash,
            event_type,
            result,
            ip_hash,
            user_agent_category
          )
          values ($1, $2, 'single_use_consumed', 'success', $3, $4)
        `,
        [row.id, testIdHash, ipHash, userAgentCategory]
      );
    }

    return sessions[0]?.id;
  });

  if (!transaction) throw unauthorized(genericLoginFailure);

  return {
    sessionId: transaction,
    sessionToken,
    sessionExpiresAt,
    maxAgeSeconds,
    testProfileReference: row.test_profile_reference,
    testInvoiceReference: row.test_invoice_reference
  };
}

export async function revokeClientPortalTestAccess({
  id,
  adminUserId,
  ipAddress,
  userAgent
}: {
  id: string;
  adminUserId: string;
  ipAddress: string;
  userAgent: string;
}) {
  assertClientPortalTestAccessEnabled();
  assertTestAccessDatabase();
  const ipHash = hashValue(ipAddress);
  const userAgentCategory = getUserAgentCategory(userAgent);

  return withDbTransaction(async (query) => {
    const rows = await query<{ id: string; test_id: string }>(
      `
        update client_portal_test_access
        set revoked_at = coalesce(revoked_at, now())
        where id = $1
        returning id, test_id
      `,
      [id]
    );
    const row = rows[0];
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Temporary access was not found.");
    }

    await query(
      `
        update client_sessions
        set revoked_at = now(), revocation_reason = 'test_access_revoked'
        where test_access_id = $1 and revoked_at is null
      `,
      [id]
    );
    await query(
      `
        insert into client_portal_test_access_events (
          test_access_id,
          test_id_hash,
          event_type,
          result,
          ip_hash,
          user_agent_category,
          metadata
        )
        values ($1, $2, 'revoked', 'success', $3, $4, $5::jsonb)
      `,
      [
        id,
        hashValue(row.test_id),
        ipHash,
        userAgentCategory,
        JSON.stringify({ revokedByAdminId: adminUserId })
      ]
    );

    return true;
  });
}
