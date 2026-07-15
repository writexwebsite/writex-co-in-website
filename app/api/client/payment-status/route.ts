import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertFullClientAccess, verifyClientSessionFromRequest } from "@/lib/auth";
import { getPaymentStatus } from "@/lib/integrations/pmt";
import { clientDemoData } from "@/lib/demo/clientDemoData";
import { getDemoClientSessionFromRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (getDemoClientSessionFromRequest(request)) return apiOk({ isDemo: true, paymentStatus: clientDemoData.payment.paymentStatus });
    const session = await verifyClientSessionFromRequest(request);
    assertFullClientAccess(session);
    const paymentStatus = await getPaymentStatus(session.invoiceId);

    return apiOk({ paymentStatus });
  } catch (error) {
    return apiError(error);
  }
}
