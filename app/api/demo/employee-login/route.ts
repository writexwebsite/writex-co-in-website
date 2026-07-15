import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { clearEmployeeSessionCookie } from "@/lib/auth";
import { isDemoServerEnabled } from "@/lib/demo/config";
import { demoWorkspaceIds, demoWorkspaces } from "@/lib/demo/demoWorkspaces";
import { setDemoEmployeeCookie } from "@/lib/demo/session";
import { assertRateLimit, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
const requestSchema = z.object({ workspace: z.enum(demoWorkspaceIds) });

export async function POST(request: NextRequest) {
  if (!isDemoServerEnabled()) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const context = getRequestContext(request);
    assertRateLimit({ key: `demo-employee-login:${context.ipAddress}`, limit: 30, windowSeconds: 300 });
    const body = await parseJson(request, requestSchema);
    const workspace = demoWorkspaces[body.workspace];
    const response = apiOk({ authenticated: true, isDemo: true, workspace: body.workspace, defaultRoute: workspace.destination });
    clearEmployeeSessionCookie(response);
    setDemoEmployeeCookie(response, request, body.workspace);
    return response;
  } catch (error) { return apiError(error); }
}
