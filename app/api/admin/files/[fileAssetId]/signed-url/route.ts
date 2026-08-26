import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden, notConfigured } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
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
    const assetResult = await dbQuery<{
      asset_type: string;
      trust_report_id: string | null;
      evidence_revoked_at: Date | null;
    }>(
      `
        select
          asset.asset_type,
          report.id as trust_report_id,
          report.evidence_revoked_at
        from file_assets asset
        left join trust_suspicious_reports report
          on report.evidence_file_asset_id = asset.id
        where asset.id = $1
        limit 1
      `,
      [fileAssetId]
    );
    const asset = assetResult.rows[0];
    if (asset?.asset_type === "trust_report_evidence") {
      if (session.role !== "super_admin") {
        throw forbidden("Only a Super Admin can access Trust Centre evidence.");
      }
      if (!asset.trust_report_id || asset.evidence_revoked_at) {
        throw forbidden("This Trust Centre evidence is no longer available.");
      }
    }
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
