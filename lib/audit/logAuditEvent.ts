import "server-only";

import type { NextRequest } from "next/server";
import { isDatabaseConfigured, optionalDbQuery } from "@/lib/db";
import { getRequestContext } from "@/lib/security";

type AuditActorType = "admin" | "client" | "employee" | "system" | "integration";

type AuditInput = {
  actorType: AuditActorType;
  actorId?: string | null;
  actorEmail?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
  request?: NextRequest;
};

const sensitiveKeys = new Set([
  "password",
  "otp",
  "accessCode",
  "access_code",
  "access_code_hash",
  "token",
  "apiKey",
  "api_key",
  "authorization",
  "signedUrl",
  "signed_url",
  "secret"
]);

function sanitizeMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value) return null;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveKeys.has(key))
      .map(([key, item]) => [
        key,
        typeof item === "string" && item.length > 500
          ? `${item.slice(0, 500)}...`
          : item
      ])
  );
}

export async function logAuditEvent({
  actorType,
  actorId,
  actorEmail,
  entityType,
  entityId,
  action,
  metadata,
  request
}: AuditInput) {
  if (!isDatabaseConfigured()) return;

  try {
    const context = request ? getRequestContext(request) : null;

    await optionalDbQuery(
      `
        insert into audit_logs (
          actor_type,
          actor_id,
          actor_email,
          entity_type,
          entity_id,
          action,
          metadata,
          ip_address,
          user_agent
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      `,
      [
        actorType,
        actorId ?? null,
        actorEmail ?? null,
        entityType,
        entityId ?? null,
        action,
        JSON.stringify(sanitizeMetadata(metadata)),
        context?.ipAddress ?? null,
        context?.userAgent ?? null
      ]
    );
  } catch {
    // Audit logging must never break the primary user/admin flow.
  }
}
