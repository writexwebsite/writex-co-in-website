import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { saveClientStatusOverride } from "@/lib/client/admin-operations";
import { assertSameOrigin, parseJson } from "@/lib/security";

const schema = z.object({
  mode: z.enum(["automatic", "manual", "frozen"]),
  publicStage: z.string().trim().max(100).nullish(),
  approvedPublicMessage: z.string().trim().max(500).nullish(),
  publicDeadline: z.string().trim().max(40).nullish(),
  overrideReason: z.string().trim().max(500).nullish(),
  expiresAt: z.string().trim().max(40).nullish()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceReference: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const body = await parseJson(request, schema);
    const { invoiceReference } = await params;
    const result = await saveClientStatusOverride({
      invoiceReference: decodeURIComponent(invoiceReference),
      input: body,
      adminUserId: admin.adminUserId
    });
    if (!result.valid) throw badRequest(result.error);
    return apiOk({ updated: true, mode: result.value.mode });
  } catch (error) {
    return apiError(error);
  }
}
