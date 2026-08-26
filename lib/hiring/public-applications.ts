import "server-only";

import { randomUUID } from "crypto";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { ApiError } from "@/lib/api/response";
import {
  encryptHiringReviewValue,
  hashHiringSignal
} from "@/lib/hiring/candidate-disclosure";
import { publicHiringStages, type HiringStage } from "@/lib/hiring/domain";
import { hiringApplicationSchema, type HiringApplicationInput } from "@/lib/hiring/application-schema";
import { uploadFile, deleteFile, isStorageConfigured } from "@/lib/storage/s3";
import { hasSupportedHiringFileSignature } from "@/lib/hiring/file-signatures";
import { deliverNewApplicationNotifications } from "@/lib/hiring/application-notifications";

export { hiringApplicationSchema };

export type ValidatedHiringFile = {
  file: File;
  type: "cv" | "writing_sample" | "voice_introduction";
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm"
]);

export function validateHiringFile(file: File, type: ValidatedHiringFile["type"]) {
  const limit = type === "voice_introduction" ? 12 : 10;
  if (!allowedMimeTypes.has(file.type)) {
    throw new ApiError(400, "BAD_REQUEST", "Upload a supported PDF, DOCX, MP3, M4A or WebM file.");
  }
  if (file.size <= 0 || file.size > limit * 1024 * 1024) {
    throw new ApiError(400, "BAD_REQUEST", `The ${type.replace("_", " ")} must be ${limit} MB or smaller.`);
  }
  return { file, type } satisfies ValidatedHiringFile;
}

function applicationReference() {
  return `WX-HR-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export async function createHiringApplication({
  input,
  files,
  ipAddress,
  userAgent,
  submissionKeyHash,
  correlationId
}: {
  input: HiringApplicationInput;
  files: ValidatedHiringFile[];
  ipAddress: string;
  userAgent: string;
  submissionKeyHash: string;
  correlationId: string;
}) {
  if (!isStorageConfigured()) {
    throw new ApiError(503, "NOT_CONFIGURED", "Applications are temporarily unavailable.");
  }
  const reference = applicationReference();
  const candidateReference = `CAND-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const emailHash = hashHiringSignal("candidate_email", input.email);
  const mobileHash = hashHiringSignal("candidate_mobile", input.mobile.replace(/\D/g, ""));
  const piiEncrypted = encryptHiringReviewValue(JSON.stringify({
    fullName: input.fullName,
    email: input.email,
    mobile: input.mobile
  }));
  const uploaded: Array<Awaited<ReturnType<typeof uploadFile>> & { type: ValidatedHiringFile["type"] }> = [];

  const existing = await dbQuery<{ id: string; application_reference: string }>(
    "select id, application_reference from hiring_applications where submission_key_hash=$1 limit 1",
    [submissionKeyHash]
  );
  if (existing.rows[0]) {
    return { applicationId: existing.rows[0].id, reference: existing.rows[0].application_reference };
  }

  let applicationId: string | null = null;
  try {
    for (const item of files) {
      const buffer = Buffer.from(await item.file.arrayBuffer());
      if (!hasSupportedHiringFileSignature(buffer, item.file.type)) {
        throw new ApiError(400, "BAD_REQUEST", "The uploaded file content does not match its declared format.");
      }
      const stored = await uploadFile({
        buffer,
        fileName: item.file.name,
        mimeType: item.file.type,
        assetType: item.type === "voice_introduction" ? "hiring_voice_file" : "hiring_candidate_file",
        invoiceId: reference
      });
      uploaded.push({ ...stored, type: item.type });
    }

    applicationId = await withDbTransaction(async (query) => {
      const candidate = await query<{ id: string }>(
        `insert into hiring_candidates (
           candidate_reference, application_role, department,
           application_status, applied_at
         ) values ($1, $2, $3, 'applied', now()) returning id`,
        [candidateReference, input.role, input.role === "sales_executive" ? "Sales" : "Academic"]
      );
      const application = await query<{ id: string }>(
        `insert into hiring_applications (
           candidate_id, application_reference, role_key, pii_encrypted,
           email_hash, mobile_hash, city, application_payload,
           consent_version, consented_at, submission_key_hash,
           retention_state, retention_review_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'v2',now(),$9,'active_candidate',now()+interval '180 days') returning id`,
        [
          candidate[0].id,
          reference,
          input.role,
          piiEncrypted,
          emailHash,
          mobileHash,
          input.city,
          JSON.stringify({
            qualification: input.qualification,
            experience: input.experience,
            availability: input.availability,
            compensation: input.compensation,
            noticePeriod: input.noticePeriod,
            workMode: input.workMode,
            roleDetails: input.roleDetails,
            aiUsageDisclosure: input.aiUsageDisclosure || null
          }),
          submissionKeyHash
        ]
      );
      await query(
        `insert into hiring_application_status_history (
           application_id, previous_stage, new_stage, changed_by_type, reason
         ) values ($1, null, 'application_received', 'candidate', 'application_submitted')`,
        [application[0].id]
      );
      await query(
        `insert into hiring_candidate_consents (
           application_id,consent_type,policy_version,granted,granted_at,safe_metadata
         ) values
           ($1,'application_processing','hiring-privacy-v2',true,now(),'{}'::jsonb),
           ($1,'assessment_monitoring','hiring-privacy-v2',true,now(),'{}'::jsonb),
           ($1,'candidate_declaration','hiring-privacy-v2',true,now(),'{}'::jsonb)
         on conflict (application_id,consent_type,policy_version) do nothing`,
        [application[0].id]
      );
      await query(
        `insert into hiring_retention_queue (
           application_id,retention_category,review_due_at,status
         ) values ($1,'active_candidate',now()+interval '180 days','scheduled')
         on conflict (application_id) do nothing`,
        [application[0].id]
      );
      await query(
        `insert into hiring_candidate_disclosures (
           candidate_id, knows_applicant_or_employee,
           related_person_name_encrypted, relationship_type, related_role,
           disclosure_details_encrypted, encryption_version
         ) values ($1,$2,$3,$4,$5,$6,'v1')`,
        [
          candidate[0].id,
          input.relationship.knowsApplicantOrEmployee,
          input.relationship.name ? encryptHiringReviewValue(input.relationship.name) : null,
          input.relationship.relationship || null,
          input.relationship.role || null,
          input.relationship.disclosureDetails
            ? encryptHiringReviewValue(input.relationship.disclosureDetails)
            : null
        ]
      );
      for (const file of uploaded) {
        await query(
          `insert into hiring_candidate_files (
             application_id, file_type, s3_key, safe_file_name,
             mime_type, file_size, malware_scan_status
           ) values ($1,$2,$3,$4,$5,$6,$7)`,
          [
            application[0].id,
            file.type,
            file.s3Key,
            file.fileName,
            file.mimeType,
            file.fileSize,
            "pending"
          ]
        );
      }
      await query(
        `insert into hiring_candidate_identifiers (
           candidate_id, signal_type, value_hash, safe_metadata, expires_at
         ) values
           ($1,'ip',$2,'{}'::jsonb,now() + interval '180 days'),
           ($1,'browser_device_profile',$3,'{}'::jsonb,now() + interval '180 days')`,
        [candidate[0].id, hashHiringSignal("ip", ipAddress), hashHiringSignal("user_agent", userAgent)]
      );
      await query(
        `insert into hiring_audit_logs (
           application_id, actor_type, action, entity_type,
           entity_reference, safe_metadata
         ) values ($1,'candidate','application_submitted','application',$2,$3::jsonb)`,
        [
          application[0].id,
          reference,
          JSON.stringify({
            role: input.role,
            fileCount: uploaded.length,
            activityLabel: "New application received"
          })
        ]
      );
      return application[0].id;
    });
  } catch (error) {
    if (!applicationId) {
      await Promise.allSettled(uploaded.map((file) => deleteFile(file.s3Key)));
    }
    throw error;
  }
  if (!applicationId) {
    throw new ApiError(500, "SERVER_ERROR", "The application could not be stored.");
  }
  await deliverNewApplicationNotifications({
    applicationId,
    applicationReference: reference,
    candidateName: input.fullName,
    candidateEmail: input.email,
    role: input.role,
    submittedAt: new Date().toISOString(),
    correlationId
  });
  return { applicationId, reference };
}

