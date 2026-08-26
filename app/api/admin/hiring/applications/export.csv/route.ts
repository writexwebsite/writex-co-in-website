import type { NextRequest } from "next/server";
import { apiError } from "@/lib/api/response";
import { assertHiringPermission } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery } from "@/lib/db";
import { hiringRoleLabel } from "@/lib/hiring/domain";
import { assertRateLimit, getRequestContext } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertHiringPermission(admin, "hiring.applications.export");
    const context = getRequestContext(request);
    assertRateLimit({
      key: `hiring-export:${admin.adminUserId}:${context.ipAddress}`,
      limit: 10,
      windowSeconds: 3600
    });
    const result = await dbQuery<{
      application_reference: string;
      role_key: string;
      current_stage: string;
      source: string;
      submitted_at: Date;
      updated_at: Date;
    }>(
      "select application_reference,role_key,current_stage,source,submitted_at,updated_at from hiring_applications order by submitted_at desc limit 5000"
    );
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["application_reference", "role", "stage", "source", "submitted_at", "updated_at"].join(","),
      ...result.rows.map((row) =>
        [
          row.application_reference,
          hiringRoleLabel(row.role_key),
          row.current_stage,
          row.source,
          row.submitted_at.toISOString(),
          row.updated_at.toISOString()
        ].map(escape).join(",")
      )
    ];
    return new Response(rows.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=smart-hiring-operational-export-${new Date().toISOString().slice(0, 10)}.csv`,
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
