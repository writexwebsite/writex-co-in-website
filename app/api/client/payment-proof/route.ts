import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiOk,
  badRequest,
  forbidden,
  notConfigured
} from "@/lib/api/response";
import { assertFullClientAccess, verifyInvoiceClientSessionFromRequest } from "@/lib/auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { getInvoice } from "@/lib/integrations/lts";
import { getPaymentDetails, submitPaymentProof } from "@/lib/integrations/pmt";
import { notifyPaymentProof } from "@/lib/notifications";
import { absoluteUrl } from "@/lib/site";
import {
  assertRateLimit,
  getRequestContext,
  logIntegrationEvent
} from "@/lib/security";
import { isStorageConfigured, uploadFile } from "@/lib/storage/s3";
import { assertNotDemoRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

const proofFallbackMessage =
  "We could not upload the payment proof. Please send the screenshot to WriteX support on WhatsApp.";

const allowedProofExtensions = new Set(["jpg", "jpeg", "png", "pdf"]);
const allowedProofMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf"
]);

const paymentProofSchema = z.object({
  invoiceId: z.string().trim().min(3),
  amountPaid: z.coerce.number().positive().max(100000000),
  currency: z.string().trim().min(2).max(8).default("INR"),
  paymentMethod: z.string().trim().min(2).max(80),
  paymentReference: z.string().trim().min(3).max(160),
  paymentDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(1000).optional(),
  proofFileAssetId: z.string().trim().uuid().optional()
});

