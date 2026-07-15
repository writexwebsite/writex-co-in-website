import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertCanMutateAdmin } from "@/lib/admin/permissions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getAdminSessionFromRequest(request);
    assertCanMutateAdmin(session);
    if (!isDatabaseConfigured()) throw notConfigured("SLA alerts are not configured.");
    const { id } = await context.params;
    const result = await dbQuery(
      `
        update sla_alerts
        set status = 'resolved',
            resolved_at = now(),
            resolved_by_admin_user_id = $2
        where id = $1
        returning id
      `,
      [id, session.adminUserId]
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "SLA alert was not found.");
    await logAuditEvent({ actorType: "admin", actorId: session.adminUserId, actorEmail: session.email, entityType: "sla_alert", entityId: id, action: "sla_alert_resolved", request });
    return apiOk({ alert: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
