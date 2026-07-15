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
  lossReason: z.enum([
    "price_high",
    "no_response",
    "deadline_missed",
    "irrelevant_request",
    "competitor",
    "not_serviceable",
    "spam",
    "other"
  ]),
  note: z.string().trim().max(1000).optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getAdminSessionFromRequest(request);
    assertCanMutateAdmin(session);
    if (!isDatabaseConfigured()) throw notConfigured("Lead storage is not configured.");
    const { id } = await context.params;
    const body = await parseJson(request, schema);
    const result = await dbQuery(
      `
        update quote_leads
        set status = case when $2 = 'spam' then 'spam' else 'lost' end,
            loss_reason = $2,
            closed_at = now(),
            next_follow_up_at = null
        where id = $1
        returning id, status, loss_reason
      `,
      [id, body.lossReason]
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    await logLeadActivity({ leadId: id, adminUserId: session.adminUserId, activityType: "lost", note: body.note, newValue: body.lossReason });
    await logAuditEvent({ actorType: "admin", actorId: session.adminUserId, actorEmail: session.email, entityType: "quote_lead", entityId: id, action: "lead_lost", metadata: { lossReason: body.lossReason }, request });
    return apiOk({ lead: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
