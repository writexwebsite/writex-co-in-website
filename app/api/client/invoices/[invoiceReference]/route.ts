import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { verifyInvoiceClientSessionFromRequest } from "@/lib/auth";
import { getClientInvoice } from "@/lib/client/portal-data";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceReference: string }> }
) {
  try {
    const session = await verifyInvoiceClientSessionFromRequest(request);
    const { invoiceReference } = await params;
    const invoice = await getClientInvoice(
      session,
      decodeURIComponent(invoiceReference)
    );
    if (invoice === null) throw forbidden("This record is not available.");
    return apiOk(
      invoice === "unavailable"
        ? {
            state: "unavailable",
            message: "Billing information is currently being connected."
          }
        : { state: "available", invoice },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
