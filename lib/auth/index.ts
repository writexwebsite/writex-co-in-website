import "server-only";

import { createHmac } from "crypto";
import bcrypt from "bcryptjs";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError, unauthorized } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured, optionalDbQuery } from "@/lib/db";
import { hashValue, isProduction, randomToken, safeCompare } from "@/lib/security";

const defaultCookieName = "writex_admin_session";

type SessionKind = "admin" | "client" | "employee";

export type AdminSession = {
  kind: "admin";
  adminUserId: string;
  email: string;
  role: string;
};

export type ClientSession = {
  kind: "client";
  sessionId?: string;
  invoiceId: string;
  whatsapp: string;
  tokenHash: string;
  accessLevel: "full" | "restricted";
  securityMode: "access_code" | "restricted_two_field" | "invoice_whatsapp";
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
  const value = Number(process.env.CLIENT_SESSION_EXPIRY_SECONDS || process.env.CLIENT_SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 7);
  return Number.isFinite(value) && value > 0 ? value : 60 * 60 * 24 * 7;
}
export function getEmployeeSessionMaxAgeSeconds() { const value=Number(process.env.EMPLOYEE_SESSION_EXPIRY_SECONDS||60*60*8); return Number.isFinite(value)&&value>0?value:60*60*8; }

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
  ipAddress,
  userAgent,
  accessLevel = "full",
  securityMode = "access_code"
}: {
  invoiceId: string;
  whatsapp: string;
  ipAddress: string;
  userAgent: string;
  accessLevel?: "full" | "restricted";
  securityMode?: "access_code" | "restricted_two_field" | "invoice_whatsapp";
}) {
  const sessionToken = randomToken();
  const tokenHash = hashValue(sessionToken);
  const expiresAt = new Date(Date.now() + getClientSessionMaxAgeSeconds() * 1000);

  if (!isDatabaseConfigured()) {
    if (isProduction()) {
      throw new ApiError(503, "NOT_CONFIGURED", "Client session storage is not configured.");
    }

    return {
      sessionId: undefined,
      sessionToken,
      tokenHash,
      expiresAt
    };
  }

  const result = await dbQuery<{ id: string }>(
    `
      insert into client_sessions (
        invoice_id,
        whatsapp,
        session_token_hash,
        expires_at,
        ip_address,
        user_agent,
        access_level,
        security_mode
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning id
    `,
    [invoiceId, whatsapp, tokenHash, expiresAt.toISOString(), ipAddress, userAgent, accessLevel, securityMode]
  );

  return {
    sessionId: result.rows[0].id,
    sessionToken,
    tokenHash,
    expiresAt
  };
}

export async function verifyClientSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(getClientCookieName())?.value;
  const session = verifySignedSessionToken<ClientSession>(token);

  if (!session || session.kind !== "client") {
    throw unauthorized();
  }

  if (isDatabaseConfigured() && session.sessionId) {
    const result = await optionalDbQuery<{ id: string }>(
      `
        update client_sessions
        set last_seen_at = now()
        where id = $1
          and session_token_hash = $2
          and expires_at > now()
        returning id
      `,
      [session.sessionId, session.tokenHash]
    );

    if (!result?.rows[0]) throw unauthorized();
  }

  return session;
}

export function assertFullClientAccess(session: ClientSession) {
  if (session.accessLevel !== "full" || session.securityMode === "restricted_two_field") throw new ApiError(403, "ADDITIONAL_VERIFICATION_REQUIRED", "Additional verification is required for payment and file access. Please contact WriteX support.");
}

export function getAdminSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(getAuthCookieName())?.value;
  const session = verifySignedSessionToken<AdminSession>(token);

  if (!session || session.kind !== "admin") {
    throw unauthorized();
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
