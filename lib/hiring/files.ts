import "server-only";

import mammoth from "mammoth";
import { ApiError } from "@/lib/api/response";
import { dbQuery } from "@/lib/db";
import {
  deleteFile,
  getPrivateObjectBuffer,
  getSignedDownloadUrl
} from "@/lib/storage/s3";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function canRenderInline(mimeType: string) {
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("image/")
  );
}

function assertInlinePreviewAllowed(file: {
  mime_type: string;
  malware_scan_status: string;
}) {
  if (
    file.malware_scan_status === "blocked" ||
    file.malware_scan_status === "failed"
  ) {
    throw new ApiError(
      409,
      "BAD_REQUEST",
      "This file cannot be previewed because its security review did not pass."
    );
  }

  if (!canRenderInline(file.mime_type)) {
    throw new ApiError(
      415,
      "BAD_REQUEST",
      "In-page preview is unavailable for this file type. Use the audited private-open action instead."
    );
  }
}

async function fileRow(fileId: string) {
  const result = await dbQuery<{
    id: string;
    application_id: string;
    s3_key: string;
    safe_file_name: string;
    file_type: string;
    mime_type: string;
    malware_scan_status: string;
    revoked_at: Date | null;
    deleted_at: Date | null;
    legal_hold: boolean;
  }>(
    `select f.id,f.application_id,f.s3_key,f.safe_file_name,f.file_type,
            f.mime_type,f.malware_scan_status,f.revoked_at,f.deleted_at,a.legal_hold
     from hiring_candidate_files f
     join hiring_applications a on a.id=f.application_id
     where f.id=$1 limit 1`,
    [fileId]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "NOT_FOUND", "Candidate file was not found.");
  }

  return result.rows[0];
}

async function audit(
  file: { id: string; application_id: string },
  adminUserId: string,
  action: string,
  reason: string
) {
  await dbQuery(
    "insert into hiring_candidate_file_access_audit(candidate_file_id,admin_user_id,action,reason) values($1,$2,$3,$4)",
    [file.id, adminUserId, action, reason]
  );
  await dbQuery(
    "insert into hiring_audit_logs(application_id,actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata) values($1,'admin',$2,$3,'candidate_file',$4,$5::jsonb)",
    [
      file.application_id,
      adminUserId,
      `candidate_file_${action}`,
      file.id,
      JSON.stringify({ reason })
    ]
  );
}

export async function createCandidateFileAccess(
  fileId: string,
  adminUserId: string,
  reason: string
) {
  const file = await fileRow(fileId);
  if (file.revoked_at || file.deleted_at) {
    throw new ApiError(410, "NOT_FOUND", "Candidate file is no longer available.");
  }

  const url = await getSignedDownloadUrl(file.s3_key, 180);
  await audit(file, adminUserId, "signed_retrieval", reason);
  return { url, expiresInSeconds: 180, fileName: file.safe_file_name };
}

export async function createCandidateFilePreview(
  fileId: string,
  adminUserId: string,
  reason: string
) {
  const file = await fileRow(fileId);
  if (file.revoked_at || file.deleted_at) {
    throw new ApiError(410, "NOT_FOUND", "Candidate file is no longer available.");
  }

  if (file.mime_type === DOCX_MIME) {
    const buffer = await getPrivateObjectBuffer(file.s3_key, 10 * 1024 * 1024);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.replace(/\u0000/g, "").trim().slice(0, 200_000);
    if (!text) {
      throw new ApiError(
        422,
        "BAD_REQUEST",
        "This document does not contain readable preview text."
      );
    }

    await audit(file, adminUserId, "previewed", reason);
    return {
      previewKind: "text" as const,
      text,
      fileName: file.safe_file_name,
      mimeType: file.mime_type
    };
  }

  assertInlinePreviewAllowed(file);
  return {
    previewKind: "url" as const,
    url: `/api/admin/hiring/files/${encodeURIComponent(file.id)}/preview`,
    fileName: file.safe_file_name,
    mimeType: file.mime_type
  };
}

export async function getCandidateFileInlinePreview(
  fileId: string,
  adminUserId: string,
  reason: string
) {
  const file = await fileRow(fileId);
  if (file.revoked_at || file.deleted_at) {
    throw new ApiError(410, "NOT_FOUND", "Candidate file is no longer available.");
  }

  assertInlinePreviewAllowed(file);
  const buffer = await getPrivateObjectBuffer(file.s3_key, 10 * 1024 * 1024);
  await audit(file, adminUserId, "previewed", reason);

  return {
    buffer,
    fileName: file.safe_file_name,
    mimeType: file.mime_type
  };
}

export async function revokeCandidateFile(
  fileId: string,
  adminUserId: string,
  reason: string
) {
  const file = await fileRow(fileId);
  await dbQuery(
    "update hiring_candidate_files set revoked_at=coalesce(revoked_at,now()) where id=$1",
    [file.id]
  );
  await audit(file, adminUserId, "revoked", reason);
  return { revoked: true };
}

export async function deleteCandidateFile(
  fileId: string,
  adminUserId: string,
  reason: string
) {
  const file = await fileRow(fileId);
  if (file.legal_hold) {
    throw new ApiError(
      409,
      "BAD_REQUEST",
      "Deletion is blocked by a documented legal hold."
    );
  }
  if (!file.deleted_at) await deleteFile(file.s3_key);
  await dbQuery(
    "update hiring_candidate_files set deleted_at=coalesce(deleted_at,now()),revoked_at=coalesce(revoked_at,now()) where id=$1",
    [file.id]
  );
  await audit(file, adminUserId, "deleted", reason);
  return { deleted: true };
}

export async function getCandidateFileType(fileId: string) {
  return (await fileRow(fileId)).file_type;
}
