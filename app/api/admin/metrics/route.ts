import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { getAdminMetrics } from "@/lib/admin/metrics";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    const metrics = await getAdminMetrics();

    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "admin_dashboard",
      action: "dashboard_viewed",
      request
    });

    return apiOk(metrics);
  } catch (error) {
    return apiError(error);
  }
}
