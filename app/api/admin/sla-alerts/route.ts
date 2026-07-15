import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { getSlaAlerts } from "@/lib/admin/sla";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    getAdminSessionFromRequest(request);
    const status = request.nextUrl.searchParams.get("status") || undefined;
    return apiOk({ alerts: await getSlaAlerts({ status }) });
  } catch (error) {
    return apiError(error);
  }
}
