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

    if (!isDatabaseConfigured()) {
      return new NextResponse("date,lead_id,service,status,source_channel,utm_campaign,assigned_owner,quoted_amount,converted_amount,loss_reason,created_at,converted_at\n", {
        headers: { "content-type": "text/csv; charset=utf-8" }
      });
    }

    const result = await dbQuery<{
      created_at: string | Date;
      id: string;
      service_required: string;
      status: string;
      source_channel: string | null;
      utm_campaign: string | null;
      assigned_owner: string | null;
      quoted_amount: string | number | null;
      converted_amount: string | number | null;
      loss_reason: string | null;
      converted_at: string | Date | null;
    }>(
      `
        select
          quote_leads.created_at,
          quote_leads.id,
          quote_leads.service_required,
          quote_leads.status,
          quote_leads.source_channel,
          quote_leads.utm_campaign,
          admin_users.name as assigned_owner,
          quote_leads.quoted_amount,
          quote_leads.converted_amount,
          quote_leads.loss_reason,
          quote_leads.converted_at
        from quote_leads
        left join admin_users on admin_users.id = quote_leads.assigned_to_admin_user_id
        order by quote_leads.created_at desc
        limit 5000
      `
    );
    const header = [
      "date",
      "lead_id",
      "service",
      "status",
      "source_channel",
      "utm_campaign",
      "assigned_owner",
      "quoted_amount",
      "converted_amount",
      "loss_reason",
      "created_at",
      "converted_at"
    ];
    const rows = result.rows.map((lead) =>
      [
        new Date(lead.created_at).toISOString().slice(0, 10),
        lead.id,
        lead.service_required,
        lead.status,
        lead.source_channel,
        lead.utm_campaign,
        lead.assigned_owner,
        lead.quoted_amount,
        lead.converted_amount,
        lead.loss_reason,
        new Date(lead.created_at).toISOString(),
        lead.converted_at ? new Date(lead.converted_at).toISOString() : ""
      ]
        .map(csvCell)
        .join(",")
    );

    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "founder_report",
      action: "founder_report_exported",
      request
    });

    return new NextResponse([header.join(","), ...rows].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=writex-founder-report.csv"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
