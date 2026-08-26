import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { dbQuery, withDbTransaction } from "@/lib/db";
import type { AxoRequestActor } from "@/lib/axo/control-auth";

type StoredResponse = { status: number; body: unknown };

export function axoRequestHash(input: { method: string; path: string; body: unknown }) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function beginAxoIdempotency(input: {
  actor: AxoRequestActor;
  operationId: string;
  key: string;
  requestHash: string;
}) {
  const inserted = await dbQuery<{ id: string }>(
    `insert into axo_api_idempotency
       (service_name, operation_id, actor_subject, idempotency_key, request_hash, state, expires_at)
     values ('website_admin', $1, $2, $3, $4, 'IN_PROGRESS', now() + interval '24 hours')
     on conflict (service_name, actor_subject, idempotency_key) do nothing
     returning id`,
    [input.operationId, input.actor.claims.sub, input.key, input.requestHash]
  );
  if (inserted.rows[0]) return { kind: "started" as const, id: inserted.rows[0].id };
  const existing = await dbQuery<{
    id: string;
    operation_id: string;
    request_hash: string;
    state: string;
    response_status: number | null;
    response_body: unknown;
    updated_at: Date;
  }>(
    `select id, operation_id, request_hash, state, response_status, response_body, updated_at
     from axo_api_idempotency
     where service_name='website_admin' and actor_subject=$1 and idempotency_key=$2`,
    [input.actor.claims.sub, input.key]
  );
  const row = existing.rows[0];
  if (!row || row.operation_id !== input.operationId || row.request_hash !== input.requestHash) {
    throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different request.");
  }
  if (row.state === "COMPLETED" && row.response_status !== null) {
    return { kind: "replay" as const, response: { status: row.response_status, body: row.response_body } satisfies StoredResponse };
  }
  throw new ApiError(409, "IDEMPOTENCY_IN_PROGRESS", "This request is already being processed.");
}

export async function completeAxoIdempotency(id: string, response: StoredResponse) {
  await dbQuery(
    `update axo_api_idempotency
     set state='COMPLETED', response_status=$2, response_body=$3::jsonb, updated_at=now()
     where id=$1`,
    [id, response.status, JSON.stringify(response.body)]
  );
}

export async function failAxoIdempotency(id: string) {
  await dbQuery("delete from axo_api_idempotency where id=$1 and state='IN_PROGRESS'", [id]);
}

export async function auditAxoMutation(input: {
  actor: AxoRequestActor;
  operationId: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  idempotencyKey: string;
  request: NextRequest;
  metadata?: Record<string, unknown>;
}) {
  await logAuditEvent({
    actorType: input.actor.claims.actor_type === "user" ? "admin" : "integration",
    actorId: input.actor.admin?.adminUserId || input.actor.claims.sub,
    actorEmail: input.actor.admin?.email || null,
    entityType: input.targetType,
    entityId: input.targetId || null,
    action: `axo_${input.operationId}`,
    metadata: {
      requestId: input.actor.requestId,
      tokenId: input.actor.claims.jti,
      reason: input.reason,
      idempotencyKeyHash: createHash("sha256").update(input.idempotencyKey).digest("hex"),
      ...input.metadata
    },
    request: input.request
  });
}

function webhookEncryptionKey() {
  const value = process.env.AXO_WEBHOOK_SECRET_ENCRYPTION_KEY;
  if (!value || value.length < 32) {
    throw new ApiError(503, "SYSTEM_TEMPORARILY_UNAVAILABLE", "AXO webhook encryption is not configured.");
  }
  return createHash("sha256").update(value).digest();
}

function encryptWebhookSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", webhookEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptWebhookSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted webhook secret.");
  const decipher = createDecipheriv("aes-256-gcm", webhookEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function validateWebhookUrl(value: unknown) {
  if (typeof value !== "string") throw new ApiError(400, "BAD_REQUEST", "A webhook URL is required.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "The webhook URL is invalid.");
  }
  const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new ApiError(400, "BAD_REQUEST", "Webhook URLs must use HTTPS.");
  }
  if (url.username || url.password) throw new ApiError(400, "BAD_REQUEST", "Webhook URLs cannot contain credentials.");
  return url.toString();
}

export async function listAxoWebhooks() {
  const result = await dbQuery<{
    id: string;
    endpoint_url: string;
    event_types: string[];
    status: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `select id, endpoint_url, event_types, status, created_at, updated_at
     from axo_webhook_subscriptions where service_name='website_admin' order by created_at desc`
  );
  return result.rows.map((row) => ({
    id: row.id,
    url: row.endpoint_url,
    events: row.event_types,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  }));
}

