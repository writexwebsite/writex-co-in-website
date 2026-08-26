import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { setClientPortalAccess } from "@/lib/client/admin-operations";
import { assertSameOrigin, parseJson } from "@/lib/security";

const schema = z.object({
  invoiceReference: z.string().trim().min(3).max(100),
  enabled: z.boolean(),
  reason: z.string().trim().min(10).max(500)
});

export async function PUT(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const body = await parseJson(request, schema);
    await setClientPortalAccess({
      ...body,
      adminUserId: admin.adminUserId
    });
    return apiOk({ updated: true });
  } catch (error) {
    return apiError(error);
  }
}
