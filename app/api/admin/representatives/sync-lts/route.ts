import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import { assertCanManageRepresentativeDirectory } from "@/lib/admin/permissions";
import type { AdminSession } from "@/lib/auth";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import { runLtsRepresentativeSyncJob } from "@/lib/trust/lts-representative-sync-job";
import { safeLtsFailureReason } from "@/lib/trust/lts-representative-sync-policy";
import { getRepresentativeSyncStatus } from "@/lib/trust/representative-sync-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFailureCode(error: unknown) {
  return error instanceof ApiError ? error.code : safeLtsFailureReason(error);
}

export async function POST(request: NextRequest) {
  const triggeredAt = new Date();
  const correlationId = randomUUID();
  let admin: AdminSession | null = null;

  try {
    assertSameOrigin(request);
    admin = getAdminSessionFromRequest(request);
    assertCanManageRepresentativeDirectory(admin);

    const context = getRequestContext(request);
    assertRateLimit({
      key: `representative-lts-sync:${admin.adminUserId}:${context.ipAddress}`,
      limit: 6,
      windowSeconds: 60 * 60
    });

    const summary = await runLtsRepresentativeSyncJob({
      trigger: "manual_admin"
    });
    if (summary.dryRun) {
      throw new ApiError(
        500,
        "SERVER_ERROR",
        "The representative synchronization did not persist."
      );
    }

    const status = await getRepresentativeSyncStatus();
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - triggeredAt.getTime();

    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "official_representatives",
      action: "official_representatives_lts_synchronized",
      metadata: {
        triggeredBy: admin.adminUserId,
        triggeredAt: triggeredAt.toISOString(),
        syncType: "manual",
        result: "success",
        received: summary.received,
        created: summary.created,
        updated: summary.updated,
        deactivated: summary.deactivated,
        rejected: summary.rejected,
        numbersReceived: summary.numbersReceived,
        numbersCreated: summary.numbersCreated,
        numbersUpdated: summary.numbersUpdated,
        numbersDeactivated: summary.numbersDeactivated,
        rejectedNumbers: summary.rejectedNumbers,
        finalActiveCount: status.activeRepresentatives,
        finalActiveNumberCount: status.activeNumbers,
        durationMs,
        correlationId
      },
      request
    });

    return apiOk(
      {
        received: summary.received,
        created: summary.created,
        updated: summary.updated,
        deactivated: summary.deactivated,
        rejected: summary.rejected,
        numbersReceived: summary.numbersReceived,
        numbersCreated: summary.numbersCreated,
        numbersUpdated: summary.numbersUpdated,
        numbersDeactivated: summary.numbersDeactivated,
        rejectedNumbers: summary.rejectedNumbers,
        finalActiveCount: status.activeRepresentatives,
        finalActiveNumberCount: status.activeNumbers,
        completedAt
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    if (admin?.role === "super_admin") {
      await logAuditEvent({
        actorType: "admin",
        actorId: admin.adminUserId,
        actorEmail: admin.email,
        entityType: "official_representatives",
        action: "official_representatives_lts_sync_failed",
        metadata: {
          triggeredBy: admin.adminUserId,
          triggeredAt: triggeredAt.toISOString(),
          syncType: "manual",
          result: "failed",
          durationMs: Date.now() - triggeredAt.getTime(),
          correlationId,
          safeFailureCode: safeFailureCode(error)
        },
        request
      });
    }
    return apiError(error);
  }
}