export async function getPublicApplicationStatus({
  applicationReference,
  contact
}: {
  applicationReference: string;
  contact: string;
}) {
  const normalizedReference = applicationReference.trim().toUpperCase();
  const contactHash = contact.includes("@")
    ? hashHiringSignal("candidate_email", contact.toLowerCase())
    : hashHiringSignal("candidate_mobile", contact.replace(/\D/g, ""));
  const result = await dbQuery<{
    current_stage: HiringStage;
    submitted_at: Date;
    updated_at: Date;
    verification_status: string | null;
  }>(
    `select a.current_stage, a.submitted_at, a.updated_at,
       (select v.status from hiring_verification_cases v
        where v.application_id=a.id order by v.updated_at desc limit 1) as verification_status
     from hiring_applications a
     where a.application_reference = $1
       and (a.email_hash = $2 or a.mobile_hash = $2)
     limit 1`,
    [normalizedReference, contactHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  const verificationLabels: Record<string, string> = {
    additional_documents_required: "Additional documents required",
    documents_requested: "Additional documents required",
    documents_received: "Documents received",
    pending_review: "Documents received",
    in_progress: "Verification in progress",
    under_review: "Verification in progress",
    completed: "Verification completed",
    approved: "Verification completed",
    approved_for_hiring: "Verification completed",
    approved_with_conditions: "Verification completed"
  };
  return {
    applicationReference: normalizedReference,
    status:
      (row.verification_status && verificationLabels[row.verification_status]) ||
      publicHiringStages[row.current_stage],
    receivedAt: row.submitted_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
