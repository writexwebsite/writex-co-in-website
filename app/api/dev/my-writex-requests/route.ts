import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertMyWritexDemoReviewAccess } from "@/lib/my-writex/demo-review-auth";
import { isMyWritexDemoFixtureEnabled, isMyWritexDevFixtureEnabled } from "@/lib/my-writex/dev-fixture";
import { listAllRequests, requestFunnel } from "@/lib/my-writex/request-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isMyWritexDemoFixtureEnabled() && !isMyWritexDevFixtureEnabled()) return new Response("Not found", { status: 404 });
    if (isMyWritexDemoFixtureEnabled()) assertMyWritexDemoReviewAccess(request);
    return apiOk({ requests: await listAllRequests(), funnel: await requestFunnel() }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
