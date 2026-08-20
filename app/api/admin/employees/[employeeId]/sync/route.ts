import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { attemptEmployeeAcademySync, auditEmployeeMutation } from "@/lib/employees/repository";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageEmployees(admin);
    await assertActiveAdminActor(admin.adminUserId);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `employee-sync-retry:${admin.adminUserId}:${context.ipAddress}`,
      limit: 30,
      windowSeconds: 60 * 60
    });
    const { employeeId } = await params;
    const sync = await attemptEmployeeAcademySync(employeeId, admin);
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action: "academy_sync_manual_retry",
      metadata: { requestId: sync.requestId, result: sync.synced ? "SYNCED" : "FAILED" },
      request
    });
    if (!sync.synced) {
      throw new ApiError(503, "INTEGRATION_UNAVAILABLE", `${sync.error} Reference: ${sync.requestId}`);
    }
    return apiOk({ sync }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
