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

const schema = z.object({ leadPriority: z.enum(["low", "normal", "high", "urgent"]) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getAdminSessionFromRequest(request);
    assertCanMutateAdmin(session);
    if (!isDatabaseConfigured()) throw notConfigured("Lead storage is not configured.");
    const { id } = await context.params;
    const body = await parseJson(request, schema);
    const result = await dbQuery<{ id: string; old_priority: string | null; lead_priority: string }>(
      `
        update quote_leads
        set lead_priority = $2
        where id = $1
        returning id, lead_priority
      `,
      [id, body.leadPriority]
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    await logLeadActivity({ leadId: id, adminUserId: session.adminUserId, activityType: "priority_changed", newValue: body.leadPriority });
    await logAuditEvent({ actorType: "admin", actorId: session.adminUserId, actorEmail: session.email, entityType: "quote_lead", entityId: id, action: "lead_priority_changed", metadata: { priority: body.leadPriority }, request });
    return apiOk({ lead: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
