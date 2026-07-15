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
  convertedAmount: z.coerce.number().positive().optional(),
  convertedCurrency: z.string().trim().min(2).max(8).default("INR"),
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
        set status = 'converted',
            converted_amount = coalesce($2, quoted_amount),
            converted_currency = $3,
            converted_at = now(),
            closed_at = now(),
            next_follow_up_at = null
        where id = $1
        returning id, status, converted_amount, converted_currency
      `,
      [id, body.convertedAmount ?? null, body.convertedCurrency]
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    await logLeadActivity({ leadId: id, adminUserId: session.adminUserId, activityType: "converted", note: body.note });
    await logAuditEvent({ actorType: "admin", actorId: session.adminUserId, actorEmail: session.email, entityType: "quote_lead", entityId: id, action: "lead_converted", request });
    return apiOk({ lead: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
