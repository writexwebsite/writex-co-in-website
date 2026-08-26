import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";
import { updateRepresentativeDisplayNameOverride } from "@/lib/trust/representative-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  publicDisplayName: z.string().trim().min(1).max(100).nullable()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageRepresentativeDirectory(admin);
    const { id } = paramsSchema.parse(await context.params);
    const body = await parseJson(request, bodySchema);
    const requestContext = getRequestContext(request);
    assertRateLimit({
      key: `representative-display-name:${admin.adminUserId}:${requestContext.ipAddress}`,
      limit: 60,
      windowSeconds: 60 * 60
    });

    const result = await updateRepresentativeDisplayNameOverride({
      representativeId: id,
      manualDisplayName: body.publicDisplayName
    });

    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "official_representative",
      entityId: id,
      action:
        result.operation === "set"
          ? "representative_public_display_name_overridden"
          : "representative_public_display_name_override_cleared",
      metadata: {
        previousPublicDisplayName: result.previousPublicDisplayName,
        publicDisplayName: result.representative.publicDisplayName,
        displayNameSource: result.representative.displayNameSource
      },
      request
    });

    return apiOk(
      { representative: result.representative },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
