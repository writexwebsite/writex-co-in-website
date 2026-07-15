import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { paymentVerificationStatuses } from "@/lib/payments/constants";
import { parseJson } from "@/lib/security";

export const runtime = "nodejs";

const verificationSchema = z.object({
  verificationStatus: z.enum(paymentVerificationStatuses),
  adminNotes: z.string().trim().max(2000).optional()
});

function eventTypeForStatus(status: string) {
  if (status === "verified") return "verified_local";
  if (status === "rejected") return "rejected";
  return "verification_pending";
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("Payment review storage is not configured.");
    }

    const { id } = await context.params;
    const body = await parseJson(request, verificationSchema);
    const result = await dbQuery<{
      id: string;
      invoice_id: string;
      amount: string | null;
      currency: string | null;
      payment_method: string | null;
      payment_reference: string | null;
      payment_date: Date | null;
      payment_status: string | null;
      pmt_payment_status: string | null;
      proof_file_asset_id: string | null;
      client_name: string | null;
      whatsapp: string | null;
      notes: string | null;
      source: string;
      raw_payload: unknown;
    }>(
      `
        update payment_events
        set verification_status = $2,
            local_verification_status = $2,
            admin_notes = $3
        where id = $1
          and event_type = 'proof_submitted'
        returning *
      `,
      [id, body.verificationStatus, body.adminNotes || null]
    );
    const payment = result.rows[0];

    if (!payment) {
      throw new ApiError(404, "NOT_FOUND", "Payment proof was not found.");
    }

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
          admin_notes,
          source,
          raw_payload
        )
        values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $10, $11, $12, $13, $14, $15,
          'admin_panel', $16::jsonb
        )
      `,
      [
        payment.invoice_id,
        eventTypeForStatus(body.verificationStatus),
        payment.amount,
        payment.currency,
        payment.payment_method,
        payment.payment_reference,
        payment.payment_date,
        payment.payment_status,
        payment.pmt_payment_status,
        body.verificationStatus,
        payment.proof_file_asset_id,
        payment.client_name,
        payment.whatsapp,
        payment.notes,
        body.adminNotes || null,
        JSON.stringify({
          proofEventId: id,
          adminUserId: session.adminUserId,
          adminEmail: session.email,
          note: "Local accounts verification update. PMT remains source of truth for settlement."
        })
      ]
    );
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "payment_event",
      entityId: id,
      action: "payment_proof_reviewed",
      metadata: { verificationStatus: body.verificationStatus },
      request
    });

    return apiOk({
      payment: {
        id: payment.id,
        verificationStatus: body.verificationStatus
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
