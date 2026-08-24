import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  attemptEmployeeAcademySync,
  auditEmployeeMutation,
  createEmployee,
  getEmployee,
  listEmployees
} from "@/lib/employees/repository";
import { employeeMutationSchema } from "@/lib/employees/validation";
import { academyAreas, employeeLifecycleFilters, type AcademyArea, type EmployeeLifecycleFilter } from "@/lib/employees/domain";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageEmployees(admin);
    const search = request.nextUrl.searchParams.get("search") || "";
    const sync = request.nextUrl.searchParams.get("sync") || "";
    const requestedLifecycle = request.nextUrl.searchParams.get("lifecycle") || (sync === "attention" ? "all" : "active");
    const lifecycle = employeeLifecycleFilters.includes(requestedLifecycle as EmployeeLifecycleFilter)
      ? requestedLifecycle as EmployeeLifecycleFilter
      : "active";
    const requestedArea = request.nextUrl.searchParams.get("area") || "";
    const academyArea = academyAreas.includes(requestedArea as AcademyArea) ? requestedArea as AcademyArea : "";
    const responsibility = request.nextUrl.searchParams.get("responsibility") || "";
    const access = request.nextUrl.searchParams.get("access") || "";
    const academyAccess = access === "enabled" || access === "disabled" ? access : "";
    return apiOk({ employees: await listEmployees({ search, sync, lifecycle, academyArea, responsibility, academyAccess }) }, {
      headers: { "cache-control": "private, no-store" }
    });
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
    assertRateLimit({
      key: `employee-create:${admin.adminUserId}:${context.ipAddress}`,
      limit: 30,
      windowSeconds: 60 * 60
    });
    const input = await parseJson(request, employeeMutationSchema);
    const employeeId = await createEmployee(input, admin);
    const createdEmployee = await getEmployee(employeeId);
    if (!createdEmployee) throw new Error("The employee record was not available after creation.");
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action: "employee_created",
      metadata: {
        employeeCode: input.employeeCode,
        department: input.department,
        academyAccess: createdEmployee.academyEnabled,
        academyRole: createdEmployee.academyRole,
        employeeSegment: createdEmployee.employeeSegment,
        academyArea: createdEmployee.academyArea,
        deliveryOperationalRole: createdEmployee.deliveryOperationalRole
      },
      request
    });
    const sync = await attemptEmployeeAcademySync(employeeId, admin);
    await auditEmployeeMutation({
      actor: admin,
      employeeId,
      action: sync.synced ? "academy_access_synced" : "academy_access_sync_failed",
      metadata: {
        requestId: sync.requestId,
        academyAccess: createdEmployee.academyEnabled,
        employeeSegment: createdEmployee.employeeSegment
      },
      request
    });
    return apiOk({ employee: await getEmployee(employeeId), sync }, {
      status: 201,
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(badRequest("Complete every required employee field with valid values."));
    }
    return apiError(error);
  }
}
