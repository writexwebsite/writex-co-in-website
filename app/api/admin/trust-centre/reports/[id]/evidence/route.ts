import { z } from "zod";
import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import { assertCanManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import { revokeSuspiciousReportEvidence } from "@/lib/trust/admin-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z.string().trim().min(10).max(500)
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageRepresentativeDirectory(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `trust-evidence-revoke:${admin.adminUserId}:${context.ipAddress}`,
      limit: 20,
      windowSeconds: 60 * 60
    });
    const [{ id }, body] = await Promise.all([params, request.json().then((value) => bodySchema.parse(value))]);
    const result = await revokeSuspiciousReportEvidence({
      reportId: id,
      adminUserId: admin.adminUserId,
      reason: body.reason
    });
    if (!result) throw new ApiError(404, "NOT_FOUND", "The suspicious activity report was not found.");

    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "trust_suspicious_report",
      entityId: id,
      action: "trust_suspicious_report_evidence_revoked",
      metadata: {
        revoked: result.revoked,
        alreadyRevoked: result.alreadyRevoked,
        fileAssetId: result.fileAssetId,
        reason: body.reason
      },
      request
    });

    return apiOk(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
