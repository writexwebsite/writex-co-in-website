import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { apiError, badRequest, notConfigured } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertNotTestClientRequest } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { isEmailConfigured } from "@/lib/notifications";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  hashValue
} from "@/lib/security";
import { isStorageConfigured } from "@/lib/storage/s3";
import {
  applyTrustHeaders,
  trustJson
} from "@/lib/trust/api-response";
import {
  buildSuspiciousReportSubmissionKey,
  createSuspiciousReport,
  maskTrustIdentifier,
  notifySuspiciousReport,
  suspiciousReportSchema,
  validateSuspiciousEvidence
} from "@/lib/trust/reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  try {
    assertSameOrigin(request);
    await assertNotTestClientRequest(request);
    const context = getRequestContext(request);
    const fingerprint = hashValue(`${context.ipAddress}:${context.userAgent}`);
    assertRateLimit({
      key: `trust-report:${fingerprint}`,
      limit: 4,
      windowSeconds: 60 * 60
    });
    assertRateLimit({
      key: `trust-report-ip:${hashValue(context.ipAddress)}`,
      limit: 10,
      windowSeconds: 60 * 60
    });

    if (process.env.TRUST_REPORTING_ENABLED !== "true") {
      throw notConfigured(
        "Secure reporting is temporarily unavailable. Please email business@writex.co.in."
      );
    }
    if (!isDatabaseConfigured()) {
      throw notConfigured(
        "Secure reporting is temporarily unavailable. Please email business@writex.co.in."
      );
    }
    if (!isEmailConfigured()) {
      throw notConfigured(
        "Secure reporting is temporarily unavailable. Please email business@writex.co.in."
      );
    }

    const formData = await request.formData();
    const parsed = suspiciousReportSchema.safeParse({
      reportType: String(formData.get("reportType") || ""),
      identifier: String(formData.get("identifier") || ""),
      relatedReference:
        String(formData.get("relatedReference") || "") || undefined,
      description: String(formData.get("description") || ""),
      customerEmail: String(formData.get("customerEmail") || ""),
      customerMobile:
        String(formData.get("customerMobile") || "") || undefined,
      website: String(formData.get("website") || "") || undefined
    });
    if (!parsed.success || parsed.data.website) {
      throw badRequest("Check the report details and try again.");
    }

    const evidenceValue = formData.get("evidence");
    const evidence =
      evidenceValue instanceof File && evidenceValue.size > 0
        ? await (async () => {
            if (!isStorageConfigured()) {
              throw notConfigured(
                "Secure evidence upload is temporarily unavailable. Submit the report without an attachment or email business@writex.co.in."
              );
            }
            return validateSuspiciousEvidence(evidenceValue);
          })()
        : undefined;
    const submissionKey = buildSuspiciousReportSubmissionKey(
      parsed.data,
      request.headers.get("idempotency-key")
    );
    const stored = await createSuspiciousReport({
      input: parsed.data,
      evidence,
      submissionKey,
      correlationId
    });

    let notificationSent = true;
    if (!stored.duplicate) {
      const notification = await notifySuspiciousReport({
        reportId: stored.id,
        reportReference: stored.report_reference,
        input: parsed.data,
        hasEvidence: Boolean(evidence)
      });
      notificationSent = notification.sent;

      await logAuditEvent({
        actorType: "system",
        entityType: "trust_suspicious_report",
        entityId: stored.id,
        action: "trust_suspicious_report_received",
        metadata: {
          reportReference: stored.report_reference,
          reportType: parsed.data.reportType,
          maskedIdentifier: maskTrustIdentifier(parsed.data.identifier),
          hasEvidence: Boolean(evidence),
          notificationSent,
          correlationId
        },
        request
      });
    }

    return trustJson(
      {
        received: true,
        referenceId: stored.report_reference,
        duplicateSuppressed: stored.duplicate,
        notificationAccepted: notificationSent,
        correlationId
      },
      { status: stored.duplicate ? 200 : 201, correlationId }
    );
  } catch (error) {
    return applyTrustHeaders(apiError(error), correlationId);
  }
}
