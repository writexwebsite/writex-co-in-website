import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertCanMutateAdmin } from "@/lib/admin/permissions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { parseJson } from "@/lib/security";

export const runtime = "nodejs";

const schema = z.object({
  assignedToAdminUserId: z.string().uuid().nullable().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getAdminSessionFromRequest(request);
    assertCanMutateAdmin(session);
    if (!isDatabaseConfigured()) throw notConfigured("SLA alerts are not configured.");
    const { id } = await context.params;
    const body = await parseJson(request, schema);
    const result = await dbQuery(
      `
        update sla_alerts
        set assigned_to_admin_user_id = $2
        where id = $1
        returning id, assigned_to_admin_user_id
      `,
      [id, body.assignedToAdminUserId ?? null]
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "SLA alert was not found.");
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "sla_alert",
      entityId: id,
      action: "sla_alert_assigned",
      metadata: { assignedToAdminUserId: body.assignedToAdminUserId ?? null },
      request
    });
    return apiOk({ alert: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
