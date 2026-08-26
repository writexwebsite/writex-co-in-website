import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "@/lib/api/response";
import { dbQuery } from "@/lib/db";
import {
  getS3Runtime,
  isS3RuntimeConfigured
} from "@/lib/storage/s3-config";

export type FileAssetType =
  | "quote_brief"
  | "rubric"
  | "draft"
  | "sop_prompt"
  | "dissertation_chapter"
  | "payment_proof"
  | "preview"
  | "final_delivery"
  | "revision_attachment"
  | "trust_report_evidence"
  | "hiring_candidate_file"
  | "hiring_assessment_file"
  | "hiring_verification_file"
  | "hiring_voice_file"
  | "hiring_interview_file"
  | "holiday_theme_asset"
  | "festival_pack_zip"
  | "other";

type UploadFileInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  assetType: FileAssetType;
  invoiceId?: string;
  quoteLeadId?: string;
  holidayAssetRole?: string;
};

type BuildS3KeyInput = {
  type: FileAssetType;
  quoteLeadId?: string;
  invoiceId?: string;
  fileName: string;
  holidayAssetRole?: string;
};

const quoteAssetFolders: Partial<Record<FileAssetType, string>> = {
  quote_brief: "briefs",
  rubric: "rubrics",
  draft: "drafts",
  sop_prompt: "sop-prompts",
  dissertation_chapter: "dissertation-chapters",
  other: "other"
};

export function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 140);

  return sanitized || "file";
}

export function buildS3Key({
  type,
  quoteLeadId,
  invoiceId,
  fileName,
  holidayAssetRole
}: BuildS3KeyInput) {
  const privatePrefix = getS3Runtime().privatePrefix;
  const safeFileName = `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;

  if (type === "payment_proof") {
    return `${privatePrefix}/payment-proofs/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "preview") {
    return `${privatePrefix}/previews/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "final_delivery") {
    return `${privatePrefix}/final-deliveries/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "revision_attachment") {
    return `${privatePrefix}/revision-requests/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "trust_report_evidence") {
    return `${privatePrefix}/trust-centre/reports/${safeFileName}`;
  }

  if (type === "hiring_candidate_file") {
    return `${privatePrefix}/hiring/candidates/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "hiring_assessment_file") {
    return `${privatePrefix}/hiring/assessments/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "hiring_verification_file") {
    return `${privatePrefix}/hiring/verification/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "hiring_voice_file") {
    return `${privatePrefix}/hiring/voice/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "hiring_interview_file") {
    return `${privatePrefix}/hiring/interviews/${invoiceId || "pending"}/${safeFileName}`;
  }

  if (type === "holiday_theme_asset") {
    const holidayFolder =
      holidayAssetRole === "audio"
        ? "audio"
        : holidayAssetRole === "axo" || holidayAssetRole === "axo_animation"
          ? "axo"
          : holidayAssetRole?.startsWith("login_") ||
              holidayAssetRole === "mobile_fallback" ||
              holidayAssetRole === "reduced_motion"
            ? "login"
            : holidayAssetRole === "decorative_overlay" ||
                holidayAssetRole === "particle_overlay" ||
                holidayAssetRole === "logo_overlay" ||
                holidayAssetRole === "header" ||
                holidayAssetRole === "supporting"
              ? "decorations"
              : "themes";
    return `${privatePrefix}/writex/holiday/${holidayFolder}/${invoiceId || "unassigned"}/${safeFileName}`;
  }

  if (type === "festival_pack_zip") {
    return `${privatePrefix}/writex/holiday/packs/${invoiceId || "unassigned"}/${safeFileName}`;
  }

  const folder = quoteAssetFolders[type] || "other";
  const owner = quoteLeadId || `pending/${crypto.randomUUID()}`;

  return `${privatePrefix}/quote-leads/${owner}/${folder}/${safeFileName}`;
}

export function isStorageConfigured() {
  return isS3RuntimeConfigured();
}

export async function uploadFileToS3(
  fileBuffer: Buffer,
  options: Omit<UploadFileInput, "buffer">
) {
  const s3Key = buildS3Key({
    type: options.assetType,
    quoteLeadId: options.quoteLeadId,
    invoiceId: options.invoiceId,
    holidayAssetRole: options.holidayAssetRole,
    fileName: options.fileName
  });

  const { client, bucket } = getS3Runtime();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: options.mimeType,
      ServerSideEncryption: "AES256"
    })
  );

  return {
    s3Key,
    fileName: sanitizeFileName(options.fileName),
    mimeType: options.mimeType,
    fileSize: fileBuffer.byteLength
  };
}

export async function uploadFile(input: UploadFileInput) {
  return uploadFileToS3(input.buffer, {
    fileName: input.fileName,
    mimeType: input.mimeType,
    assetType: input.assetType,
    invoiceId: input.invoiceId,
    quoteLeadId: input.quoteLeadId,
    holidayAssetRole: input.holidayAssetRole
  });
}

export async function getSignedPreviewUrl(
  s3Key: string,
  expiresInSeconds = 300,
  options: { fileName?: string; mimeType?: string } = {}
) {
  const { client, bucket } = getS3Runtime();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ResponseContentDisposition: options.fileName
        ? `inline; filename="${sanitizeFileName(options.fileName)}"`
        : "inline",
      ResponseContentType: options.mimeType
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function getSignedDownloadUrl(
  s3Key: string,
  expiresInSeconds = 300
) {
  return getSignedPreviewUrl(s3Key, expiresInSeconds);
}

export async function getPrivateObjectBuffer(
  s3Key: string,
  maxBytes = 10 * 1024 * 1024
) {
  const { client, bucket } = getS3Runtime();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key
    })
  );

  if ((response.ContentLength || 0) > maxBytes) {
    throw new ApiError(413, "BAD_REQUEST", "This file is too large to preview.");
  }

  if (!response.Body) {
    throw new ApiError(404, "NOT_FOUND", "The private file could not be read.");
  }

  const bytes = await response.Body.transformToByteArray();
  if (bytes.byteLength > maxBytes) {
    throw new ApiError(413, "BAD_REQUEST", "This file is too large to preview.");
  }

  return Buffer.from(bytes);
}

export async function getPrivateObjectMetadata(s3Key: string) {
  const { client, bucket } = getS3Runtime();
  const response = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: s3Key
    })
  );
  return {
    contentLength: Number(response.ContentLength || 0),
    contentType: response.ContentType || null,
    etag: response.ETag || null,
    lastModified: response.LastModified || null
  };
}

export async function putPrivateObjectAtKey({
  s3Key,
  buffer,
  mimeType
}: {
  s3Key: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const { client, bucket } = getS3Runtime();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: "AES256"
    })
  );
}

export async function deleteFileFromS3(s3Key: string) {
  const { client, bucket } = getS3Runtime();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: s3Key
    })
  );
}

export async function deleteFile(s3Key: string) {
  return deleteFileFromS3(s3Key);
}

export async function getAdminSignedFileUrl(
  fileAssetId: string,
  expiresInSeconds = 300
) {
  const result = await dbQuery<{ s3_key: string }>(
    "select s3_key from file_assets where id = $1 limit 1",
    [fileAssetId]
  );
  const asset = result.rows[0];

  if (!asset) {
    throw new ApiError(404, "NOT_FOUND", "File asset was not found.");
  }

  return getSignedDownloadUrl(asset.s3_key, expiresInSeconds);
}

export async function generateWatermarkedPreview() {
  throw new ApiError(
    501,
    "SERVER_ERROR",
    "Watermarked preview generation requires a document rendering worker."
  );
}
