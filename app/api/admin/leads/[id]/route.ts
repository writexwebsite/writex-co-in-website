import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminLeadDetail } from "@/lib/admin/leads";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Lead storage is not configured.");
    }

    const { id } = await context.params;
    const detail = await getAdminLeadDetail(id);

    if (!detail) {
      throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    }

    return apiOk(detail);
  } catch (error) {
    return apiError(error);
  }
}
