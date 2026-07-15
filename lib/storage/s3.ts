import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "@/lib/api/response";
import { dbQuery } from "@/lib/db";
import { isProduction } from "@/lib/security";

const globalForS3 = globalThis as typeof globalThis & {
  writexS3Client?: S3Client;
};

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
  | "other";

type UploadFileInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  assetType: FileAssetType;
  invoiceId?: string;
  quoteLeadId?: string;
};

type BuildS3KeyInput = {
  type: FileAssetType;
  quoteLeadId?: string;
  invoiceId?: string;
  fileName: string;
};

const quoteAssetFolders: Partial<Record<FileAssetType, string>> = {
  quote_brief: "briefs",
  rubric: "rubrics",
  draft: "drafts",
  sop_prompt: "sop-prompts",
  dissertation_chapter: "dissertation-chapters",
  other: "other"
};

function isS3Configured() {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
  );
}

function assertS3Configured() {
  if (!isS3Configured()) {
    throw new ApiError(
      503,
      "NOT_CONFIGURED",
      isProduction()
        ? "Secure file storage is not configured."
        : "Secure file storage is not configured for this environment."
    );
  }
}

function getS3Client() {
  assertS3Configured();

  if (!globalForS3.writexS3Client) {
    globalForS3.writexS3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    });
  }

  return globalForS3.writexS3Client;
}

function getBucketName() {
  assertS3Configured();

  return process.env.AWS_S3_BUCKET || "";
}

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
  fileName
}: BuildS3KeyInput) {
  const privatePrefix = (process.env.AWS_S3_PRIVATE_PREFIX || "writex")
    .replace(/^\/+|\/+$/g, "");
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

  const folder = quoteAssetFolders[type] || "other";
  const owner = quoteLeadId || `pending/${crypto.randomUUID()}`;

  return `${privatePrefix}/quote-leads/${owner}/${folder}/${safeFileName}`;
}

export function isStorageConfigured() {
  return isS3Configured();
}

export async function uploadFileToS3(
  fileBuffer: Buffer,
  options: Omit<UploadFileInput, "buffer">
) {
  const s3Key = buildS3Key({
    type: options.assetType,
    quoteLeadId: options.quoteLeadId,
    invoiceId: options.invoiceId,
    fileName: options.fileName
  });

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
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
    quoteLeadId: input.quoteLeadId
  });
}

export async function getSignedPreviewUrl(s3Key: string, expiresInSeconds = 300) {
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: s3Key
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

export async function deleteFileFromS3(s3Key: string) {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
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
