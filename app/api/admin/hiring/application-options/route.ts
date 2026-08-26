import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { assertCanManageSmartHiring } from "@/lib/admin/permissions";
import {
  getHiringOptions,
  upsertHiringOption
} from "@/lib/hiring/application-option-store";
import { isHiringOptionSetKey } from "@/lib/hiring/application-options";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";

const optionSchema = z.object({
  optionSet: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(120).refine((value) => !/[<>]/.test(value)),
  label: z.string().trim().min(1).max(120).refine((value) => !/[<>]/.test(value)),
  active: z.boolean(),
  displayOrder: z.number().int().min(0).max(1000)
});

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageSmartHiring(admin);
    return apiOk(await getHiringOptions({ includeInactive: true }));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    if (admin.role !== "super_admin") {
      throw badRequest("Only a Super Admin can change application options.");
    }
    const context = getRequestContext(request);
    assertRateLimit({
      key: `hiring-options:${admin.adminUserId}:${context.ipAddress}`,
      limit: 80,
      windowSeconds: 3600
    });
    const input = await parseJson(request, optionSchema);
    if (!isHiringOptionSetKey(input.optionSet)) throw badRequest("Unknown option set.");
    return apiOk(
      await upsertHiringOption({
        ...input,
        optionSet: input.optionSet,
        actorId: admin.adminUserId
      })
    );
  } catch (error) {
    return apiError(error);
  }
}
