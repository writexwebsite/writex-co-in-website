import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest, forbidden } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import {
  importRepresentativeWorkbook
} from "@/lib/trust/representative-import";
import { RepresentativeWorkbookValidationError } from "@/lib/trust/representative-import-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream"
]);

function assertXlsxFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw badRequest("Upload an XLSX spreadsheet.");
  }
  if (file.type && !XLSX_MIME_TYPES.has(file.type)) {
    throw badRequest("The uploaded file type is not supported.");
  }
  if (!file.size || file.size > MAX_FILE_SIZE) {
    throw badRequest("The spreadsheet must be between 1 byte and 5 MB.");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    if (admin.role !== "super_admin") {
      throw forbidden("Only a Super Admin can import representatives.");
    }

    const context = getRequestContext(request);
    assertRateLimit({
      key: `representative-import:${admin.adminUserId}:${context.ipAddress}`,
      limit: 5,
      windowSeconds: 60 * 60
    });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw badRequest("Upload the spreadsheet as multipart form data.");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw badRequest("The file field is required.");
    }
    assertXlsxFile(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw badRequest("The uploaded file is not a valid XLSX spreadsheet.");
    }

    const summary = await importRepresentativeWorkbook({
      buffer,
      allowEmptyDirectory: formData.get("confirmEmptyDirectory") === "true"
    });

    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "official_representatives",
      action: "official_representatives_imported",
      metadata: {
        importedCount: summary.importedCount,
        updatedCount: summary.updatedCount,
        ignoredCount: summary.ignoredCount,
        duplicateCount: summary.duplicateCount,
        errorRowCount: summary.errorRows.length
      },
      request
    });

    return apiOk(summary, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    if (error instanceof RepresentativeWorkbookValidationError) {
      return apiError(badRequest(error.message));
    }
    return apiError(error);
  }
}
