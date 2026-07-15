import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyClientSessionFromRequest } from "@/lib/auth";
import { getWorkJourney } from "@/lib/integrations/lts";
import { clientDemoData } from "@/lib/demo/clientDemoData";
import { getDemoClientSessionFromRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (getDemoClientSessionFromRequest(request)) return apiOk({ isDemo: true, workJourney: clientDemoData.work });
    const session = await verifyClientSessionFromRequest(request);
    const workJourney = await getWorkJourney(session.invoiceId);

    return apiOk({ workJourney });
  } catch (error) {
    return apiError(error);
  }
}