export async function createAxoWebhook(input: { data?: Record<string, unknown> }, actor: AxoRequestActor) {
  const url = validateWebhookUrl(input.data?.url);
  const events = Array.isArray(input.data?.events)
    ? [...new Set(input.data.events.filter((event): event is string => typeof event === "string" && event.length <= 120))]
    : [];
  if (!events.length || events.length > 100) {
    throw new ApiError(400, "BAD_REQUEST", "Select between 1 and 100 webhook events.");
  }
  const secret = randomBytes(32).toString("base64url");
  const result = await dbQuery<{ id: string; created_at: Date }>(
    `insert into axo_webhook_subscriptions
       (service_name, endpoint_url, event_types, secret_encrypted, created_by_subject)
     values ('website_admin', $1, $2, $3, $4)
     returning id, created_at`,
    [url, events, encryptWebhookSecret(secret), actor.claims.sub]
  );
  return {
    webhook: { id: result.rows[0].id, url, events, status: "ACTIVE", createdAt: result.rows[0].created_at.toISOString() },
    secret,
    secretNotice: "This signing secret is shown once. Store it securely."
  };
}

export async function deleteAxoWebhook(webhookId: string) {
  const result = await dbQuery<{ id: string }>(
    `delete from axo_webhook_subscriptions where id=$1 and service_name='website_admin' returning id`,
    [webhookId]
  );
  if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Webhook subscription was not found.");
  return { deleted: true, webhookId };
}

type WebhookSubscriptionRow = { id: string; endpoint_url: string; secret_encrypted: string };

async function deliverWebhook(input: {
  deliveryId: string;
  subscription: WebhookSubscriptionRow;
  eventId: string;
  occurredAt: string;
  body: string;
}) {
  const timestamp = Math.floor(new Date(input.occurredAt).getTime() / 1000).toString();
  const signature = createHmac("sha256", decryptWebhookSecret(input.subscription.secret_encrypted))
    .update(`${timestamp}.${input.body}`)
    .digest("hex");
  try {
    const response = await fetch(input.subscription.endpoint_url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-writex-event-id": input.eventId,
        "x-writex-timestamp": timestamp,
        "x-writex-signature": `sha256=${signature}`
      },
      body: input.body,
      signal: AbortSignal.timeout(5000)
    });
    const delivered = response.ok;
    await dbQuery(
      `update axo_webhook_deliveries
       set status=$2, response_status=$3, attempt_count=attempt_count+1,
           delivered_at=case when $2='DELIVERED' then now() else delivered_at end,
           next_attempt_at=case when $2='FAILED' then now()+interval '5 minutes' else null end,
           updated_at=now()
       where id=$1`,
      [input.deliveryId, delivered ? "DELIVERED" : "FAILED", response.status]
    );
  } catch {
    await dbQuery(
      `update axo_webhook_deliveries
       set status='FAILED', attempt_count=attempt_count+1, next_attempt_at=now()+interval '5 minutes', updated_at=now()
       where id=$1`,
      [input.deliveryId]
    );
  }
}

export async function publishAxoWebhookEvent(input: {
  event: string;
  actor: AxoRequestActor;
  target: { type: string; id?: string | null };
  data?: Record<string, unknown>;
}) {
  const eventId = `evt_${randomUUID()}`;
  const occurredAt = new Date().toISOString();
  const subscriptions = await dbQuery<WebhookSubscriptionRow>(
    `select id, endpoint_url, secret_encrypted
     from axo_webhook_subscriptions
     where service_name='website_admin' and status='ACTIVE' and $1=any(event_types)`,
    [input.event]
  );
  const envelope = {
    id: eventId,
    event: input.event,
    occurredAt,
    actor: { type: input.actor.claims.actor_type, employeeId: input.actor.claims.employee_id || null },
    target: input.target,
    data: input.data || {},
    version: 1
  };
  const body = JSON.stringify(envelope);
  for (const subscription of subscriptions.rows) {
    const deliveryId = await withDbTransaction(async (query) => {
      const rows = await query<{ id: string }>(
        `insert into axo_webhook_deliveries
           (subscription_id, event_id, event_type, payload, status, next_attempt_at)
         values ($1, $2, $3, $4::jsonb, 'PENDING', now())
         on conflict (subscription_id, event_id) do update set event_id=excluded.event_id
         returning id`,
        [subscription.id, eventId, input.event, body]
      );
      return rows[0].id;
    });
    await deliverWebhook({ deliveryId, subscription, eventId, occurredAt, body });
  }
  return { eventId, subscriptions: subscriptions.rowCount || 0 };
}
