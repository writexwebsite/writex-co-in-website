import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyInvoiceClientSessionFromRequest } from "@/lib/auth";
import { getClientPortalOverview } from "@/lib/client/portal-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyInvoiceClientSessionFromRequest(request);
    return apiOk(await getClientPortalOverview(session), {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}
