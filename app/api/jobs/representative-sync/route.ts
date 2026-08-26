import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden, notConfigured } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { safeCompare } from "@/lib/security";
import { runLtsRepresentativeSyncJob } from "@/lib/trust/lts-representative-sync-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.JOB_SECRET;
    const suppliedSecret = request.headers.get("x-job-secret") || "";
    if (!configuredSecret) throw notConfigured("Scheduled jobs are not configured.");
    if (!safeCompare(suppliedSecret, configuredSecret)) throw forbidden();

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
    const summary = await runLtsRepresentativeSyncJob({
      trigger: dryRun ? "dry_run" : "scheduled",
      dryRun
    });

    await logAuditEvent({
      actorType: "system",
      entityType: "official_representatives",
      action: dryRun
        ? "official_representatives_lts_dry_run"
        : "official_representatives_lts_scheduled_sync",
      metadata: summary,
      request
    });

    return apiOk(summary, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