function getMaxProofBytes() {
  const maxMb = Number(
    process.env.PAYMENT_PROOF_MAX_UPLOAD_SIZE_MB ||
      process.env.MAX_UPLOAD_SIZE_MB ||
      10
  );

  return Math.max(1, maxMb) * 1024 * 1024;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function validateProofFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!allowedProofExtensions.has(extension)) {
    throw badRequest("Payment proof must be a JPG, PNG, or PDF file.");
  }

  if (file.size <= 0) {
    throw badRequest("The selected payment proof file is empty.");
  }

  if (file.size > getMaxProofBytes()) {
    throw badRequest(
      `Payment proof file is too large. Maximum upload size is ${
        process.env.PAYMENT_PROOF_MAX_UPLOAD_SIZE_MB ||
        process.env.MAX_UPLOAD_SIZE_MB ||
        10
      } MB.`
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const genericMime = !file.type || mimeType === "application/octet-stream";

  if (!genericMime && !allowedProofMimeTypes.has(mimeType)) {
    throw badRequest("Payment proof MIME type is not allowed.");
  }

  if (genericMime) {
    if (extension === "pdf") return "application/pdf";
    if (extension === "png") return "image/png";
    return "image/jpeg";
  }

  return mimeType;
}

async function getLinkedProofAsset({
  proofFileAssetId,
  invoiceId
}: {
  proofFileAssetId?: string;
  invoiceId: string;
}) {
  if (!proofFileAssetId) return null;

  const result = await dbQuery<{
    id: string;
    s3_key: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
  }>(
    `
      select id, s3_key, file_name, mime_type, file_size
      from file_assets
      where id = $1
        and invoice_id = $2
        and asset_type = 'payment_proof'
      limit 1
    `,
    [proofFileAssetId, invoiceId]
  );

  return result.rows[0] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    assertNotDemoRequest(request);
    const session = await verifyInvoiceClientSessionFromRequest(request);
    assertFullClientAccess(session);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `payment-proof:${session.invoiceId}:${context.ipAddress}`,
      limit: 8,
      windowSeconds: 300
    });

    if (!isDatabaseConfigured()) {
      throw notConfigured("Payment proof submission is temporarily unavailable.");
    }

    const formData = await request.formData();
    const parsed = paymentProofSchema.safeParse({
      invoiceId: String(formData.get("invoiceId") || ""),
      amountPaid: String(formData.get("amountPaid") || ""),
      currency: String(formData.get("currency") || "INR"),
      paymentMethod: String(formData.get("paymentMethod") || ""),
      paymentReference: String(formData.get("paymentReference") || ""),
      paymentDate: String(formData.get("paymentDate") || ""),
      notes: String(formData.get("notes") || "") || undefined,
      proofFileAssetId:
        String(formData.get("proofFileAssetId") || "") || undefined
    });

    if (!parsed.success) {
      throw badRequest("Payment proof details are invalid.");
    }

    const body = parsed.data;

    if (body.invoiceId !== session.invoiceId) throw forbidden();

    const proof = formData.get("proof");
    const hasFile = proof instanceof File && proof.size > 0;

    if (hasFile && !isStorageConfigured()) {
      throw notConfigured(proofFallbackMessage);
    }

    let fileAsset:
      | {
          id: string;
          s3_key: string;
          file_name: string;
          mime_type: string | null;
          file_size: number | null;
        }
      | null = await getLinkedProofAsset({
      proofFileAssetId: body.proofFileAssetId,
      invoiceId: body.invoiceId
    });

    if (hasFile) {
      const mimeType = validateProofFile(proof);
      const uploaded = await uploadFile({
        buffer: Buffer.from(await proof.arrayBuffer()),
        fileName: proof.name,
        mimeType,
        assetType: "payment_proof",
        invoiceId: body.invoiceId
      });
      const assetResult = await dbQuery<{
        id: string;
        s3_key: string;
        file_name: string;
        mime_type: string | null;
        file_size: number | null;
      }>(
        `
          insert into file_assets (
            invoice_id,
            asset_type,
            s3_key,
            file_name,
            mime_type,
            file_size,
            uploaded_by
          )
          values ($1, 'payment_proof', $2, $3, $4, $5, 'client')
          returning id, s3_key, file_name, mime_type, file_size
        `,
        [
          body.invoiceId,
          uploaded.s3Key,
          uploaded.fileName,
          uploaded.mimeType,
          uploaded.fileSize
        ]
      );
      fileAsset = assetResult.rows[0];
    }

    let invoice: Awaited<ReturnType<typeof getInvoice>> | null = null;
    try {
      invoice = await getInvoice(body.invoiceId);
    } catch {
      invoice = null;
    }

    let payment: Awaited<ReturnType<typeof getPaymentDetails>> | null = null;
    try {
      payment = await getPaymentDetails(body.invoiceId);
    } catch {
      payment = null;
    }

    const eventResult = await dbQuery<{ id: string }>(
      `
        insert into payment_events (
          invoice_id,
          client_session_id,
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
          $1, $2, 'proof_submitted', $3, $4, $5, $6, $7::date,
          $8, $9, 'pending', 'pending', $10, $11, $12, $13, 'client_portal',
          $14::jsonb
        )
        returning id
      `,
      [
        body.invoiceId,
        session.sessionId ?? null,
        body.amountPaid,
        body.currency,
        body.paymentMethod,
        body.paymentReference,
        body.paymentDate,
        payment?.paymentStatus ?? "pending_verification",
        payment?.paymentStatus ?? null,
        fileAsset?.id ?? null,
        invoice?.clientName ?? null,
        invoice?.whatsapp ?? session.whatsapp,
        body.notes ?? null,
        JSON.stringify({
          proofFileName: fileAsset?.file_name ?? null,
          proofFileSize: fileAsset?.file_size ?? null,
          pmtSnapshot: payment
        })
      ]
    );
    const paymentEventId = eventResult.rows[0].id;

    try {
      await submitPaymentProof(body.invoiceId, {
        s3Key: fileAsset?.s3_key,
        fileName: fileAsset?.file_name,
        mimeType: fileAsset?.mime_type ?? undefined,
        amount: body.amountPaid,
        fileAssetId: fileAsset?.id,
        paymentMethod: body.paymentMethod,
        paymentReference: body.paymentReference,
        paymentDate: body.paymentDate,
        notes: body.notes
      });
    } catch (error) {
      await logIntegrationEvent({
        system: "PMT",
        endpoint: "submit_payment_proof",
        requestId: paymentEventId,
        status: "deferred",
        errorMessage: error instanceof Error ? error.message : "PMT unavailable"
      });
    }

    const notification = await notifyPaymentProof({
      invoiceId: body.invoiceId,
      clientName: invoice?.clientName,
      whatsapp: invoice?.whatsapp ?? session.whatsapp,
      amountPaid: body.amountPaid,
      currency: body.currency,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
      paymentDate: body.paymentDate,
      notes: body.notes,
      proofFileAssetId: fileAsset?.id,
      proofFileName: fileAsset?.file_name,
      currentPmtPaymentStatus: payment?.paymentStatus,
      adminUrl: absoluteUrl(`/admin/payments/${paymentEventId}`)
    });

    if (notification.sent) {
      await dbQuery(
        `
          insert into payment_events (
            invoice_id,
            client_session_id,
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
            $1, $2, 'accounts_notified', $3, $4, $5, $6, $7::date,
            $8, $9, 'pending', 'pending', $10, $11, $12, $13,
            'system_email', $14::jsonb
          )
        `,
        [
          body.invoiceId,
          session.sessionId ?? null,
          body.amountPaid,
          body.currency,
          body.paymentMethod,
          body.paymentReference,
          body.paymentDate,
          payment?.paymentStatus ?? "pending_verification",
          payment?.paymentStatus ?? null,
          fileAsset?.id ?? null,
          invoice?.clientName ?? null,
          invoice?.whatsapp ?? session.whatsapp,
          body.notes ?? null,
          JSON.stringify({
            proofEventId: paymentEventId,
            notification
          })
        ]
      );
    }

    return apiOk({
      success: true,
      verificationStatus: "pending",
      paymentEventId,
      proofFileAssetId: fileAsset?.id ?? null,
      message: "Payment proof received. Accounts will verify the payment."
    });
  } catch (error) {
    return apiError(error);
  }
}
