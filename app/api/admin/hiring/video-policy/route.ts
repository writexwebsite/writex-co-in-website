import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { assertHiringPermission } from "@/lib/admin/permissions";
import { getHiringAdminSessionFromRequest } from "@/lib/hiring/access";
import {
  getSalesVideoPolicy,
  salesVideoPolicySchema,
  updateSalesVideoPolicy
} from "@/lib/hiring/video-policy";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  policy: salesVideoPolicySchema,
  reason: z.string().trim().min(5).max(500)
});

export async function GET(request: NextRequest) {
  try {
    const session = await getHiringAdminSessionFromRequest(request);
    assertHiringPermission(session, "hiring.settings.manage");
    return apiOk(await getSalesVideoPolicy(), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await getHiringAdminSessionFromRequest(request);
    assertHiringPermission(session, "hiring.settings.manage");
    const context = getRequestContext(request);
    assertRateLimit({ key: `hiring-video-policy:${session.adminUserId}:${context.ipAddress}`, limit: 20, windowSeconds: 3600 });
    const input = await parseJson(request, updateSchema);
    return apiOk(await updateSalesVideoPolicy(input.policy, session.adminUserId, input.reason));
  } catch (error) {
    return apiError(error);
  }
}
