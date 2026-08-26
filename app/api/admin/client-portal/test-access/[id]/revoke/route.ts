import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  assertClientPortalTestAccessEnabled,
  revokeClientPortalTestAccess
} from "@/lib/client/test-access";
import { assertSameOrigin, getRequestContext } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertClientPortalTestAccessEnabled();
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      throw badRequest("Invalid temporary-access record.");
    }
    const context = getRequestContext(request);
    await revokeClientPortalTestAccess({
      id,
      adminUserId: admin.adminUserId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "client_portal_test_access",
      entityId: id,
      action: "client_test_access_revoked",
      request
    });
    return apiOk(
      { revoked: true },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
