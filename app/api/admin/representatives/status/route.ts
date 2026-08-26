import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { assertRateLimit, getRequestContext } from "@/lib/security";
import { getRepresentativeSyncStatus } from "@/lib/trust/representative-sync-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageRepresentativeDirectory(admin);

    const context = getRequestContext(request);
    assertRateLimit({
      key: `representative-sync-status:${admin.adminUserId}:${context.ipAddress}`,
      limit: 120,
      windowSeconds: 60 * 60
    });

    return apiOk(await getRepresentativeSyncStatus(), {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}
