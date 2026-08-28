import type { NextRequest } from "next/server";
import { apiError, apiOk, unauthorized } from "@/lib/api/response";
import {
  isValidMyWritexDemoReviewCode,
  setMyWritexDemoReviewCookie,
} from "@/lib/my-writex/demo-review-auth";
import { isExpectedMyWritexDemoHost } from "@/lib/my-writex/demo-mode";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!isExpectedMyWritexDemoHost(request.headers.get("host"))) throw unauthorized();
    const context = getRequestContext(request);
    assertRateLimit({
      key: `my-writex-demo-review:${context.ipAddress}`,
      limit: 10,
      windowSeconds: 15 * 60,
    });
    const body = await request.json().catch(() => null) as { code?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code : "";
    if (!isValidMyWritexDemoReviewCode(code)) {
      throw unauthorized("We couldn't verify that review code.");
    }
    const response = apiOk({ authenticated: true });
    setMyWritexDemoReviewCookie(response);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
