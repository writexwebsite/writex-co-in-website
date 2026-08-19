import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  applyEmployeeLifecycleMutation,
  attemptEmployeeAcademySync,
  auditEmployeeMutation,
  getEmployee,
  getEmployeeDeletionAssessment,
  permanentlyDeleteEmployee
} from "@/lib/employees/repository";
import {
  employeeLifecycleMutationSchema,
  employeePermanentDeleteSchema
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
    key: `employee-lifecycle:${operation}:${admin.adminUserId}:${context.ipAddress}`,
    limit: 60,
    windowSeconds: 60 * 60
  });
  return admin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageEmployees(admin);
    const { employeeId } = await params;
    return apiOk({ assessment: await getEmployeeDeletionAssessment(employeeId) }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const admin = await actorForMutation(request, "change");
    const [{ employeeId }, input] = await Promise.all([
      params,
      parseJson(request, employeeLifecycleMutationSchema)
    ]);
    const before = await getEmployee(employeeId);
    if (!before) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
    await applyEmployeeLifecycleMutation(employeeId, input, admin);
    const sync = await attemptEmployeeAcademySync(employeeId, admin);
    const action = {
      DEACTIVATE: "employee_deactivated",
      ARCHIVE: "employee_archived",
      RESTORE: "employee_restored",
      SET_ACADEMY_ACCESS: input.action === "SET_ACADEMY_ACCESS" && input.enabled
        ? "academy_access_granted"
        : "academy_access_revoked",
      SET_ACADEMY_ROLE: "academy_role_changed"
    }[input.action];
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action,
      metadata: {
        reason: "reason" in input ? input.reason : undefined,
        before: {
          employmentStatus: before.employmentStatus,
          academyEnabled: before.academyEnabled,
          academyRole: before.academyRole,
          archivedAt: before.archivedAt
        },
        requested: input,
        academySync: { synced: sync.synced, requestId: sync.requestId },
        sessionsRevoked: "sessionsRevoked" in sync ? sync.sessionsRevoked : 0
      },
      request
    });
    if (!sync.synced && (input.action === "DEACTIVATE" || input.action === "ARCHIVE" || (input.action === "SET_ACADEMY_ACCESS" && !input.enabled))) {
      await auditEmployeeMutation({
        actor: admin,
        employeeId,
        action: "academy_security_revocation_pending",
        metadata: { requestId: sync.requestId },
        request
      });
    }
    const employee = await getEmployee(employeeId);
    const initialPassword = sync.initialPassword?.trim();
    const credentials = employee && initialPassword ? {
      employeeName: employee.displayName,
      loginEmail: employee.officialEmail,
      initialPassword,
      academyUrl: "https://academy.writex.co.in"
    } : undefined;
    return apiOk({ employee, sync, credentials }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const admin = await actorForMutation(request, "purge");
    const [{ employeeId }, input] = await Promise.all([
      params,
      parseJson(request, employeePermanentDeleteSchema)
    ]);
    const deleted = await permanentlyDeleteEmployee(employeeId, input.confirmation);
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action: "employee_permanently_deleted",
      metadata: {
        reason: input.reason,
        employeeCode: deleted.employee_code,
        displayName: deleted.display_name,
        officialEmail: deleted.official_email
      },
      request
    });
    return apiOk({ deleted: true }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ApiError(400, "BAD_REQUEST", "Provide a reason and type the exact employee name or code."));
    }
    return apiError(error);
  }
}
