import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiOk,
  badRequest,
  forbidden,
  notConfigured
} from "@/lib/api/response";
import { assertFullClientAccess, verifyClientSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { getInvoice, sendClientEvent } from "@/lib/integrations/lts";
import { notifyRevisionRequest } from "@/lib/notifications";
import { absoluteUrl } from "@/lib/site";
import {
  assertRateLimit,
  getRequestContext,
  logIntegrationEvent
} from "@/lib/security";
import { isStorageConfigured, uploadFile } from "@/lib/storage/s3";
import { assertNotDemoRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

const revisionSchema = z.object({
  invoiceId: z.string().trim().min(3),
  requestType: z.enum([
    "Clarification",
    "Revision request",
    "Formatting issue",
    "Referencing issue",
    "Missing instruction",
    "Supervisor comment response",
    "Other"
  ]),
  issueCategory: z.enum([
    "Content clarity",
    "Structure",
    "Referencing/citation",
    "Formatting",
    "Language/editing",
    "Data/technical issue",
    "Scope mismatch",
    "Other"
  ]),
  relatedSection: z.string().trim().max(200).optional(),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  message: z.string().trim().min(20).max(4000),
  confirmation: z.literal("on").or(z.literal("true"))
});

const allowedExtensions = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png", "txt"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/plain"
]);

function maxRevisionBytes() {
  const maxMb = Number(
    process.env.REVISION_UPLOAD_MAX_SIZE_MB || process.env.MAX_UPLOAD_SIZE_MB || 10
  );
  return Math.max(1, maxMb) * 1024 * 1024;
}

