import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest, notConfigured } from "@/lib/api/response";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";
import { getPublicApplicationStatus } from "@/lib/hiring/public-applications";
import { assertRateLimit, assertSameOrigin, getRequestContext, hashValue, parseJson } from "@/lib/security";

const schema = z.object({
  applicationReference: z.string().trim().min(8).max(40),
  contact: z.string().trim().min(5).max(200)
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!isHiringFeatureEnabled("applications")) throw notConfigured("Application status is temporarily unavailable.");
    const context = getRequestContext(request);
    assertRateLimit({ key: `hiring-status:${hashValue(context.ipAddress)}`, limit: 12, windowSeconds: 15 * 60 });
    const input = await parseJson(request, schema);
    const result = await getPublicApplicationStatus(input);
    if (!result) throw badRequest("We could not verify those application details.");
    return apiOk(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

