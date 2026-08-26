import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  assertClientPortalTestAccessEnabled,
  listClientPortalTestAccessAudit
} from "@/lib/client/test-access";
import { assertRateLimit, getRequestContext } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertClientPortalTestAccessEnabled();
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      throw badRequest("Invalid temporary-access record.");
    }
    const context = getRequestContext(request);
    assertRateLimit({
      key: `client-test-access-audit:${admin.adminUserId}:${context.ipAddress}`,
      limit: 60,
      windowSeconds: 15 * 60
    });
    const events = await listClientPortalTestAccessAudit(id);
    return apiOk(
      { events },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
