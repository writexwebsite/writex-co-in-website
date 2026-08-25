import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageEmployees } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  assignEmployeeDeliveryLearning,
  auditEmployeeMutation,
  getEmployee,
  previewEmployeeDeliveryLearningAssignment,
  transitionEmployeeDeliveryLearningAssignment
} from "@/lib/employees/repository";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  action: z.enum(["PREVIEW", "ASSIGN", "PAUSE", "RESUME", "WITHDRAW"]),
  reason: z.string().trim().min(8).max(500)
});

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
      key: `delivery-learning-assignment:${admin.adminUserId}:${context.ipAddress}`,
      limit: 60,
      windowSeconds: 60 * 60
    });
    const [{ employeeId }, input] = await Promise.all([params, parseJson(request, requestSchema)]);
    const result = input.action === "PREVIEW"
      ? await previewEmployeeDeliveryLearningAssignment(employeeId, input.reason, admin)
      : input.action === "ASSIGN"
        ? await assignEmployeeDeliveryLearning(employeeId, input.reason, admin)
        : await transitionEmployeeDeliveryLearningAssignment(employeeId, input.action, input.reason, admin);
    if (input.action !== "PREVIEW") {
      await auditEmployeeMutation({
        actor: admin,
        employeeId,
        action: input.action === "ASSIGN" ? "delivery_learning_assigned" : `delivery_learning_${input.action.toLowerCase()}`,
        metadata: {
          pathKey: "DELIVERY_CORE",
          reason: input.reason,
          source: "WEBSITE_ADMIN_EMPLOYEE_PROFILE",
          progressPreserved: input.action === "ASSIGN" ? undefined : true,
          result
        },
        request
      });
    }
    return apiOk({ result, employee: await getEmployee(employeeId) }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(badRequest("Record a clear reason before assigning learning."));
    return apiError(error);
  }
}
