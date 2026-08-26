import { z } from "zod";
import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import { addApprovedRepresentativeNumber } from "@/lib/trust/representative-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mobile: z.string().trim().min(1).max(40),
  makePrimary: z.boolean().default(false),
  reason: z.string().trim().min(10).max(500)
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageRepresentativeDirectory(admin);
    const requestContext = getRequestContext(request);
    assertRateLimit({
      key: `representative-number-add:${admin.adminUserId}:${requestContext.ipAddress}`,
      limit: 20,
      windowSeconds: 60 * 60
    });

    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());
    const number = await addApprovedRepresentativeNumber({
      representativeId: id,
      mobile: body.mobile,
      makePrimary: body.makePrimary,
      reason: body.reason,
      adminUserId: admin.adminUserId
    });

    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "official_representative_number",
      entityId: number.id,
      action: "official_representative_number_added",
      metadata: {
        representativeId: id,
        source: number.source,
        sourcePhoneType: number.sourcePhoneType,
        maskedNumber: number.maskedNumber,
        isPrimary: number.isPrimary
      },
      request
    });

    return apiOk(
      { number },
      { status: 201, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
