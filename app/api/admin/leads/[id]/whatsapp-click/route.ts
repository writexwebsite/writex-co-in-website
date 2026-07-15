import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { logLeadActivity } from "@/lib/admin/leadActions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

function cleanNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}

function buildMessage(lead: { name: string; service_required: string; status: string }) {
  if (lead.status === "quoted") {
    return `Hi ${lead.name}, this is WriteX. We shared/reviewed the quote for your ${lead.service_required} request. Please confirm if you want us to proceed.`;
  }

  if (lead.status === "new") {
    return `Hi ${lead.name}, this is WriteX. We received your quote request for ${lead.service_required}. Please share your full brief, deadline, and files so we can review the scope.`;
  }

  return `Hi ${lead.name}, this is WriteX following up on your academic support request. Please let us know if you need any help with the next step.`;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (!isDatabaseConfigured()) throw notConfigured("Lead storage is not configured.");
    const { id } = await context.params;
    const result = await dbQuery<{ id: string; name: string; whatsapp: string; service_required: string; status: string }>(
      `
        update quote_leads
        set last_contacted_at = now(),
            status = case when status = 'new' then 'contacted' else status end
        where id = $1
        returning id, name, whatsapp, service_required, status
      `,
      [id]
    );
    const lead = result.rows[0];
    if (!lead) throw new ApiError(404, "NOT_FOUND", "Lead was not found.");
    await logLeadActivity({ leadId: id, adminUserId: session.adminUserId, activityType: "whatsapp_clicked" });
    await logAuditEvent({ actorType: "admin", actorId: session.adminUserId, actorEmail: session.email, entityType: "quote_lead", entityId: id, action: "whatsapp_clicked", request });
    return apiOk({
      whatsappUrl: `https://wa.me/${cleanNumber(lead.whatsapp)}?text=${encodeURIComponent(buildMessage(lead))}`
    });
  } catch (error) {
    return apiError(error);
  }
}
