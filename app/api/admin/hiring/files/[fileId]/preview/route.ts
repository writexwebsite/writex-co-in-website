import type { NextRequest } from "next/server";
import { apiError } from "@/lib/api/response";
import { assertHiringPermission } from "@/lib/admin/permissions";
import { getHiringAdminSessionFromRequest } from "@/lib/hiring/access";
import {
  getCandidateFileInlinePreview,
  getCandidateFileType
} from "@/lib/hiring/files";
import { assertRateLimit, getRequestContext } from "@/lib/security";
import { sanitizeFileName } from "@/lib/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const admin = await getHiringAdminSessionFromRequest(request);
    const { fileId } = await params;
    const type = await getCandidateFileType(fileId);
    assertHiringPermission(
      admin,
      ["identity_document", "education_document", "background_report"].includes(type)
        ? "hiring.verification.review"
        : "hiring.applications.view"
    );

    const context = getRequestContext(request);
    assertRateLimit({
      key: `hiring-file-inline-preview:${admin.adminUserId}:${context.ipAddress}`,
      limit: 120,
      windowSeconds: 3600
    });

    const file = await getCandidateFileInlinePreview(
      fileId,
      admin.adminUserId,
      "Authorised in-page candidate document review"
    );
    const safeName = sanitizeFileName(file.fileName);

    return new Response(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "cache-control": "private, no-store, max-age=0",
        "content-disposition": `inline; filename="${safeName}"`,
        "content-length": String(file.buffer.byteLength),
        "content-type": file.mimeType,
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
