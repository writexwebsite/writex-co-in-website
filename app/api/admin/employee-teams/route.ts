import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { createEmployeeTeam, listEmployeeTeams } from "@/lib/employees/repository";
import { employeeTeamSchema } from "@/lib/employees/validation";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageEmployees(admin);
    return apiOk({ teams: await listEmployeeTeams() }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageEmployees(admin);
    await assertActiveAdminActor(admin.adminUserId);
    const context = getRequestContext(request);
    assertRateLimit({ key: `employee-team-create:${admin.adminUserId}:${context.ipAddress}`, limit: 30, windowSeconds: 3600 });
    const input = await parseJson(request, employeeTeamSchema);
    const teamId = await createEmployeeTeam(input, admin);
    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "employee_team",
      entityId: teamId,
      action: "employee_team_created",
      metadata: input,
      request
    });
    return apiOk({ teamId, teams: await listEmployeeTeams() }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