function extension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function validateAttachment(file: File) {
  if (!allowedExtensions.has(extension(file.name))) {
    throw badRequest("Revision attachment must be PDF, DOC, DOCX, JPG, PNG, or TXT.");
  }
  if (file.size <= 0) throw badRequest("The selected attachment is empty.");
  if (file.size > maxRevisionBytes()) {
    throw badRequest("Revision attachment is too large.");
  }
  if (file.type && file.type !== "application/octet-stream" && !allowedMimeTypes.has(file.type)) {
    throw badRequest("Revision attachment MIME type is not allowed.");
  }

  if (file.type && file.type !== "application/octet-stream") return file.type;
  if (extension(file.name) === "pdf") return "application/pdf";
  if (extension(file.name) === "png") return "image/png";
  if (["jpg", "jpeg"].includes(extension(file.name))) return "image/jpeg";
  if (extension(file.name) === "txt") return "text/plain";
  if (extension(file.name) === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/msword";
}

export async function POST(request: NextRequest) {
  try {
    assertNotDemoRequest(request);
    const session = await verifyClientSessionFromRequest(request);
    assertFullClientAccess(session);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `revision:${session.invoiceId}:${context.ipAddress}`,
      limit: 5,
      windowSeconds: 300
    });

    if (!isDatabaseConfigured()) {
      throw notConfigured(
        "We could not submit the request online. Please send your revision note on WhatsApp."
      );
    }

    const formData = await request.formData();
    const parsed = revisionSchema.safeParse({
      invoiceId: String(formData.get("invoiceId") || ""),
      requestType: String(formData.get("requestType") || ""),
      issueCategory: String(formData.get("issueCategory") || ""),
      relatedSection: String(formData.get("relatedSection") || "") || undefined,
      priority: String(formData.get("priority") || "normal"),
      message: String(formData.get("message") || ""),
      confirmation: String(formData.get("confirmation") || "")
    });

    if (!parsed.success) {
      throw badRequest("Revision request details are invalid.");
    }

    const body = parsed.data;
    if (body.invoiceId !== session.invoiceId) throw forbidden();

    const attachment = formData.get("attachment");
    const hasAttachment = attachment instanceof File && attachment.size > 0;
    const attachmentSkipped = hasAttachment && !isStorageConfigured();

    let invoice: Awaited<ReturnType<typeof getInvoice>> | null = null;
    try {
      invoice = await getInvoice(body.invoiceId);
    } catch {
      invoice = null;
    }

    let fileAssetId: string | null = null;
    if (hasAttachment && isStorageConfigured()) {
      const mimeType = validateAttachment(attachment);
      try {
        const uploaded = await uploadFile({
          buffer: Buffer.from(await attachment.arrayBuffer()),
          fileName: attachment.name,
          mimeType,
          assetType: "revision_attachment",
          invoiceId: body.invoiceId
        });
        const asset = await dbQuery<{ id: string }>(
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
            values ($1, 'revision_attachment', $2, $3, $4, $5, 'client')
            returning id
          `,
          [
            body.invoiceId,
            uploaded.s3Key,
            uploaded.fileName,
            uploaded.mimeType,
            uploaded.fileSize
          ]
        );
        fileAssetId = asset.rows[0]?.id ?? null;
      } catch {
        fileAssetId = null;
      }
    }

    const revision = await dbQuery<{ id: string; created_at: Date }>(
      `
        insert into revision_requests (
          invoice_id,
          client_session_id,
          request_type,
          issue_category,
          related_section,
          priority,
          message,
          file_asset_id,
          status,
          client_name,
          whatsapp,
          raw_payload
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted', $9, $10, $11::jsonb)
        returning id, created_at
      `,
      [
        body.invoiceId,
        session.sessionId ?? null,
        body.requestType,
        body.issueCategory,
        body.relatedSection ?? null,
        body.priority,
        body.message,
        fileAssetId,
        invoice?.clientName ?? null,
        invoice?.whatsapp ?? session.whatsapp,
        JSON.stringify({
          confirmation: true,
          hasAttachment,
          attachmentSkipped,
          sessionInvoice: session.invoiceId
        })
      ]
    );
    const revisionRequestId = revision.rows[0].id;

    await logAuditEvent({
      actorType: "client",
      actorId: session.sessionId,
      entityType: "revision_request",
      entityId: revisionRequestId,
      action: "revision_request_submitted",
      metadata: {
        invoiceId: body.invoiceId,
        requestType: body.requestType,
        issueCategory: body.issueCategory,
        priority: body.priority,
        fileAttached: Boolean(fileAssetId)
      },
      request
    });

    try {
      const result = await sendClientEvent(body.invoiceId, {
        eventType: "revision_requested",
        metadata: {
          revisionRequestId,
          requestType: body.requestType,
          issueCategory: body.issueCategory,
          priority: body.priority,
          message: body.message,
        fileAssetId,
        attachmentSkipped,
        createdAt: revision.rows[0].created_at.toISOString()
      }
      });
      await dbQuery("update revision_requests set lts_event_id = $2 where id = $1", [
        revisionRequestId,
        result?.accepted ? "accepted" : "submitted"
      ]);
    } catch (error) {
      await logIntegrationEvent({
        system: "LTS",
        endpoint: "revision_requested",
        requestId: revisionRequestId,
        status: "deferred",
        errorMessage: error instanceof Error ? error.message : "LTS unavailable"
      });
    }

    await notifyRevisionRequest({
      revisionRequestId,
      invoiceId: body.invoiceId,
      requestType: body.requestType,
      issueCategory: body.issueCategory,
      relatedSection: body.relatedSection,
      priority: body.priority,
      message: body.message,
      fileAssetId,
      clientName: invoice?.clientName,
      whatsapp: invoice?.whatsapp ?? session.whatsapp,
      createdAt: revision.rows[0].created_at.toISOString(),
      adminUrl: absoluteUrl(`/admin/revisions/${revisionRequestId}`)
    });

    return apiOk(
      {
        revisionRequestId,
        fileUploadSkipped: attachmentSkipped || (hasAttachment && !fileAssetId),
        message:
          attachmentSkipped || (hasAttachment && !fileAssetId)
            ? "Your review request has been submitted. WriteX will check it against the original brief. For the attachment, please send your file directly on WhatsApp."
            : "Your review request has been submitted. WriteX will check it against the original brief and respond through the support workflow."
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
