import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyEmployeeSessionFromRequest } from "@/lib/auth";
import { getEmployeeBootstrap } from "@/lib/integrations/employeeAuth";
import { getDemoEmployeeSessionFromRequest } from "@/lib/demo/session";
import { getEmployeeDemoData } from "@/lib/demo/employeeDemoData";

export async function GET(request: NextRequest) {
  try {
    const demo = getDemoEmployeeSessionFromRequest(request);
    if (demo) return apiOk(getEmployeeDemoData(demo.workspace));
    const session = await verifyEmployeeSessionFromRequest(request);
    return apiOk(await getEmployeeBootstrap(session.employeeId));
  } catch (error) { return apiError(error); }
}
