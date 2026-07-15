import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { getCrmMetrics } from "@/lib/admin/crm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    const metrics = await getCrmMetrics(session.adminUserId);
    return apiOk(metrics);
  } catch (error) {
    return apiError(error);
  }
}
