import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/response";
import { isDatabaseConfigured, optionalDbQuery } from "@/lib/db";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();

export type RequestContext = {
  ipAddress: string;
  userAgent: string;
};

export function getRequestContext(request: NextRequest): RequestContext {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    "unknown";

  return {
    ipAddress,
    userAgent: request.headers.get("user-agent") || "unknown"
  };
}

export function assertRateLimit({
  key,
  limit,
  windowSeconds
}: {
  key: string;
  limit: number;
  windowSeconds: number;
}) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000
    });
    return;
  }

  if (existing.count >= limit) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Please try again later."
    );
  }

  existing.count += 1;
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    throw new ApiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
  }

  if (!origin) return;

  try {
    const requestHost = request.headers.get("host") || request.nextUrl.host;
    if (new URL(origin).host !== requestHost) {
      throw new ApiError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, "FORBIDDEN", "The request origin is invalid.");
  }
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export async function parseJson<T>(
  request: NextRequest,
  schema: z.ZodType<T>
) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new ApiError(400, "BAD_REQUEST", z.treeifyError(parsed.error).errors.join(" ") || "Invalid request body.");
  }

  return parsed.data;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function requireServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new ApiError(
      503,
      "NOT_CONFIGURED",
      `${name} is required for this backend capability.`
    );
  }

  return value;
}

export async function logIntegrationEvent({
  system,
  endpoint,
  requestId,
  status,
  errorMessage
}: {
  system: string;
  endpoint: string;
  requestId?: string;
  status: string;
  errorMessage?: string;
}) {
  if (!isDatabaseConfigured()) return;

  await optionalDbQuery(
    `
      insert into integration_logs (system, endpoint, request_id, status, error_message)
      values ($1, $2, $3, $4, $5)
    `,
    [system, endpoint, requestId ?? null, status, errorMessage ?? null]
  );
}

export async function logPreviewDownloadEvent({
  invoiceId,
  clientSessionId,
  action,
  ipAddress,
  userAgent
}: {
  invoiceId: string;
  clientSessionId?: string;
  action: "preview" | "download";
  ipAddress: string;
  userAgent: string;
}) {
  if (!isDatabaseConfigured()) return;

  await optionalDbQuery(
    `
      insert into preview_download_logs (
        invoice_id,
        client_session_id,
        action,
        ip_address,
        user_agent
      )
      values ($1, $2, $3, $4, $5)
    `,
    [invoiceId, clientSessionId ?? null, action, ipAddress, userAgent]
  );
}
