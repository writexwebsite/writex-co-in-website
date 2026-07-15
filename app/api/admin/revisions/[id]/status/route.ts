import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { revisionStatuses } from "@/lib/admin/constants";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { parseJson } from "@/lib/security";

export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum(revisionStatuses),
  internalNote: z.string().trim().max(3000).optional()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!isDatabaseConfigured()) {
      throw notConfigured("Revision storage is not configured.");
    }

    const { id } = await context.params;
    const body = await parseJson(request, statusSchema);
    const result = await dbQuery<{ id: string; status: string }>(
      `
        update revision_requests
        set status = $2,
            internal_note = $3
        where id = $1
        returning id, status
      `,
      [id, body.status, body.internalNote || null]
    );
    const revision = result.rows[0];

    if (!revision) {
      throw new ApiError(404, "NOT_FOUND", "Revision request was not found.");
    }

    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "revision_request",
      entityId: id,
      action: "revision_status_changed",
      metadata: { status: body.status },
      request
    });

    return apiOk({ revision });
  } catch (error) {
    return apiError(error);
  }
}
