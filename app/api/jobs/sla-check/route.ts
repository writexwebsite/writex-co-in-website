import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden, notConfigured } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { generateSlaAlerts } from "@/lib/sla/generateSlaAlerts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.JOB_SECRET;
    if (!secret) throw notConfigured("Scheduled jobs are not configured.");
    if (request.headers.get("x-job-secret") !== secret) throw forbidden();

    const summary = await generateSlaAlerts();
    await logAuditEvent({
      actorType: "system",
      entityType: "sla_job",
      action: "sla_job_run",
      metadata: summary,
      request
    });

    return apiOk({ success: true, ...summary });
  } catch (error) {
    return apiError(error);
  }
}
