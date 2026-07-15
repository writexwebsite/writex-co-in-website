import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, badRequest, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { logLeadActivity } from "@/lib/admin/leadActions";
import { assertCanMutateAdmin } from "@/lib/admin/permissions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { parseJson } from "@/lib/security";

export const runtime = "nodejs";

const schema = z.object({
  nextFollowUpAt: z.string().trim().optional(),
  note: z.string().trim().max(1000).optional(),
  complete: z.boolean().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getAdminSessionFromRequest(request);
    assertCanMutateAdmin(session);
    if (!isDatabaseConfigured()) throw notConfigured("Lead storage is not configured.");
    const { id } = await context.params;
    const body = await parseJson(request, schema);
    const nextFollowUp = body.complete ? null : body.nextFollowUpAt || null;
    if (nextFollowUp && new Date(nextFollowUp).getTime() <= Date.now()) {
      throw badRequest("Follow-up must be set for a future date/time.");
    }
    const result = await dbQuery<{ id: string; next_follow_up_at: Date | null }>(
      "update quote_leads set next_follow_up_at = $2 where id = $1 returning id, next_follow_up_at",
      [id, nextFollowUp]
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    await logLeadActivity({ leadId: id, adminUserId: session.adminUserId, activityType: body.complete ? "follow_up_completed" : "follow_up_scheduled", note: body.note, newValue: nextFollowUp });
    await logAuditEvent({ actorType: "admin", actorId: session.adminUserId, actorEmail: session.email, entityType: "quote_lead", entityId: id, action: body.complete ? "follow_up_completed" : "follow_up_scheduled", request });
    return apiOk({ lead: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
