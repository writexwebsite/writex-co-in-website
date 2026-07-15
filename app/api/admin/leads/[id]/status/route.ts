import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { logLeadActivity } from "@/lib/admin/leadActions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { logIntegrationEvent, parseJson } from "@/lib/security";

export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum([
    "new",
    "contacted",
    "quoted",
    "converted",
    "lost",
    "spam"
  ])
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Lead storage is not configured.");
    }

    const { id } = await context.params;
    const body = await parseJson(request, statusSchema);
    const result = await dbQuery(
      `
        update quote_leads
        set status = $2,
            first_contact_at = case when $2 = 'contacted' then coalesce(first_contact_at, now()) else first_contact_at end,
            last_contacted_at = case when $2 = 'contacted' then now() else last_contacted_at end
        where id = $1
        returning id, status, updated_at
      `,
      [id, body.status]
    );
    const lead = result.rows[0];

    if (!lead) {
      throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    }

    await logIntegrationEvent({
      system: "admin_panel",
      endpoint: "lead_status_update",
      requestId: `${id}:${session.adminUserId}`,
      status: body.status
    });
    await logLeadActivity({
      leadId: id,
      adminUserId: session.adminUserId,
      activityType: "status_changed",
      newValue: body.status
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "quote_lead",
      entityId: id,
      action: "lead_status_changed",
      metadata: { status: body.status },
      request
    });

    return apiOk({ lead });
  } catch (error) {
    return apiError(error);
  }
}
