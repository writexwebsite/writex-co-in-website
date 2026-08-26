import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { recordHolidayAssetFailure } from "@/lib/holiday/repository";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  themeId: z.string().uuid(),
  role: z.enum([
    "login_desktop",
    "login_mobile",
    "login_background",
    "decorative_overlay",
    "logo_overlay",
    "axo",
    "header",
    "supporting"
  ]),
  route: z.string().trim().min(1).max(160)
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = getRequestContext(request);
    const payload = await parseJson(request, payloadSchema);
    assertRateLimit({
      key: `holiday-asset-failure:${payload.themeId}:${context.ipAddress}`,
      limit: 8,
      windowSeconds: 60 * 60
    });
    await recordHolidayAssetFailure(payload);
    return apiOk(
      { recorded: true },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}

