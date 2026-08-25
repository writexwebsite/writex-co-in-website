import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  assignDeliveryTeamLeadersToTeamManager,
  attemptEmployeeAcademySync,
  getEmployee
} from "@/lib/employees/repository";
import { deliveryTeamLeaderAssignmentSchema } from "@/lib/employees/validation";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageEmployees(admin);
    await assertActiveAdminActor(admin.adminUserId);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `delivery-team-leader-assignment:${admin.adminUserId}:${context.ipAddress}`,
      limit: 30,
      windowSeconds: 60 * 60
    });
    const [{ employeeId }, input] = await Promise.all([
      params,
      parseJson(request, deliveryTeamLeaderAssignmentSchema)
    ]);
    const assignment = await assignDeliveryTeamLeadersToTeamManager({
      teamManagerEmployeeId: employeeId,
      teamLeaderEmployeeIds: input.teamLeaderEmployeeIds,
      actor: admin,
      reason: input.reason
    });
    const sync = await Promise.all(assignment.assignedTeamLeaderEmployeeIds.map(async (teamLeaderEmployeeId) => ({
      teamLeaderEmployeeId,
      ...(await attemptEmployeeAcademySync(teamLeaderEmployeeId, admin))
    })));
    const employee = await getEmployee(employeeId);
    return apiOk({ assignment, sync, employee }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}
