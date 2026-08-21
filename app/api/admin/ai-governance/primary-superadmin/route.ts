import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageAiGovernance } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { getAiGovernanceSnapshot, setPrimaryAcademySuperAdmin } from "@/lib/ai-governance/repository";
import { assertSameOrigin } from "@/lib/security";

const schema = z.object({
  employeeId: z.uuid().nullable(),
  confirmTransfer: z.boolean().default(false),
  reason: z.string().trim().min(3).max(500)
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageAiGovernance(admin);
    await assertActiveAdminActor(admin.adminUserId);
    const input = schema.parse(await request.json());
    await setPrimaryAcademySuperAdmin(input.employeeId, admin, {
      confirmTransfer: input.confirmTransfer,
      reason: input.reason
    });
    return apiOk(await getAiGovernanceSnapshot(), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(badRequest("Choose a valid existing employee identity."));
    return apiError(error);
  }
}
