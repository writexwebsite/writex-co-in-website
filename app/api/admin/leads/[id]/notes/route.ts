import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { logLeadActivity } from "@/lib/admin/leadActions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { parseJson } from "@/lib/security";

export const runtime = "nodejs";

const noteSchema = z.object({
  note: z.string().trim().min(2).max(3000)
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Lead note storage is not configured.");
    }

    const { id } = await context.params;
    const body = await parseJson(request, noteSchema);
    const lead = await dbQuery<{ id: string }>(
      "select id from quote_leads where id = $1 limit 1",
      [id]
    );

    if (!lead.rows[0]) {
      throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    }

    const result = await dbQuery(
      `
        insert into lead_notes (quote_lead_id, admin_user_id, note, visibility)
        values ($1, $2, $3, 'internal')
        returning id, quote_lead_id, note, visibility, created_at
      `,
      [id, session.adminUserId, body.note]
    );
    await logLeadActivity({
      leadId: id,
      adminUserId: session.adminUserId,
      activityType: "note_added",
      note: body.note
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "quote_lead",
      entityId: id,
      action: "lead_note_added",
      request
    });

    return apiOk({ note: result.rows[0] }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
