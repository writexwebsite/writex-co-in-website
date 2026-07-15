import type { NextRequest } from "next/server";
import { apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Invoice cache storage is not configured.");
    }

    const result = await dbQuery(
      `
        select
          invoice_id,
          client_name,
          whatsapp,
          service_type,
          subject,
          deadline,
          total_amount,
          paid_amount,
          balance_amount,
          currency,
          payment_status,
          work_status,
          synced_at,
          updated_at
        from portal_invoice_cache
        order by synced_at desc
        limit 100
      `
    );

    return apiOk({ invoices: result.rows });
  } catch (error) {
    return apiError(error);
  }
}
