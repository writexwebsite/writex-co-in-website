import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { verifyClientSessionFromRequest } from "@/lib/auth";
import { assertClientOwnsInvoice } from "@/lib/client/portal-data";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceReference: string }> }
) {
  try {
    const session = await verifyClientSessionFromRequest(request);
    const { invoiceReference } = await params;
    if (!assertClientOwnsInvoice(session, decodeURIComponent(invoiceReference))) {
      throw forbidden("This record is not available.");
    }
    return apiOk(
      {
        state: "unavailable",
        payments: [],
        message: "Payment history is currently being connected."
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
