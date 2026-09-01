import "server-only";

import { createHmac } from "crypto";
import bcrypt from "bcryptjs";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError, forbidden, unauthorized } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured, optionalDbQuery } from "@/lib/db";
import { hashValue, isProduction, randomToken, safeCompare } from "@/lib/security";
import {
  isClientPortalTestAccessEnabled,
  type ClientTestProfileReference
} from "@/lib/client/test-access-types";
import { enforceDisabledClientPortalTestAccess } from "@/lib/client/test-access-state";

const defaultCookieName = "writex_admin_session";

type SessionKind = "admin" | "client" | "employee";

export type AdminSession = {
  kind: "admin";
  adminUserId: string;
  email: string;
  role: string;
  hiringRole?: string;
  mustChangePassword: boolean;
  sessionVersion?: number;
};

export type ClientSession = {
  kind: "client";
  sessionId: string;
  invoiceId: string;
  whatsapp: string;
  tokenHash: string;
  clientReference?: string;
  clientDisplayName?: string;
  verificationReference?: string;
  verifiedAt?: string;
  testSession: boolean;
  testAccessId?: string;
  testProfileReference?: ClientTestProfileReference;
  accessLevel: "full" | "restricted";
  securityMode:
    | "access_code"
    | "restricted_two_field"
    | "invoice_whatsapp"
    | "temporary_test_access";
};

export type EmployeeSession = {
  kind: "employee";
  sessionId?: string;
  employeeId: string;
  email?: string;
  tokenHash: string;
  defaultRoute: string;
};

export function getAuthCookieName() {
  return process.env.AUTH_COOKIE_NAME || defaultCookieName;
}

export function getClientCookieName() { return process.env.CLIENT_SESSION_COOKIE_NAME || "__Host-writex_client_session"; }
export function getEmployeeCookieName() { return process.env.EMPLOYEE_SESSION_COOKIE_NAME || "__Host-writex_employee_session"; }

function getCookieSecret() {
  const secret = process.env.AUTH_COOKIE_SECRET;

  if (!secret && isProduction()) {
    throw new ApiError(503, "NOT_CONFIGURED", "Authentication is not configured.");
  }

  return secret || "local-writex-cookie-secret";
}

export function getClientSessionMaxAgeSeconds() {
  const value = Number(process.env.CLIENT_SESSION_EXPIRY_SECONDS || process.env.CLIENT_SESSION_MAX_AGE_SECONDS || 60 * 60);
  return Number.isFinite(value) && value > 0 ? value : 60 * 60;
}
export function getClientSessionIdleSeconds() {
  const value = Number(process.env.CLIENT_SESSION_IDLE_EXPIRY_SECONDS || 30 * 60);
  return Number.isFinite(value) && value > 0 ? value : 30 * 60;
}
export function getEmployeeSessionMaxAgeSeconds() { const value=Number(process.env.EMPLOYEE_SESSION_EXPIRY_SECONDS||60*60*8); return Number.isFinite(value)&&value>0?value:60*60*8; }

export function getAdminSessionMaxAgeSeconds() {
  const value = Number(process.env.ADMIN_SESSION_EXPIRY_SECONDS || 60 * 60 * 8);
  return Number.isFinite(value) && value > 0 ? value : 60 * 60 * 8;
}

function base64UrlEncode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getCookieSecret()).update(value).digest("base64url");
}

export function createSignedSessionToken(
  payload: AdminSession | ClientSession | EmployeeSession,
  maxAgeSeconds: number
) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  };
  const encoded = base64UrlEncode(body);

  return `${encoded}.${sign(encoded)}`;
}

