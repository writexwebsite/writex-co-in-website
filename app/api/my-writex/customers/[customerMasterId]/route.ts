import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { verifyCustomerClientSessionFromRequest } from "@/lib/auth";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ customerMasterId: string }> }) {
  try {
    const session = await verifyCustomerClientSessionFromRequest(request);
    const { customerMasterId } = await params;
    if (decodeURIComponent(customerMasterId) !== session.customerMasterId) {
      throw forbidden("This customer account is not available.");
    }
    const customer = getMyWritexCustomer(session);
    return apiOk({ writeXId: customer.writeXId, name: customer.name }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
