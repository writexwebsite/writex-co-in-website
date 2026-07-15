import { NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";
import { toolFeatureFlags } from "@/lib/tools/config";
import { upsertToolSession } from "@/lib/tools/leadService";
import { toolSessionSchema } from "@/lib/tools/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!toolFeatureFlags.publicHub) throw forbidden("Free tools are not enabled.");
    assertSameOrigin(request);
    const context = getRequestContext(request);
    assertRateLimit({ key: `tool-session:${context.ipAddress}`, limit: 80, windowSeconds: 600 });
    const body = await parseJson(request, toolSessionSchema);
    await upsertToolSession(body);
    return apiOk({ recorded: true });
  } catch (error) {
    return apiError(error);
  }
}
