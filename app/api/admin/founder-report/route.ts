import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { getFounderReportData } from "@/lib/admin/founderReport";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    const report = await getFounderReportData({
      dateFrom: request.nextUrl.searchParams.get("date_from"),
      dateTo: request.nextUrl.searchParams.get("date_to"),
      service: request.nextUrl.searchParams.get("service"),
      sourceChannel: request.nextUrl.searchParams.get("source_channel"),
      status: request.nextUrl.searchParams.get("status")
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "founder_report",
      action: "founder_report_viewed",
      request
    });
    return apiOk(report);
  } catch (error) {
    return apiError(error);
  }
}
