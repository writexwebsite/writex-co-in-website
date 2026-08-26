import "server-only";

import { badRequest } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { sendInternalEmail } from "@/lib/notifications";
import { scanUploadForMalware } from "@/lib/storage/malware";
import {
  deleteFileFromS3,
  sanitizeFileName,
  uploadFileToS3
} from "@/lib/storage/s3";
import { createFraudReportReferenceValue } from "@/lib/trust/verification-references";
import {
  type SuspiciousReportInput,
  buildSuspiciousReportSubmissionKey,
  maskTrustIdentifier,
  suspiciousReportSchema,
  suspiciousReportTypes
} from "@/lib/trust/reporting-validation";

export {
  buildSuspiciousReportSubmissionKey,
  maskTrustIdentifier,
  suspiciousReportSchema,
  suspiciousReportTypes
};

const allowedEvidenceTypes: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"]
};

function evidenceLimitBytes() {
  return Math.max(
    1,
    Number(process.env.TRUST_REPORT_MAX_FILE_MB || 10)
  ) * 1024 * 1024;
}

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function startsWith(buffer: Buffer, ...bytes: number[]) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function assertEvidenceSignature(buffer: Buffer, extension: string) {
  const valid =
    extension === "pdf"
      ? buffer.subarray(0, 5).toString("ascii") === "%PDF-"
      : extension === "png"
        ? startsWith(buffer, 0x89, 0x50, 0x4e, 0x47)
        : extension === "webp"
          ? buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
            buffer.subarray(8, 12).toString("ascii") === "WEBP"
          : ["jpg", "jpeg"].includes(extension)
            ? startsWith(buffer, 0xff, 0xd8, 0xff)
            : false;

  if (!valid) {
    throw badRequest("The evidence file content does not match its extension.");
  }
}

export async function validateSuspiciousEvidence(file: File) {
  const extension = fileExtension(file.name);
  const allowedMimes = allowedEvidenceTypes[extension];

  if (!allowedMimes) {
    throw badRequest("Evidence must be a PDF, PNG, JPG, or WebP file.");
  }
  if (file.size <= 0 || file.size > evidenceLimitBytes()) {
    throw badRequest(
      `Evidence must be between 1 byte and ${process.env.TRUST_REPORT_MAX_FILE_MB || 10} MB.`
    );
  }

  const mimeType = file.type || allowedMimes[0];
  if (!allowedMimes.includes(mimeType)) {
    throw badRequest("The evidence file MIME type is not allowed.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  assertEvidenceSignature(buffer, extension);
  await scanUploadForMalware(buffer, file.name);

  return { buffer, mimeType, fileName: sanitizeFileName(file.name) };
}

type StoredReport = {
  id: string;
  report_reference: string;
  duplicate: boolean;
};

export async function createSuspiciousReport({
  input,
  evidence,
  submissionKey,
  correlationId
}: {
  input: SuspiciousReportInput;
  evidence?: Awaited<ReturnType<typeof validateSuspiciousEvidence>>;
  submissionKey: string;
  correlationId: string;
}) {
  let uploadedS3Key: string | null = null;

  try {
    const uploaded = evidence
      ? await uploadFileToS3(evidence.buffer, {
          fileName: evidence.fileName,
          mimeType: evidence.mimeType,
          assetType: "trust_report_evidence"
        })
      : null;
    uploadedS3Key = uploaded?.s3Key ?? null;

    const stored = await withDbTransaction<StoredReport>(async (query) => {
      await query(
        "select pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`trust-report:${submissionKey}`]
      );

      const existing = await query<{
        id: string;
        report_reference: string;
      }>(
        `
          select id, report_reference
          from trust_suspicious_reports
          where submission_key = $1
          limit 1
        `,
        [submissionKey]
      );
      if (existing[0]) return { ...existing[0], duplicate: true };

      let evidenceFileAssetId: string | null = null;
      if (uploaded) {
        const fileAsset = await query<{ id: string }>(
          `
            insert into file_assets (
              asset_type, s3_key, file_name, mime_type, file_size, uploaded_by
            )
            values ('trust_report_evidence', $1, $2, $3, $4, 'public_trust_report')
            returning id
          `,
          [
            uploaded.s3Key,
            uploaded.fileName,
            uploaded.mimeType,
            uploaded.fileSize
          ]
        );
        evidenceFileAssetId = fileAsset[0].id;
      }

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const reportReference = createFraudReportReferenceValue();
        const created = await query<{
          id: string;
          report_reference: string;
        }>(
          `
            insert into trust_suspicious_reports (
              report_reference,
              report_type,
              reported_identifier,
              related_reference,
              description,
              evidence_file_asset_id,
              customer_email,
              customer_mobile,
              correlation_id,
              submission_key
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            on conflict (report_reference) do nothing
            returning id, report_reference
          `,
          [
            reportReference,
            input.reportType,
            input.identifier,
            input.relatedReference || null,
            input.description,
            evidenceFileAssetId,
            input.customerEmail,
            input.customerMobile || null,
            correlationId,
            submissionKey
          ]
        );
        if (created[0]) return { ...created[0], duplicate: false };
      }

      throw new Error("A suspicious-report reference could not be generated.");
    });

    if (stored.duplicate && uploadedS3Key) {
      await deleteFileFromS3(uploadedS3Key).catch(() => undefined);
    }

    return stored;
  } catch (error) {
    if (uploadedS3Key) {
      await deleteFileFromS3(uploadedS3Key).catch(() => undefined);
    }
    throw error;
  }
}

export async function notifySuspiciousReport({
  reportId,
  reportReference,
  input,
  hasEvidence
}: {
  reportId: string;
  reportReference: string;
  input: SuspiciousReportInput;
  hasEvidence: boolean;
}) {
  const recipients =
    process.env.TRUST_REPORT_NOTIFICATION_EMAILS ||
    "business@writex.co.in,info@writex.co.in";
  const adminBaseUrl =
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.writex.co.in";

  try {
    const result = await sendInternalEmail({
      to: recipients,
      replyTo: input.customerEmail,
      subject: `WriteX Trust Centre report - ${reportReference}`,
      text: [
        `Reference: ${reportReference}`,
        `Report type: ${input.reportType}`,
        `Identifier involved: ${input.identifier}`,
        `Invoice/enquiry reference: ${input.relatedReference || "Not provided"}`,
        `Customer email: ${input.customerEmail}`,
        `Customer mobile: ${input.customerMobile || "Not provided"}`,
        `Private evidence attached to case: ${hasEvidence ? "Yes" : "No"}`,
        `Admin queue: ${adminBaseUrl}/admin/trust-centre`,
        "",
        "Description:",
        input.description,
        "",
        "Any evidence is private. Use protected admin signed access only."
      ].join("\n")
    });

    await dbQuery(
      `
        update trust_suspicious_reports
        set notification_status = $2,
            notification_message_id = $3,
            updated_at = now()
        where id = $1
      `,
      [
        reportId,
        result.sent ? "sent" : "failed",
        "messageId" in result ? result.messageId : null
      ]
    );

    return result;
  } catch {
    await dbQuery(
      `
        update trust_suspicious_reports
        set notification_status = 'failed', updated_at = now()
        where id = $1
      `,
      [reportId]
    ).catch(() => undefined);
    return { sent: false, reason: "notification_failed" };
  }
}