export function verifySignedSessionToken<T extends { kind: SessionKind }>(
  token?: string
): T | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeCompare(signature, sign(encoded))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as
      T & { exp?: number };

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds: number
) {
  response.cookies.set(getAuthCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(getAuthCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

function setNamedCookie(response: NextResponse, name: string, token: string, maxAge: number) {
  response.cookies.set(name, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge });
}

function clearNamedCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function setClientSessionCookie(response: NextResponse, token: string, maxAge: number) { setNamedCookie(response, getClientCookieName(), token, maxAge); }
export function clearClientSessionCookie(response: NextResponse) { clearNamedCookie(response, getClientCookieName()); }
export function setEmployeeSessionCookie(response: NextResponse, token: string, maxAge: number) { setNamedCookie(response, getEmployeeCookieName(), token, maxAge); }
export function clearEmployeeSessionCookie(response: NextResponse) { clearNamedCookie(response, getEmployeeCookieName()); }

export async function hashAdminPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyAdminPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createClientSessionRecord({
  invoiceId,
  whatsapp,
  clientReference,
  clientDisplayName,
  verificationReference,
  ipAddress,
  userAgent,
  accessLevel = "full",
  securityMode = "access_code"
}: {
  invoiceId: string;
  whatsapp: string;
  clientReference?: string;
  clientDisplayName?: string;
  verificationReference?: string;
  ipAddress: string;
  userAgent: string;
  accessLevel?: "full" | "restricted";
  securityMode?:
    | "access_code"
    | "restricted_two_field"
    | "invoice_whatsapp"
    | "temporary_test_access";
}) {
  const sessionToken = randomToken();
  const tokenHash = hashValue(sessionToken);
  const maxAgeSeconds = getClientSessionMaxAgeSeconds();
  const idleSeconds = Math.min(getClientSessionIdleSeconds(), maxAgeSeconds);
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const idleExpiresAt = new Date(Date.now() + idleSeconds * 1000);

  if (!isDatabaseConfigured()) {
    throw new ApiError(503, "NOT_CONFIGURED", "Client session storage is not configured.");
  }

  const result = await dbQuery<{ id: string }>(
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
        verification_reference,
        verified_at,
        ip_address,
        user_agent,
        access_level,
        security_mode
      )
      values ($1, $2, $3, $4, $5, $4, $6, $7, $8, now(), $9, $10, $11, $12)
      returning id
    `,
    [
      invoiceId,
      whatsapp,
      tokenHash,
      expiresAt.toISOString(),
      idleExpiresAt.toISOString(),
      clientReference ?? null,
      clientDisplayName ?? null,
      verificationReference ?? null,
      ipAddress,
      userAgent,
      accessLevel,
      securityMode
    ]
  );

  return {
    sessionId: result.rows[0].id,
    sessionToken,
    tokenHash,
    expiresAt
  };
}

type ClientSessionRow = {
  id: string;
  invoice_id: string;
  whatsapp: string;
  session_token_hash: string;
  client_reference: string | null;
  client_display_name: string | null;
  verification_reference: string | null;
  verified_at: string | null;
  test_session: boolean;
  test_access_id: string | null;
  test_profile_reference: ClientTestProfileReference | null;
  access_level: "full" | "restricted";
  security_mode:
    | "access_code"
    | "restricted_two_field"
    | "invoice_whatsapp"
    | "temporary_test_access";
};

export async function getClientSessionFromOpaqueToken(token?: string) {
  if (!token || !isDatabaseConfigured()) return null;
  await enforceDisabledClientPortalTestAccess();
  const tokenHash = hashValue(token);
  const idleSeconds = getClientSessionIdleSeconds();
  const result = await optionalDbQuery<ClientSessionRow>(
    `
      update client_sessions
      set
        last_seen_at = now(),
        idle_expires_at = least(
          absolute_expires_at,
          now() + ($2 || ' seconds')::interval
        )
      where session_token_hash = $1
        and revoked_at is null
        and expires_at > now()
        and absolute_expires_at > now()
        and idle_expires_at > now()
        and (test_session = false or $3 = true)
      returning
        id,
        invoice_id,
        whatsapp,
        session_token_hash,
        client_reference,
        client_display_name,
        verification_reference,
        verified_at,
        test_session,
        test_access_id,
        test_profile_reference,
        access_level,
        security_mode
    `,
    [tokenHash, idleSeconds, isClientPortalTestAccessEnabled()]
  );
  const row = result?.rows[0];
  if (!row) return null;

  return {
    kind: "client",
    sessionId: row.id,
    invoiceId: row.invoice_id,
    whatsapp: row.whatsapp,
    tokenHash: row.session_token_hash,
    clientReference: row.client_reference || undefined,
    clientDisplayName: row.client_display_name || undefined,
    verificationReference: row.verification_reference || undefined,
    verifiedAt: row.verified_at || undefined,
    testSession: row.test_session,
    testAccessId: row.test_access_id || undefined,
    testProfileReference: row.test_profile_reference || undefined,
    accessLevel: row.access_level,
    securityMode: row.security_mode
  } satisfies ClientSession;
}

export async function verifyClientSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(getClientCookieName())?.value;
  const session = await getClientSessionFromOpaqueToken(token);
  if (!session) throw unauthorized();
  return session;
}

export async function revokeClientSessionToken(
  token: string | undefined,
  reason = "client_logout"
) {
  if (!token || !isDatabaseConfigured()) return;
  await optionalDbQuery(
    `
      update client_sessions
      set revoked_at = now(), revocation_reason = $2
      where session_token_hash = $1
        and revoked_at is null
    `,
    [hashValue(token), reason]
  );
}

export async function rotateClientSessionToken(token: string | undefined) {
  if (!token || !isDatabaseConfigured()) return null;
  const nextToken = randomToken();
  const nextHash = hashValue(nextToken);
  const result = await optionalDbQuery<{ id: string }>(
    `
      update client_sessions
      set session_token_hash = $2, last_rotated_at = now()
      where session_token_hash = $1
        and revoked_at is null
        and expires_at > now()
        and absolute_expires_at > now()
        and idle_expires_at > now()
      returning id
    `,
    [hashValue(token), nextHash]
  );
  return result?.rows[0] ? nextToken : null;
}

export function assertFullClientAccess(session: ClientSession) {
  if (session.testSession) {
    throw forbidden("This action is disabled in a test session.");
  }
  if (session.accessLevel !== "full" || session.securityMode === "restricted_two_field") throw new ApiError(403, "ADDITIONAL_VERIFICATION_REQUIRED", "Additional verification is required for payment and file access. Please contact WriteX support.");
}

export function assertNotTestClientSession(session: ClientSession) {
  if (session.testSession) {
    throw forbidden("This action is disabled in a test session.");
  }
}

export async function assertNotTestClientRequest(request: NextRequest) {
  const token = request.cookies.get(getClientCookieName())?.value;
  if (!token) return;
  const session = await getClientSessionFromOpaqueToken(token);
  if (session?.testSession) {
    throw forbidden("This action is disabled in a test session.");
  }
}

export function getAdminSessionFromRequest(
  request: NextRequest,
  options: { allowPasswordChangeRequired?: boolean } = {}
) {
  const token = request.cookies.get(getAuthCookieName())?.value;
  const session = verifySignedSessionToken<AdminSession>(token);

  if (!session || session.kind !== "admin") {
    throw unauthorized();
  }

  if (session.mustChangePassword && !options.allowPasswordChangeRequired) {
    throw forbidden("Change the temporary administrator password before continuing.");
  }

  return session;
}

export function getEmployeeSessionFromRequest(request: NextRequest) {
  const token=request.cookies.get(getEmployeeCookieName())?.value;
  const session=verifySignedSessionToken<EmployeeSession>(token);
  if(!session||session.kind!=="employee") throw unauthorized();
  return session;
}

export async function createEmployeeSessionRecord(employeeId: string, ipAddress: string, userAgent: string) {
  const tokenHash = hashValue(randomToken());
  const expiresAt = new Date(Date.now() + getEmployeeSessionMaxAgeSeconds() * 1000);
  if (!isDatabaseConfigured()) {
    if (isProduction()) throw new ApiError(503, "NOT_CONFIGURED", "Employee session storage is not configured.");
    return { sessionId: undefined, tokenHash };
  }
  const result = await dbQuery<{ id: string }>(`insert into employee_sessions (employee_id, session_token_hash, expires_at, ip_address, user_agent) values ($1,$2,$3,$4,$5) returning id`, [employeeId, tokenHash, expiresAt.toISOString(), ipAddress, userAgent]);
  return { sessionId: result.rows[0].id, tokenHash };
}

export async function verifyEmployeeSessionFromRequest(request: NextRequest) {
  const session = getEmployeeSessionFromRequest(request);
  if (isDatabaseConfigured() && session.sessionId) {
    const result = await optionalDbQuery<{ id: string }>(`update employee_sessions set last_seen_at = now() where id = $1 and session_token_hash = $2 and revoked_at is null and expires_at > now() returning id`, [session.sessionId, session.tokenHash]);
    if (!result?.rows[0]) throw unauthorized();
  }
  return session;
}
