import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertCanExport } from "@/lib/admin/permissions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    assertCanExport(session);
    const header = [
      "id",
      "created_at",
      "name",
      "email",
      "whatsapp",
      "country",
      "service_required",
      "academic_level",
      "subject",
      "status",
      "lead_priority",
      "lead_quality",
      "assigned_owner",
      "source_channel"
    ];

    if (!isDatabaseConfigured()) {
      return new NextResponse(`${header.join(",")}\n`, {
        headers: { "content-type": "text/csv; charset=utf-8" }
      });
    }

    const result = await dbQuery<{
      id: string;
      created_at: string | Date;
      name: string;
      email: string | null;
      whatsapp: string;
      country: string | null;
      service_required: string;
      academic_level: string | null;
      subject: string | null;
      status: string;
      lead_priority: string;
      lead_quality: string;
      assigned_owner: string | null;
      source_channel: string | null;
    }>(
      `
        select
          quote_leads.id,
          quote_leads.created_at,
          quote_leads.name,
          quote_leads.email,
          quote_leads.whatsapp,
          quote_leads.country,
          quote_leads.service_required,
          quote_leads.academic_level,
          quote_leads.subject,
          quote_leads.status,
          quote_leads.lead_priority,
          quote_leads.lead_quality,
          admin_users.name as assigned_owner,
          quote_leads.source_channel
        from quote_leads
        left join admin_users on admin_users.id = quote_leads.assigned_to_admin_user_id
        order by quote_leads.created_at desc
        limit 5000
      `
    );
    const rows = result.rows.map((lead) =>
      [
        lead.id,
        new Date(lead.created_at).toISOString(),
        lead.name,
        lead.email,
        lead.whatsapp,
        lead.country,
        lead.service_required,
        lead.academic_level,
        lead.subject,
        lead.status,
        lead.lead_priority,
        lead.lead_quality,
        lead.assigned_owner,
        lead.source_channel
      ]
        .map(csvCell)
        .join(",")
    );

    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "quote_lead",
      action: "lead_exported",
      request
    });

    return new NextResponse([header.join(","), ...rows].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=writex-leads.csv"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
