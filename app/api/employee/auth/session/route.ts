import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyEmployeeSessionFromRequest } from "@/lib/auth";
import { demoWorkspaces } from "@/lib/demo/demoWorkspaces";
import { getDemoEmployeeSessionFromRequest } from "@/lib/demo/session";

export async function GET(request: NextRequest) {
  try {
    const demo = getDemoEmployeeSessionFromRequest(request);
    if (demo) return apiOk({ authenticated: true, isDemo: true, employeeId: "WX-DEMO-001", defaultRoute: demoWorkspaces[demo.workspace].destination });
    const session = await verifyEmployeeSessionFromRequest(request);
    return apiOk({ authenticated: true, isDemo: false, employeeId: session.employeeId, defaultRoute: session.defaultRoute });
  } catch (error) { return apiError(error); }
}
