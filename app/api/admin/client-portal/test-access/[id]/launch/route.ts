import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest, setClientSessionCookie } from "@/lib/auth";
import {
  assertClientPortalTestAccessEnabled,
  launchClientPortalTestAccess
} from "@/lib/client/test-access";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext
} from "@/lib/security";

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
    assertRateLimit({
      key: `client-test-access-launch:${admin.adminUserId}:${context.ipAddress}`,
      limit: 20,
      windowSeconds: 15 * 60
    });
    const launched = await launchClientPortalTestAccess({
      id,
      adminUserId: admin.adminUserId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    const response = apiOk(
      {
        authenticated: true,
        testSession: true,
        defaultRoute: "/client/overview"
      },
      { headers: { "cache-control": "no-store" } }
    );
    setClientSessionCookie(
      response,
      launched.sessionToken,
      launched.maxAgeSeconds
    );
    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "client_portal_test_access",
      entityId: id,
      action: "client_test_access_launched",
      metadata: {
        testProfileReference: launched.testProfileReference,
        testInvoiceReference: launched.testInvoiceReference,
        sessionId: launched.sessionId
      },
      request
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
