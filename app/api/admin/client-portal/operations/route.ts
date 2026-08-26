import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  findClientPortalRecord,
  getClientPortalOperationsSummary
} from "@/lib/client/admin-operations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const invoiceReference = request.nextUrl.searchParams
      .get("invoiceReference")
      ?.trim();
    const summary = await getClientPortalOperationsSummary();
    if (!invoiceReference) {
      return apiOk({ summary }, { headers: { "cache-control": "no-store" } });
    }
    if (invoiceReference.length < 3 || invoiceReference.length > 100) {
      throw badRequest("Enter a valid invoice number.");
    }
    const record = await findClientPortalRecord(invoiceReference);
    return apiOk(
      { summary, record },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
