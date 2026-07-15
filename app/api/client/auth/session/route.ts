import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyClientSessionFromRequest } from "@/lib/auth";
import { getDemoClientSessionFromRequest } from "@/lib/demo/session";

export async function GET(request: NextRequest) {
  try {
    const demo = getDemoClientSessionFromRequest(request);
    if (demo) return apiOk({ authenticated: true, isDemo: true, invoiceId: demo.invoiceId, accessLevel: "demo", securityMode: "demo" });
    const session = await verifyClientSessionFromRequest(request);
    return apiOk({ authenticated: true, isDemo: false, invoiceId: session.invoiceId, accessLevel: session.accessLevel, securityMode: session.securityMode });
  } catch (error) { return apiError(error); }
}
