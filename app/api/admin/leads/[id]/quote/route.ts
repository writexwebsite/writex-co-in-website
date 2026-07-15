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
  quotedAmount: z.coerce.number().positive(),
  quotedCurrency: z.string().trim().min(2).max(8).default("INR"),
  expectedCloseDate: z.string().trim().optional(),
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
        set status = 'quoted',
            quoted_amount = $2,
            quoted_currency = $3,
            expected_close_date = $4::date,
            next_follow_up_at = coalesce(next_follow_up_at, now() + interval '24 hours')
        where id = $1
        returning id, status, quoted_amount, quoted_currency
      `,
      [id, body.quotedAmount, body.quotedCurrency, body.expectedCloseDate || null]
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    await logLeadActivity({ leadId: id, adminUserId: session.adminUserId, activityType: "quote_sent", note: body.note, newValue: `${body.quotedAmount} ${body.quotedCurrency}` });
    await logAuditEvent({ actorType: "admin", actorId: session.adminUserId, actorEmail: session.email, entityType: "quote_lead", entityId: id, action: "quote_sent", request });
    return apiOk({ lead: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
