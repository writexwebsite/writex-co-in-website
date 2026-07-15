import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { getPaymentDetails } from "@/lib/integrations/pmt";
import { notifyPaymentProof } from "@/lib/notifications";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Payment notification storage is not configured.");
    }

    const { id } = await context.params;
    const result = await dbQuery<{
      id: string;
      invoice_id: string;
      amount: string | null;
      currency: string | null;
      payment_method: string | null;
      payment_reference: string | null;
      payment_date: string | Date | null;
      proof_file_asset_id: string | null;
      client_name: string | null;
      whatsapp: string | null;
      notes: string | null;
      proof_file_name: string | null;
      pmt_payment_status: string | null;
    }>(
      `
        select
          payment_events.*,
          file_assets.file_name as proof_file_name
        from payment_events
        left join file_assets on file_assets.id = payment_events.proof_file_asset_id
        where payment_events.id = $1
          and payment_events.event_type = 'proof_submitted'
        limit 1
      `,
      [id]
    );
    const payment = result.rows[0];

    if (!payment) {
      throw new ApiError(404, "NOT_FOUND", "Payment proof was not found.");
    }

    let currentPmtPaymentStatus = payment.pmt_payment_status;
    try {
      currentPmtPaymentStatus = (await getPaymentDetails(payment.invoice_id)).paymentStatus;
    } catch {
      currentPmtPaymentStatus = payment.pmt_payment_status;
    }

    const notification = await notifyPaymentProof({
      invoiceId: payment.invoice_id,
      clientName: payment.client_name,
      whatsapp: payment.whatsapp,
      amountPaid: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      paymentReference: payment.payment_reference,
      paymentDate: payment.payment_date ? String(payment.payment_date).slice(0, 10) : null,
      notes: payment.notes,
      proofFileAssetId: payment.proof_file_asset_id,
      proofFileName: payment.proof_file_name,
      currentPmtPaymentStatus,
      adminUrl: absoluteUrl(`/admin/payments/${id}`)
    });

    await dbQuery(
      `
        insert into payment_events (
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
          notes,
          source,
          raw_payload
        )
        values (
          $1, 'accounts_notified', $2, $3, $4, $5, $6::date,
          $7, $7, 'pending', 'pending', $8, $9, $10, $11,
          'admin_panel', $12::jsonb
        )
      `,
      [
        payment.invoice_id,
        payment.amount,
        payment.currency,
        payment.payment_method,
        payment.payment_reference,
        payment.payment_date ? String(payment.payment_date).slice(0, 10) : null,
        currentPmtPaymentStatus,
        payment.proof_file_asset_id,
        payment.client_name,
        payment.whatsapp,
        payment.notes,
        JSON.stringify({
          proofEventId: id,
          notification,
          adminUserId: session.adminUserId
        })
      ]
    );

    return apiOk({ notification });
  } catch (error) {
    return apiError(error);
  }
}
