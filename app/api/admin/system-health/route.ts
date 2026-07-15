import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { getProductionReadiness } from "@/lib/config/productionGuards";
import { isDatabaseConfigured } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage/s3";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    getAdminSessionFromRequest(request);
    const readiness = getProductionReadiness();

    return apiOk({
      databaseConfigured: isDatabaseConfigured(),
      s3Configured: isStorageConfigured(),
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      integrationMode: process.env.INTEGRATION_MODE || "disabled",
      jobSecretConfigured: Boolean(process.env.JOB_SECRET),
      readiness
    });
  } catch (error) {
    return apiError(error);
  }
}
