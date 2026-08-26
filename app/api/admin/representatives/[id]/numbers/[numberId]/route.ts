import { z } from "zod";
import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import {
  updateApprovedRepresentativeNumber,
  type RepresentativeNumberAction
} from "@/lib/trust/representative-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["activate", "deactivate", "make_primary", "revoke"]),
  reason: z.string().trim().min(10).max(500)
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; numberId: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageRepresentativeDirectory(admin);
    const requestContext = getRequestContext(request);
    assertRateLimit({
      key: `representative-number-update:${admin.adminUserId}:${requestContext.ipAddress}`,
      limit: 40,
      windowSeconds: 60 * 60
    });

    const { id, numberId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const number = await updateApprovedRepresentativeNumber({
      representativeId: id,
      representativeNumberId: numberId,
      action: body.action as RepresentativeNumberAction,
      reason: body.reason,
      adminUserId: admin.adminUserId
    });

    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "official_representative_number",
      entityId: number.id,
      action: `official_representative_number_${body.action}`,
      metadata: {
        representativeId: id,
        source: number.source,
        sourcePhoneType: number.sourcePhoneType,
        maskedNumber: number.maskedNumber,
        status: number.status,
        isPrimary: number.isPrimary
      },
      request
    });

    return apiOk(
      { number },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
