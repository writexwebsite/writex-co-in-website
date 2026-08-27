import "server-only";

import { ApiError } from "@/lib/api/response";
import { isDatabaseConfigured, optionalDbQuery } from "@/lib/db";
import { hashValue } from "@/lib/security";

export function clientInputFingerprint(
  invoiceReference: string,
  normalizedMobile: string
) {
  return hashValue(
    `client-login:${invoiceReference.trim().toUpperCase()}:${normalizedMobile}`
  );
}

export async function assertClientAccessEnabled(invoiceReference: string) {
  if (!isDatabaseConfigured()) {
    throw new ApiError(
      503,
      "NOT_CONFIGURED",
      "Client session storage is not configured."
    );
  }

  const result = await optionalDbQuery<{ access_status: string }>(
    `
      select access_status
      from client_access_controls
      where invoice_id = $1
      limit 1
    `,
    [invoiceReference]
  );

  if (result?.rows[0]?.access_status === "disabled") {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Client portal access is unavailable. Please contact WriteX."
    );
  }
}

export async function isClientLoginLocked({
  inputFingerprint,
  ipAddress
}: {
  inputFingerprint: string;
  ipAddress: string;
}) {
  if (!isDatabaseConfigured()) return false;
  const maxAttempts = Number(process.env.CLIENT_LOGIN_MAX_ATTEMPTS || 6);
  const lockMinutes = Number(process.env.CLIENT_LOGIN_LOCK_MINUTES || 15);
  const result = await optionalDbQuery<{ failures: string }>(
    `
      select count(*)::text as failures
      from client_login_attempts
      where succeeded = false
        and created_at > now() - ($3 || ' minutes')::interval
        and (input_fingerprint = $1 or ip_hash = $2)
    `,
    [inputFingerprint, hashValue(ipAddress), lockMinutes]
  );
  return Number(result?.rows[0]?.failures || 0) >= maxAttempts;
}

export async function recordClientLoginAttempt({
  inputFingerprint,
  ipAddress,
  succeeded,
  failureReason,
  correlationId
}: {
  inputFingerprint: string;
  ipAddress: string;
  succeeded: boolean;
  failureReason?: string;
  correlationId: string;
}) {
  await optionalDbQuery(
    `
      insert into client_login_attempts (
        input_fingerprint,
        ip_hash,
        succeeded,
        failure_reason,
        correlation_id
      )
      values ($1, $2, $3, $4, $5)
    `,
    [
      inputFingerprint,
      hashValue(ipAddress),
      succeeded,
      failureReason ?? null,
      correlationId
    ]
  );
}

export async function recordClientPortalAudit({
  actorType,
  actorReference,
  invoiceReference,
  action,
  result,
  correlationId,
  metadata
}: {
  actorType: "client" | "admin" | "system";
  actorReference?: string;
  invoiceReference?: string;
  action: string;
  result: "success" | "denied" | "unavailable" | "failed";
  correlationId: string;
  metadata?: Record<string, unknown>;
}) {
  await optionalDbQuery(
    `
      insert into client_portal_audit (
        actor_type,
        actor_reference,
        invoice_id,
        action,
        result,
        correlation_id,
        metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      actorType,
      actorReference ?? null,
      invoiceReference ?? null,
      action,
      result,
      correlationId,
      JSON.stringify(metadata || {})
    ]
  );
}
