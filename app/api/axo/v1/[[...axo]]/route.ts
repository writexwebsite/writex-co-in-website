import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/response";
import {
  authenticateAxoRequest,
  requireAxoScope,
  requireDelegatedAdmin,
  requireIfMatch,
  requireWriteHeaders
} from "@/lib/axo/control-auth";
import { executeAdminAxoOperation, resolveAdminAxoOperation, type AxoCommand } from "@/lib/axo/admin-control";
import {
  auditAxoMutation,
  axoRequestHash,
  beginAxoIdempotency,
  completeAxoIdempotency,
  failAxoIdempotency,
  publishAxoWebhookEvent
} from "@/lib/axo/control-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const commandSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  expectedVersion: z.number().int().nonnegative().optional()
}).strict();

function responseBody(data: unknown, requestId: string) {
  return { ok: true, data, requestId, timestamp: new Date().toISOString() };
}

function errorResponse(error: unknown, requestId: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({
      ok: false,
      error: { code: error.code, message: error.message, details: {}, retryable: error.status >= 500 },
      requestId,
      timestamp: new Date().toISOString()
    }, { status: error.status, headers: { "cache-control": "private, no-store" } });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      ok: false,
      error: { code: "BAD_REQUEST", message: "The request body is invalid.", details: { issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, retryable: false },
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 400, headers: { "cache-control": "private, no-store" } });
  }
  console.error("axo_website_admin_request_failed", { requestId, error });
  return NextResponse.json({
    ok: false,
    error: { code: "SERVER_ERROR", message: "The request could not be completed.", details: {}, retryable: false },
    requestId,
    timestamp: new Date().toISOString()
  }, { status: 500, headers: { "cache-control": "private, no-store" } });
}

async function parseCommand(request: NextRequest): Promise<AxoCommand> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 1024 * 1024) throw new ApiError(413, "BAD_REQUEST", "The request body exceeds 1 MB.");
  const text = await request.text();
  if (!text) return {};
  if (Buffer.byteLength(text, "utf8") > 1024 * 1024) throw new ApiError(413, "BAD_REQUEST", "The request body exceeds 1 MB.");
  try {
    return commandSchema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new ApiError(400, "BAD_REQUEST", "The request body must be valid JSON.");
  }
}

async function handler(request: NextRequest, context: { params: Promise<{ axo?: string[] }> }) {
  const fallbackRequestId = request.headers.get("x-request-id")?.trim() || "missing";
  let idempotencyRecordId: string | null = null;
  try {
    const params = await context.params;
    const path = `/${(params.axo || []).join("/")}`;
    const operation = resolveAdminAxoOperation(request.method, path);
    const actor = await authenticateAxoRequest(request);
    requireAxoScope(actor, operation.scope);
    if (operation.delegated) requireDelegatedAdmin(actor);
    const command = operation.write ? await parseCommand(request) : {};
    let writeHeaders: { idempotencyKey: string; reason: string | null } | null = null;
    if (operation.write) {
      writeHeaders = requireWriteHeaders(request, operation.risk === "LOW" ? "MEDIUM" : operation.risk);
      if (operation.versionProtected) {
        const ifMatch = requireIfMatch(request);
        const version = Number(ifMatch);
        if (!Number.isInteger(version) || version < 0) throw new ApiError(400, "VERSION_REQUIRED", "If-Match must contain the current numeric version.");
        if (command.expectedVersion !== undefined && command.expectedVersion !== version) {
          throw new ApiError(400, "VERSION_CONFLICT", "The body version and If-Match header do not match.");
        }
        command.expectedVersion = version;
      }
      const idempotency = await beginAxoIdempotency({
        actor,
        operationId: operation.operationId,
        key: writeHeaders.idempotencyKey,
        requestHash: axoRequestHash({ method: request.method, path, body: command })
      });
      if (idempotency.kind === "replay") {
        return NextResponse.json(idempotency.response.body, {
          status: idempotency.response.status,
          headers: { "cache-control": "private, no-store", "x-idempotent-replay": "true" }
        });
      }
      idempotencyRecordId = idempotency.id;
    }
    const data = await executeAdminAxoOperation({ operation, command, actor, request });
    const status = operation.operationId === "createEmployee" || operation.operationId === "createAdminWebhook" ? 201 : 200;
    const body = responseBody(data, actor.requestId);
    if (operation.write && writeHeaders && idempotencyRecordId) {
      await auditAxoMutation({
        actor,
        operationId: operation.operationId,
        targetType: operation.params.employeeId ? "employee" : operation.params.webhookId ? "webhook" : "axo_control",
        targetId: operation.params.employeeId || operation.params.webhookId || null,
        reason: writeHeaders.reason,
        idempotencyKey: writeHeaders.idempotencyKey,
        request,
        metadata: { scope: operation.scope, risk: operation.risk }
      });
      await publishAxoWebhookEvent({
        event: `admin.${operation.operationId}`,
        actor,
        target: { type: operation.params.employeeId ? "employee" : "control", id: operation.params.employeeId || null },
        data: { requestId: actor.requestId }
      });
      await completeAxoIdempotency(idempotencyRecordId, { status, body });
    }
    const headers: Record<string, string> = { "cache-control": "private, no-store", "x-request-id": actor.requestId };
    if (operation.operationId === "getEmployee" && data && typeof data === "object" && "etag" in data) {
      headers.etag = String((data as { etag: string }).etag);
    }
    return NextResponse.json(body, { status, headers });
  } catch (error) {
    if (idempotencyRecordId) await failAxoIdempotency(idempotencyRecordId).catch(() => undefined);
    return errorResponse(error, fallbackRequestId);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
