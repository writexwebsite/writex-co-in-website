import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyClientSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { getClientRevisionRequests } from "@/lib/admin/revisions";
import { optionalDbQuery } from "@/lib/db";
import { getInvoice, getOrderFiles, getWorkJourney } from "@/lib/integrations/lts";
import { getPaymentDetails, isPaymentSettled } from "@/lib/integrations/pmt";
import {
  canUnlockFromLocalPaymentProof,
  getLatestPaymentProof
} from "@/lib/payments/proofs";
import { getWhatsAppUrl, siteConfig } from "@/lib/site";
import { clientDemoData } from "@/lib/demo/clientDemoData";
import { getDemoClientSessionFromRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function maskWhatsapp(whatsapp?: string | null) {
  const digits = String(whatsapp || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 4) return "****";
  return `+${digits.slice(0, 2)} ${"*".repeat(Math.max(4, digits.length - 6))}${digits.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  try {
    if (getDemoClientSessionFromRequest(request)) return apiOk(clientDemoData);
    const session = await verifyClientSessionFromRequest(request);
    if (session.accessLevel !== "full") {
      const journey = await getWorkJourney(session.invoiceId);
      return apiOk({
        restricted: true,
        invoiceId: session.invoiceId,
        currentStage: journey.currentStage,
        progressPercent: journey.progressPercent,
        message: "Additional verification is required for payment and file access. Please contact WriteX support.",
        support: { whatsappUrl: getWhatsAppUrl(), email: siteConfig.email }
      });
    }
    const [invoice, journey, orderFiles, payment, latestProof] = await Promise.all([
      getInvoice(session.invoiceId),
      getWorkJourney(session.invoiceId),
      getOrderFiles(session.invoiceId),
      getPaymentDetails(session.invoiceId),
      getLatestPaymentProof(session.invoiceId)
    ]);
    const revisions = await getClientRevisionRequests(session.invoiceId);
    const localUnlock = await canUnlockFromLocalPaymentProof(session.invoiceId);
    const downloadUnlocked =
      (isPaymentSettled(payment) || localUnlock) && orderFiles.finalAvailable;

    await optionalDbQuery(
      `
        insert into portal_invoice_cache (
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
          raw_lts_payload,
          raw_pmt_payload,
          synced_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
        on conflict (invoice_id)
        do update set
          client_name = excluded.client_name,
          whatsapp = excluded.whatsapp,
          service_type = excluded.service_type,
          subject = excluded.subject,
          deadline = excluded.deadline,
          total_amount = excluded.total_amount,
          paid_amount = excluded.paid_amount,
          balance_amount = excluded.balance_amount,
          currency = excluded.currency,
          payment_status = excluded.payment_status,
          work_status = excluded.work_status,
          raw_lts_payload = excluded.raw_lts_payload,
          raw_pmt_payload = excluded.raw_pmt_payload,
          synced_at = now(),
          updated_at = now()
      `,
      [
        session.invoiceId,
        invoice.clientName,
        invoice.whatsapp || session.whatsapp,
        invoice.serviceType,
        invoice.subject,
        invoice.deadline ?? null,
        payment.totalAmount ?? null,
        payment.paidAmount ?? null,
        payment.balanceAmount ?? null,
        payment.currency ?? null,
        payment.paymentStatus,
        invoice.orderStatus ?? invoice.deliveryStatus ?? null,
        JSON.stringify({ invoice, journey, orderFiles }),
        JSON.stringify(payment)
      ]
    );

    const supportMessage = `Hi WriteX, I need support for invoice ${session.invoiceId}.`;

    await logAuditEvent({
      actorType: "client",
      actorId: session.sessionId,
      entityType: "client_session",
      entityId: session.sessionId,
      action: "client_dashboard_viewed",
      metadata: { invoiceId: session.invoiceId },
      request
    });

    return apiOk({
      client: {
        name: invoice.clientName ?? null,
        whatsappMasked: maskWhatsapp(invoice.whatsapp || session.whatsapp),
        timezone: "Asia/Kolkata"
      },
      greeting: invoice.clientName
        ? `Good ${getTimeOfDay()}, ${invoice.clientName}`
        : "Welcome to your WriteX portal",
      invoice: {
        invoiceId: invoice.invoiceId,
        orderId: invoice.orderId ?? null,
        serviceType: invoice.serviceType ?? null,
        subject: invoice.subject ?? null,
        academicLevel: invoice.academicLevel ?? null,
        wordCount: invoice.wordCount ?? null,
        deadline: invoice.deadline ?? null,
        orderStatus: invoice.orderStatus ?? null,
        deliveryStatus: invoice.deliveryStatus ?? null
      },
      work: {
        currentStage: journey.currentStage,
        progressPercent: journey.progressPercent,
        stages: journey.stages
      },
      payment,
      paymentProof: latestProof
        ? {
            id: latestProof.id,
            verificationStatus: latestProof.verification_status,
            localVerificationStatus: latestProof.local_verification_status,
            proofFileAssetId: latestProof.proof_file_asset_id,
            amount: latestProof.amount,
            currency: latestProof.currency,
            paymentMethod: latestProof.payment_method,
            paymentReference: latestProof.payment_reference,
            paymentDate: latestProof.payment_date,
            notes: latestProof.notes,
            adminNotes: latestProof.admin_notes,
            submittedAt: latestProof.created_at
          }
        : null,
      delivery: {
        previewAvailable: orderFiles.previewAvailable,
        finalAvailable: orderFiles.finalAvailable,
        downloadUnlocked
      },
      support: {
        whatsappUrl: getWhatsAppUrl(supportMessage),
        email: siteConfig.supportEmail,
        supportHours: siteConfig.supportHours
      },
      revisions: revisions.map((revision) => ({
        id: revision.id,
        requestType: revision.request_type,
        status: revision.status,
        submittedAt: revision.created_at,
        message: revision.internal_note
      })),
      files: orderFiles.files.map((file) => ({
        id: file.id,
        fileName: file.fileName ?? null,
        assetType: file.assetType ?? null,
        fileType: file.fileType ?? null,
        fileSize: file.fileSize ?? null,
        status: file.status ?? null
      }))
    });
  } catch (error) {
    return apiError(error);
  }
}
