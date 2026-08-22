import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import {
  attemptEmployeeAcademySync,
  getEmployeeTeam,
  listEmployeeTeams,
  permanentlyDeleteEmployeeTeam,
  updateEmployeeTeam
} from "@/lib/employees/repository";
import {
  employeeTeamDeleteSchema,
  employeeTeamUpdateSchema
} from "@/lib/employees/validation";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function actorForMutation(request: NextRequest, operation: string) {
  assertSameOrigin(request);
  const admin = getAdminSessionFromRequest(request);
  assertCanManageEmployees(admin);
  await assertActiveAdminActor(admin.adminUserId);
  const context = getRequestContext(request);
  assertRateLimit({
    key: `employee-team:${operation}:${admin.adminUserId}:${context.ipAddress}`,
    limit: 60,
    windowSeconds: 60 * 60
  });
  return admin;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const admin = await actorForMutation(request, "update");
    const [{ teamId }, input] = await Promise.all([
      params,
      parseJson(request, employeeTeamUpdateSchema)
    ]);
    if (!z.uuid().safeParse(teamId).success) {
      throw new ApiError(400, "BAD_REQUEST", "The team reference is invalid.");
    }
    const before = await getEmployeeTeam(teamId);
    if (!before) throw new ApiError(404, "NOT_FOUND", "Team was not found.");
    const update = await updateEmployeeTeam(teamId, input, admin);
    const syncResults = [];
    for (const employeeId of update.employeeIds) {
      syncResults.push(await attemptEmployeeAcademySync(employeeId, admin));
    }
    const failedSyncs = syncResults.filter((result) => !result.synced).length;
    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "employee_team",
      entityId: teamId,
      action: before.status === input.status ? "employee_team_updated" : "employee_team_status_changed",
      metadata: {
        before: { teamCode: before.teamCode, name: before.name, department: before.department, status: before.status },
        after: input,
        assignedEmployees: update.employeeIds.length,
        academySyncFailures: failedSyncs
      },
      request
    });
    return apiOk({
      team: await getEmployeeTeam(teamId),
      teams: await listEmployeeTeams(),
      academySync: { attempted: update.employeeIds.length, failed: failedSyncs }
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const admin = await actorForMutation(request, "delete");
    const [{ teamId }, input] = await Promise.all([
      params,
      parseJson(request, employeeTeamDeleteSchema)
    ]);
    if (!z.uuid().safeParse(teamId).success) {
      throw new ApiError(400, "BAD_REQUEST", "The team reference is invalid.");
    }
    const deleted = await permanentlyDeleteEmployeeTeam(teamId, input);
    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "employee_team",
      entityId: teamId,
      action: "employee_team_deleted",
      metadata: {
        teamCode: deleted.team_code,
        name: deleted.name,
        department: deleted.department,
        reason: input.reason
      },
      request
    });
    return apiOk({ deleted: true, teams: await listEmployeeTeams() }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "BAD_REQUEST", "A reason and exact DELETE team-code confirmation are required."));
    }
    return apiError(error);
  }
}
