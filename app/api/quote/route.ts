import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getQuoteFileAsset,
  insertQuoteLead,
  isDatabaseConfigured,
  linkFileAssetToQuoteLead
} from "@/lib/db";
import {
  notifyNewLead,
  notifyQuoteAcknowledgement
} from "@/lib/notifications";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assignLeadAutomatically } from "@/lib/crm/leadAssignment";
import { scoreLead } from "@/lib/crm/leadScoring";
import { deriveSourceChannel } from "@/lib/revenue/attribution";
import { assertRateLimit, getRequestContext } from "@/lib/security";
import { quoteLeadApiSchema } from "@/lib/validation";
import { getDemoClientSessionFromRequest, getDemoEmployeeSessionFromRequest } from "@/lib/demo/session";
import { getSubmissionKey, runSubmissionOnce } from "@/lib/submission-idempotency";
import { assertNotTestClientRequest } from "@/lib/auth";

export const runtime = "nodejs";

const fallbackMessage =
  "We could not submit the form right now. Please send your details on WhatsApp.";
const successMessage =
  "Your quote request has been received.";

function failureResponse(message = fallbackMessage, status = 500, errors?: unknown) {
  return NextResponse.json(
    {
      success: false,
      fallback: "whatsapp",
      message,
      ...(errors ? { errors } : {})
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  if (getDemoClientSessionFromRequest(request) || getDemoEmployeeSessionFromRequest(request)) return failureResponse("This action is disabled in demo mode.", 403);
  try {
    await assertNotTestClientRequest(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `quote:${context.ipAddress}`,
      limit: 20,
      windowSeconds: 300
    });

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return failureResponse("Request body must be valid JSON.", 400);
    }

    const parsed = quoteLeadApiSchema.safeParse(json);
    if (!parsed.success) {
      return failureResponse(
        "Please check the required quote fields and try again.",
        400,
        z.flattenError(parsed.error).fieldErrors
      );
    }

    const body = parsed.data;
    const submissionKey = getSubmissionKey(request, "quote", body);

    if (!isDatabaseConfigured()) {
      return failureResponse(fallbackMessage, 503);
    }

    const uploadedFileAsset = body.uploadedFileAssetId
      ? await getQuoteFileAsset(body.uploadedFileAssetId)
      : null;

    if (body.uploadedFileAssetId && !uploadedFileAsset) {
      return failureResponse("Uploaded file reference is invalid.", 400);
    }

    const score = scoreLead({
      serviceRequired: body.serviceRequired,
      urgency: body.urgency,
      wordCount: body.wordCount,
      country: body.country,
      instructions: body.instructions,
      uploadedFileAssetId: uploadedFileAsset?.id ?? body.uploadedFileAssetId,
      whatsapp: body.whatsapp,
      email: body.email
    });
    const sourceChannel = deriveSourceChannel({
      source: body.source,
      utm_source: body.utmSource,
      utm_medium: body.utmMedium,
      referrer: body.referrer
    });

    const lead = await insertQuoteLead({
      name: body.name,
      email: body.email,
      whatsapp: body.whatsapp,
      country: body.country,
      serviceRequired: body.serviceRequired,
      academicLevel: body.academicLevel,
      subject: body.subject,
      wordCount: body.wordCount,
      deadline: body.deadline,
      instructions: body.instructions,
      documentCondition: body.documentCondition,
      referencingStyle: body.referencingStyle,
      urgency: body.urgency,
      rubricAvailable: body.rubricAvailable,
      draftAvailable: body.draftAvailable,
      supervisorCommentsAvailable: body.supervisorCommentsAvailable,
      fileName: body.fileName,
      fileSize: body.fileSize,
      fileType: body.fileType,
      uploadedFileAssetId: body.uploadedFileAssetId,
      leadIntelligence: {
        ...(body.leadIntelligence || {}),
        score: score.score,
        scoreReasons: score.reasons
      },
      source: body.source,
      leadQuality: score.quality,
      pagePath: body.pagePath,
      landingPage: body.landingPage,
      referrer: body.referrer,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmTerm: body.utmTerm,
      utmContent: body.utmContent,
      deviceType: body.deviceType,
      sourceChannel,
      submissionKey
    });

    if (!lead.created) {
      return NextResponse.json(
        {
          success: true,
          leadId: lead.id,
          message: successMessage,
          duplicateSuppressed: true,
          notification: {
            sent: false,
            reason: "duplicate_suppressed"
          }
        },
        { status: 200 }
      );
    }

    if (body.uploadedFileAssetId) {
      await linkFileAssetToQuoteLead({
        fileAssetId: body.uploadedFileAssetId,
        quoteLeadId: lead.id
      });
    }

    await assignLeadAutomatically({ id: lead.id });
    await logAuditEvent({
      actorType: "system",
      entityType: "quote_lead",
      entityId: lead.id,
      action: "quote_lead_created",
      metadata: {
        source: body.source,
        sourceChannel,
        leadQuality: score.quality
      },
      request
    });

    let notification:
      | Awaited<ReturnType<typeof notifyNewLead>>
      | { sent: false; reason: string } = {
      sent: false,
      reason: "not_attempted"
    };

    try {
      const quoteNotification = {
        leadId: lead.id,
        name: body.name,
        email: body.email,
        whatsapp: body.whatsapp,
        country: body.country,
        serviceRequired: body.serviceRequired,
        academicLevel: body.academicLevel,
        subject: body.subject,
        wordCount: body.wordCount,
        deadline: body.deadline,
        instructions: body.instructions,
        source: body.source,
        createdAt: new Date(lead.created_at).toISOString(),
        uploadedFileName: uploadedFileAsset?.file_name ?? body.fileName,
        fileAssetId: uploadedFileAsset?.id
      };
      const submission = await runSubmissionOnce({
        key: getSubmissionKey(request, "quote-notifications", body),
        task: async () => {
          const internal = await notifyNewLead(quoteNotification);
          let acknowledgement: Awaited<ReturnType<typeof notifyQuoteAcknowledgement>> = {
            sent: false,
            reason: "not_attempted"
          };

          try {
            acknowledgement = await notifyQuoteAcknowledgement(quoteNotification);
          } catch {
            console.error("Quote acknowledgement failed", {
              leadId: lead.id,
              code: "SMTP_ACKNOWLEDGEMENT_FAILED"
            });
          }

          console.info("Quote email delivery completed", {
            leadId: lead.id,
            internalMessageId: "messageId" in internal ? internal.messageId : undefined,
            acknowledgementMessageId:
              "messageId" in acknowledgement ? acknowledgement.messageId : undefined
          });

          return internal;
        }
      });
      notification = submission.value;
    } catch (error) {
      console.error("Quote lead notification failed", {
        leadId: lead.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      notification = {
        sent: false,
        reason: "notification_failed"
      };
    }

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        message: successMessage,
        notification: {
          sent: notification.sent,
          reason: "reason" in notification ? notification.reason : undefined
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Quote lead submission failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return failureResponse();
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Method not allowed."
    },
    { status: 405 }
  );
}
