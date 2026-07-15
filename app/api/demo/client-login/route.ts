import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { clearClientSessionCookie } from "@/lib/auth";
import { isDemoServerEnabled } from "@/lib/demo/config";
import { setDemoClientCookie } from "@/lib/demo/session";
import { assertRateLimit, getRequestContext } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isDemoServerEnabled()) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const context = getRequestContext(request);
    assertRateLimit({ key: `demo-client-login:${context.ipAddress}`, limit: 20, windowSeconds: 300 });
    const response = apiOk({ authenticated: true, isDemo: true, defaultRoute: "/client/dashboard" });
    clearClientSessionCookie(response);
    setDemoClientCookie(response, request);
    return response;
  } catch (error) { return apiError(error); }
}
