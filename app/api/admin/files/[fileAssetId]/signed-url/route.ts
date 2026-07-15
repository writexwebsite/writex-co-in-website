import type { NextRequest } from "next/server";
import { apiError, apiOk, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { isDatabaseConfigured } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/security";
import { getAdminSignedFileUrl, isStorageConfigured } from "@/lib/storage/s3";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileAssetId: string }> }
) {
  try {
    const session = getAdminSessionFromRequest(request);

    if (!isDatabaseConfigured()) {
      throw notConfigured("File metadata storage is not configured.");
    }

    if (!isStorageConfigured()) {
      throw notConfigured("Secure file storage is not configured.");
    }

    const { fileAssetId } = await context.params;
    const url = await getAdminSignedFileUrl(fileAssetId, 300);

    await logIntegrationEvent({
      system: "admin_panel",
      endpoint: "signed_file_access",
      requestId: `${fileAssetId}:${session.adminUserId}`,
      status: "issued"
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "file_asset",
      entityId: fileAssetId,
      action: "file_signed_url_requested",
      request
    });

    return apiOk({ url, expiresInSeconds: 300 });
  } catch (error) {
    return apiError(error);
  }
}
