import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import type { AdminSession } from "@/lib/auth";

export type AxoActorType = "service" | "user";

export type AxoTokenClaims = {
  iss: string;
  aud: string;
  sub: string;
  actor_type: AxoActorType;
  employee_id?: string;
  admin_user_id?: string;
  email?: string;
  role?: string;
  department_scope?: string[];
  scopes: string[];
  jti: string;
  iat: number;
  exp: number;
};

export type AxoRequestActor = {
  claims: AxoTokenClaims;
  requestId: string;
  admin: AdminSession | null;
};

const expectedAudience = "writex-website-admin";
const defaultIssuer = "writex-axo";

function decodeBase64UrlJson<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token is invalid.");
  }
}

function requiredSecret() {
  const secret = process.env.AXO_API_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new ApiError(503, "SYSTEM_TEMPORARILY_UNAVAILABLE", "AXO API authentication is not configured.");
  }
  return secret;
}

function safeEqualBase64Url(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAxoToken(token: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const [encodedHeader, encodedClaims, signature, extra] = token.split(".");
  if (!encodedHeader || !encodedClaims || !signature || extra) {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token is invalid.");
  }
  const header = decodeBase64UrlJson<{ alg?: string; typ?: string }>(encodedHeader);
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token algorithm is not allowed.");
  }
  const expected = createHmac("sha256", requiredSecret())
    .update(`${encodedHeader}.${encodedClaims}`)
    .digest("base64url");
  if (!safeEqualBase64Url(expected, signature)) {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token signature is invalid.");
  }
  const claims = decodeBase64UrlJson<AxoTokenClaims>(encodedClaims);
  const issuer = process.env.AXO_API_ISSUER || defaultIssuer;
  if (claims.iss !== issuer || claims.aud !== expectedAudience) {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token is not valid for Website Admin.");
  }
  if (!claims.sub || !claims.jti || !Array.isArray(claims.scopes)) {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token claims are incomplete.");
  }
  if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || claims.iat > nowSeconds + 60) {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token timing claims are invalid.");
  }
  if (claims.exp <= nowSeconds) {
    throw new ApiError(401, "TOKEN_EXPIRED", "The AXO access token has expired.");
  }
  if (claims.exp - claims.iat > Number(process.env.AXO_API_MAX_TOKEN_AGE_SECONDS || 900)) {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO access token lifetime exceeds the allowed maximum.");
  }
  if (claims.actor_type !== "service" && claims.actor_type !== "user") {
    throw new ApiError(401, "AUTH_REQUIRED", "The AXO actor type is invalid.");
  }
  return claims;
}

export async function authenticateAxoRequest(request: NextRequest): Promise<AxoRequestActor> {
  const requestId = request.headers.get("x-request-id")?.trim();
  if (!requestId || requestId.length > 120) {
    throw new ApiError(400, "REQUEST_ID_REQUIRED", "X-Request-Id is required.");
  }
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "AUTH_REQUIRED", "A Bearer token is required.");
  const claims = verifyAxoToken(match[1]);
  let admin: AdminSession | null = null;
  if (claims.actor_type === "user") {
    if (!claims.admin_user_id || !claims.email || !claims.role) {
      throw new ApiError(401, "AUTH_REQUIRED", "Delegated Website Admin claims are incomplete.");
    }
    const activeAdmin = await assertActiveAdminActor(claims.admin_user_id);
    admin = {
      kind: "admin",
      adminUserId: activeAdmin.id,
      email: activeAdmin.email,
      role: activeAdmin.role,
      mustChangePassword: activeAdmin.must_change_password
    };
    assertCanManageEmployees(admin);
  }
  return { claims, requestId, admin };
}

export function requireAxoScope(actor: AxoRequestActor, scope: string) {
  if (!actor.claims.scopes.includes(scope) && !actor.claims.scopes.includes("*")) {
    throw new ApiError(403, "SCOPE_REQUIRED", `The ${scope} scope is required.`);
  }
}

export function requireDelegatedAdmin(actor: AxoRequestActor) {
  if (actor.claims.actor_type !== "user" || !actor.admin) {
    throw new ApiError(403, "DELEGATED_USER_REQUIRED", "This action requires a delegated Website Admin.");
  }
  return actor.admin;
}

export function requireWriteHeaders(request: NextRequest, risk: "MEDIUM" | "HIGH" | "CRITICAL") {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key is required.");
  }
  const reason = request.headers.get("x-writex-change-reason")?.trim() || null;
  if ((risk === "HIGH" || risk === "CRITICAL") && (!reason || reason.length < 3 || reason.length > 500)) {
    throw new ApiError(400, "CHANGE_REASON_REQUIRED", "X-WriteX-Change-Reason is required for this action.");
  }
  return { idempotencyKey, reason };
}

export function requireIfMatch(request: NextRequest) {
  const value = request.headers.get("if-match")?.trim();
  if (!value) throw new ApiError(428, "VERSION_REQUIRED", "If-Match is required for this version-protected action.");
  return value.replace(/^W\//, "").replace(/^"|"$/g, "");
}

export function issueAxoTestToken(claims: Omit<AxoTokenClaims, "iss" | "aud" | "iat" | "exp"> & { expiresInSeconds?: number }) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test token issuance is disabled in production.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    ...claims,
    iss: process.env.AXO_API_ISSUER || defaultIssuer,
    aud: expectedAudience,
    iat: now,
    exp: now + (claims.expiresInSeconds || 300),
    expiresInSeconds: undefined
  })).toString("base64url");
  const signature = createHmac("sha256", requiredSecret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}
