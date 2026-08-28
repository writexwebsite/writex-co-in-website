import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertMyWritexDemoReviewAccess } from "@/lib/my-writex/demo-review-auth";
import { isMyWritexDemoFixtureEnabled } from "@/lib/my-writex/dev-fixture";
import {
  requestFunnel,
  resetMyWritexDemoRequestStore,
} from "@/lib/my-writex/request-repository";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    if (!isMyWritexDemoFixtureEnabled()) return new Response("Not found", { status: 404 });
    assertSameOrigin(request);
    assertMyWritexDemoReviewAccess(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `my-writex-demo-reset:${context.ipAddress}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    const database = await resetMyWritexDemoRequestStore();
    return apiOk({ requests: database.requests, funnel: await requestFunnel() });
  } catch (error) {
    return apiError(error);
  }
}
