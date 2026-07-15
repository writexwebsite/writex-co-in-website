import type { NextRequest } from "next/server";
import { apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminLeadList } from "@/lib/admin/leads";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Lead storage is not configured.");
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 20);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const result = await getAdminLeadList({ page, pageSize, status, search });

    return apiOk(result);
  } catch (error) {
    return apiError(error);
  }
}
