import "server-only";

import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError, forbidden } from "@/lib/api/response";
import { safeCompare } from "@/lib/security";
import {
  DEMO_CLIENT_COOKIE,
  DEMO_CLIENT_LOCAL_COOKIE,
  DEMO_EMPLOYEE_COOKIE,
  DEMO_EMPLOYEE_LOCAL_COOKIE,
  getDemoSessionExpirySeconds,
  isDemoServerEnabled
} from "./config";
import { isDemoWorkspaceId, type DemoWorkspaceId } from "./demoWorkspaces";

export type DemoClientSession = { kind: "demo_client"; isDemo: true; invoiceId: "WX-DEMO-1001"; nonce: string; exp: number };
export type DemoEmployeeSession = { kind: "demo_employee"; isDemo: true; workspace: DemoWorkspaceId; nonce: string; exp: number };
type DemoSession = DemoClientSession | DemoEmployeeSession;
type DemoSessionInput = Omit<DemoClientSession, "nonce" | "exp"> | Omit<DemoEmployeeSession, "nonce" | "exp">;

function getDemoSecret() {
  const secret = process.env.DEMO_SESSION_SECRET || process.env.AUTH_COOKIE_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new ApiError(503, "NOT_CONFIGURED", "Demo session signing is not configured.");
  return secret || "local-writex-demo-session-secret";
}

function sign(encoded: string) {
  return createHmac("sha256", getDemoSecret()).update(`writex-demo:${encoded}`).digest("base64url");
}

function createToken(payload: DemoSessionInput) {
  const body = { ...payload, nonce: randomBytes(18).toString("base64url"), exp: Math.floor(Date.now() / 1000) + getDemoSessionExpirySeconds() };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token?: string): DemoSession | null {
  if (!token || !isDemoServerEnabled()) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeCompare(signature, sign(encoded))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as Partial<DemoSession>;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000) || payload.isDemo !== true) return null;
    if (payload.kind === "demo_client" && payload.invoiceId === "WX-DEMO-1001") return payload as DemoClientSession;
    if (payload.kind === "demo_employee" && isDemoWorkspaceId(payload.workspace)) return payload as DemoEmployeeSession;
    return null;
  } catch {
    return null;
  }
}

function isSecureRequest(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwardedProtocol ? forwardedProtocol === "https" : request.nextUrl.protocol === "https:";
}

function getWritableCookie(request: NextRequest, secureName: string, localName: string) {
  if (isSecureRequest(request)) return { name: secureName, secure: true };
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_INSECURE_DEMO_COOKIE !== "true"
  ) {
    throw new ApiError(403, "FORBIDDEN", "Demo access requires HTTPS.");
  }
  return { name: localName, secure: false };
}

function setDemoCookie(response: NextResponse, request: NextRequest, secureName: string, localName: string, token: string) {
  const cookie = getWritableCookie(request, secureName, localName);
  response.cookies.set(cookie.name, token, { httpOnly: true, secure: cookie.secure, sameSite: "lax", path: "/", maxAge: getDemoSessionExpirySeconds() });
}

function clearDemoCookie(response: NextResponse, name: string, secure: boolean) {
  response.cookies.set(name, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

function readDemoToken(request: NextRequest, secureName: string, localName: string) {
  return request.cookies.get(secureName)?.value || request.cookies.get(localName)?.value;
}

export function setDemoClientCookie(response: NextResponse, request: NextRequest) { setDemoCookie(response, request, DEMO_CLIENT_COOKIE, DEMO_CLIENT_LOCAL_COOKIE, createToken({ kind: "demo_client", isDemo: true, invoiceId: "WX-DEMO-1001" })); }
export function setDemoEmployeeCookie(response: NextResponse, request: NextRequest, workspace: DemoWorkspaceId) { setDemoCookie(response, request, DEMO_EMPLOYEE_COOKIE, DEMO_EMPLOYEE_LOCAL_COOKIE, createToken({ kind: "demo_employee", isDemo: true, workspace })); }
export function clearDemoCookies(response: NextResponse) {
  clearDemoCookie(response, DEMO_CLIENT_COOKIE, true);
  clearDemoCookie(response, DEMO_EMPLOYEE_COOKIE, true);
  clearDemoCookie(response, DEMO_CLIENT_LOCAL_COOKIE, false);
  clearDemoCookie(response, DEMO_EMPLOYEE_LOCAL_COOKIE, false);
}

export function getDemoClientSessionFromRequest(request: NextRequest) { const session = verifyToken(readDemoToken(request, DEMO_CLIENT_COOKIE, DEMO_CLIENT_LOCAL_COOKIE)); return session?.kind === "demo_client" ? session : null; }
export function getDemoEmployeeSessionFromRequest(request: NextRequest) { const session = verifyToken(readDemoToken(request, DEMO_EMPLOYEE_COOKIE, DEMO_EMPLOYEE_LOCAL_COOKIE)); return session?.kind === "demo_employee" ? session : null; }
export function assertNotDemoRequest(request: NextRequest) { if (getDemoClientSessionFromRequest(request) || getDemoEmployeeSessionFromRequest(request)) throw forbidden("This action is disabled in demo mode."); }

export async function getDemoClientSessionFromCookies() { const store = await cookies(); const session = verifyToken(store.get(DEMO_CLIENT_COOKIE)?.value || store.get(DEMO_CLIENT_LOCAL_COOKIE)?.value); return session?.kind === "demo_client" ? session : null; }
export async function getDemoEmployeeSessionFromCookies() { const store = await cookies(); const session = verifyToken(store.get(DEMO_EMPLOYEE_COOKIE)?.value || store.get(DEMO_EMPLOYEE_LOCAL_COOKIE)?.value); return session?.kind === "demo_employee" ? session : null; }
