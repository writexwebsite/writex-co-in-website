import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { logLeadActivity } from "@/lib/admin/leadActions";
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
    if (!isDatabaseConfigured()) throw notConfigured("Lead storage is not configured.");
    const { id } = await context.params;
    const body = await parseJson(request, schema);
    const oldLead = await dbQuery<{ assigned_to_admin_user_id: string | null }>(
      "select assigned_to_admin_user_id from quote_leads where id = $1 limit 1",
      [id]
    );
    if (!oldLead.rows[0]) throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    const result = await dbQuery(
      `
        update quote_leads
        set assigned_to_admin_user_id = $2
        where id = $1
        returning id, assigned_to_admin_user_id
      `,
      [id, body.assignedToAdminUserId ?? null]
    );
    await logLeadActivity({
      leadId: id,
      adminUserId: session.adminUserId,
      activityType: "lead_assigned",
      oldValue: oldLead.rows[0].assigned_to_admin_user_id,
      newValue: body.assignedToAdminUserId ?? null
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "quote_lead",
      entityId: id,
      action: "lead_assigned",
      request
    });
    return apiOk({ lead: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
