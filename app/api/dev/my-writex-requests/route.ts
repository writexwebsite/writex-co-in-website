import { apiError, apiOk } from "@/lib/api/response";
import { isMyWritexDevFixtureEnabled } from "@/lib/my-writex/dev-fixture";
import { listAllRequests, requestFunnel } from "@/lib/my-writex/request-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production" || !isMyWritexDevFixtureEnabled()) return new Response("Not found", { status: 404 });
    return apiOk({ requests: await listAllRequests(), funnel: await requestFunnel() }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
