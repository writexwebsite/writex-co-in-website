import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { resetAcademyEmployeePassword } from "@/lib/employees/academy-client";
import { auditEmployeeMutation, getEmployee } from "@/lib/employees/repository";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";

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
      key: `academy-password-reset:${admin.adminUserId}:${context.ipAddress}`,
      limit: 20,
      windowSeconds: 60 * 60
    });
    const { employeeId } = await params;
    const employee = await getEmployee(employeeId);
    if (!employee) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
    if (employee.archivedAt || employee.employmentStatus !== "ACTIVE" || !employee.academyEnabled) {
      throw new ApiError(409, "BAD_REQUEST", "Enable Academy access for this active employee before resetting the password.");
    }

    const result = await resetAcademyEmployeePassword(employeeId, {
      adminId: admin.adminUserId,
      email: admin.email
    });
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action: "academy_password_reset",
      metadata: {
        requestId: result.requestId,
        sessionsRevoked: result.sessionsRevoked
      },
      request
    });

    return apiOk({
      credentials: {
        employeeName: employee.displayName,
        loginEmail: result.loginEmail,
        initialPassword: result.initialPassword,
        academyUrl: "https://academy.writex.co.in"
      },
      sessionsRevoked: result.sessionsRevoked
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
