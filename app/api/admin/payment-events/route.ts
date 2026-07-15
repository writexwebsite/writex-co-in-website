import type { NextRequest } from "next/server";
import { apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Payment event storage is not configured.");
    }

    const result = await dbQuery(
      `
        select
          id,
          invoice_id,
          event_type,
          amount,
          currency,
          payment_method,
          payment_reference,
          payment_date,
          payment_status,
          pmt_payment_status,
          verification_status,
          local_verification_status,
          proof_file_asset_id,
          client_name,
          whatsapp,
          source,
          created_at
        from payment_events
        order by created_at desc
        limit 100
      `
    );

    return apiOk({ paymentEvents: result.rows });
  } catch (error) {
    return apiError(error);
  }
}
