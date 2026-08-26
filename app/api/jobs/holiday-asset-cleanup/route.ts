import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden, notConfigured } from "@/lib/api/response";
import { cleanupAbandonedHolidayAssets } from "@/lib/holiday/orphan-cleanup";
import { safeCompare } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.JOB_SECRET;
    const suppliedSecret = request.headers.get("x-job-secret") || "";
    if (!configuredSecret) {
      throw notConfigured("Scheduled jobs are not configured.");
    }
    if (!safeCompare(suppliedSecret, configuredSecret)) throw forbidden();

    const summary = await cleanupAbandonedHolidayAssets();
    return apiOk(summary, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}
