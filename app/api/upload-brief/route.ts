import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, badRequest, notConfigured } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { assertRateLimit, getRequestContext } from "@/lib/security";
import {
  isStorageConfigured,
  sanitizeFileName,
  uploadFileToS3,
  type FileAssetType
} from "@/lib/storage/s3";
import { fileUploadMetadataSchema } from "@/lib/validation";
import { scanUploadForMalware } from "@/lib/storage/malware";
import { assertNotDemoRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

const uploadFallbackMessage =
  "File upload is not available right now. Please send your file on WhatsApp for the fastest review.";

const executableExtensions = new Set([
  "exe",
  "bat",
  "cmd",
  "scr",
  "ps1",
  "sh",
  "msi",
  "dll",
  "jar",
  "app",
  "dmg",
  "com",
  "vbs",
  "js"
]);

const allowedFileTypes: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword", "application/vnd.ms-word"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  txt: ["text/plain"]
};

function getMaxUploadBytes() {
  const maxMb = Number(process.env.MAX_UPLOAD_SIZE_MB || 25);

  return Math.max(1, maxMb) * 1024 * 1024;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function validateUploadFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!extension || executableExtensions.has(extension)) {
    throw badRequest("This file type is not allowed.");
  }

  const allowedMimeTypes = allowedFileTypes[extension];
  if (!allowedMimeTypes) {
    throw badRequest("This file type is not supported.");
  }

  if (file.size <= 0) {
    throw badRequest("The selected file is empty.");
  }

  if (file.size > getMaxUploadBytes()) {
    throw badRequest(
      `File is too large. Maximum upload size is ${process.env.MAX_UPLOAD_SIZE_MB || 25} MB.`
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const genericMime = !file.type || mimeType === "application/octet-stream";
  if (!genericMime && !allowedMimeTypes.includes(mimeType)) {
    throw badRequest("The file MIME type does not match the allowed file type.");
  }

  return {
    extension,
    mimeType: genericMime ? allowedMimeTypes[0] : mimeType
  };
}

function verifyFileSignature(buffer: Buffer, extension: string) {
  const starts = (...bytes: number[]) => bytes.every((byte, index) => buffer[index] === byte);
  const isZip = starts(0x50, 0x4b);
  const isOle = starts(0xd0, 0xcf, 0x11, 0xe0);
  const valid =
    extension === "pdf" ? buffer.subarray(0, 5).toString("ascii") === "%PDF-" :
    extension === "png" ? starts(0x89, 0x50, 0x4e, 0x47) :
    ["jpg", "jpeg"].includes(extension) ? starts(0xff, 0xd8, 0xff) :
    ["docx", "pptx", "xlsx"].includes(extension) ? isZip :
    ["doc", "ppt", "xls"].includes(extension) ? isOle :
    ["txt", "csv"].includes(extension);
  if (!valid) throw badRequest("The file content does not match its extension.");
}

export async function POST(request: NextRequest) {
  try {
    assertNotDemoRequest(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `upload-brief:${context.ipAddress}`,
      limit: 12,
      windowSeconds: 300
    });

    if (!isStorageConfigured()) {
      throw notConfigured(uploadFallbackMessage);
    }

    if (!isDatabaseConfigured()) {
      throw notConfigured(uploadFallbackMessage);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const parsedMetadata = fileUploadMetadataSchema.safeParse({
      invoiceId: String(formData.get("invoiceId") || "") || undefined,
      quoteLeadId: String(formData.get("quoteLeadId") || "") || undefined,
      assetType: String(formData.get("assetType") || "quote_brief"),
      uploadedBy: String(formData.get("uploadedBy") || "client")
    });

    if (!parsedMetadata.success) {
      throw badRequest("Upload metadata is invalid.");
    }

    const metadata = parsedMetadata.data;

    if (!(file instanceof File)) {
      throw badRequest("A file is required.");
    }

    const validation = validateUploadFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    verifyFileSignature(buffer, validation.extension);
    await scanUploadForMalware(buffer, file.name);
    const uploaded = await uploadFileToS3(buffer, {
      fileName: file.name,
      mimeType: validation.mimeType,
      assetType: metadata.assetType as FileAssetType,
      invoiceId: metadata.invoiceId,
      quoteLeadId: metadata.quoteLeadId
    });

    const result = await dbQuery<{ id: string }>(
      `
        insert into file_assets (
          invoice_id,
          quote_lead_id,
          asset_type,
          s3_key,
          file_name,
          mime_type,
          file_size,
          uploaded_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id
      `,
      [
        metadata.invoiceId ?? null,
        metadata.quoteLeadId ?? null,
        metadata.assetType,
        uploaded.s3Key,
        uploaded.fileName,
        uploaded.mimeType,
        uploaded.fileSize,
        metadata.uploadedBy
      ]
    );

    return NextResponse.json(
      {
        success: true,
        fileAssetId: result.rows[0].id,
        fileName: sanitizeFileName(file.name),
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        assetType: metadata.assetType
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Brief upload failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return apiError(error);
  }
}
