import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  attemptEmployeeAcademySync,
  auditEmployeeMutation,
  getEmployee,
  updateEmployee
} from "@/lib/employees/repository";
import { employeeMutationSchema } from "@/lib/employees/validation";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageEmployees(admin);
    const { employeeId } = await params;
    const employee = await getEmployee(employeeId);
    if (!employee) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
    return apiOk({ employee }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
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
      key: `employee-update:${admin.adminUserId}:${context.ipAddress}`,
      limit: 90,
      windowSeconds: 60 * 60
    });
    const [{ employeeId }, input] = await Promise.all([
      params,
      parseJson(request, employeeMutationSchema)
    ]);
    const before = await getEmployee(employeeId);
    if (!before) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
    if (before.academyRole !== input.academyRole && !input.academyRoleChangeReason?.trim()) {
      throw new ApiError(400, "BAD_REQUEST", "Record a reason for this explicit Academy role change.");
    }
    await updateEmployee(employeeId, input, admin);
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action: "employee_updated",
      metadata: {
        employmentStatus: { before: before.employmentStatus, after: input.employmentStatus },
        academyAccess: { before: before.academyEnabled, after: input.academyEnabled },
        academyRole: { before: before.academyRole, after: input.academyRole },
        employeeSegment: { before: before.employeeSegment, after: input.employeeSegment },
        academyArea: { before: before.academyArea, after: input.academyArea },
        deliveryOperationalRole: { before: before.deliveryOperationalRole, after: input.deliveryOperationalRole },
        deliveryReportingParentChanged: before.deliveryReportingParentEmployeeId !== input.deliveryReportingParentEmployeeId,
        deliveryTrainerChanged: before.deliveryTrainerEmployeeId !== input.deliveryTrainerEmployeeId,
        teamChanged: before.primaryTeamId !== input.primaryTeamId,
        managerChanged: before.managerEmployeeId !== input.managerEmployeeId
      },
      request
    });
    if (before.employmentStatus !== input.employmentStatus) {
      await auditEmployeeMutation({ actor: admin, employeeId, action: "employee_employment_status_changed", metadata: { before: before.employmentStatus, after: input.employmentStatus }, request });
    }
    if (before.primaryTeamId !== input.primaryTeamId || before.managerEmployeeId !== input.managerEmployeeId || before.department !== input.department) {
      await auditEmployeeMutation({ actor: admin, employeeId, action: "employee_organisation_changed", metadata: { department: { before: before.department, after: input.department }, team: { before: before.primaryTeamId, after: input.primaryTeamId }, manager: { before: before.managerEmployeeId, after: input.managerEmployeeId } }, request });
    }
    if (before.academyEnabled !== input.academyEnabled) {
      await auditEmployeeMutation({ actor: admin, employeeId, action: input.academyEnabled ? "academy_access_granted" : "academy_access_revoked", metadata: { role: input.academyRole }, request });
    }
    if (before.academyRole !== input.academyRole) {
      await auditEmployeeMutation({
        actor: admin,
        employeeId,
        action: "academy_role_changed",
        metadata: {
          before: before.academyRole,
          after: input.academyRole,
          reason: input.academyRoleChangeReason,
          actionSource: "WEBSITE_ADMIN_EMPLOYEE_EDIT"
        },
        request
      });
    }
    if (before.employeeSegment !== input.employeeSegment) {
      await auditEmployeeMutation({ actor: admin, employeeId, action: "academy_employee_segment_changed", metadata: { before: before.employeeSegment, after: input.employeeSegment, identityPreserved: true }, request });
    }
    const sync = await attemptEmployeeAcademySync(employeeId, admin);
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action: sync.synced ? "academy_access_synced" : "academy_access_sync_failed",
      metadata: {
        requestId: sync.requestId,
        securitySensitiveRevocation: !input.academyEnabled || input.employmentStatus === "INACTIVE"
      },
      request
    });
    return apiOk({ employee: await getEmployee(employeeId), sync }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}
