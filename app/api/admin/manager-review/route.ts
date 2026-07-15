import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { getManagerReview } from "@/lib/admin/managerReview";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    const review = await getManagerReview();
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "manager_review",
      action: "manager_review_viewed",
      request
    });
    return apiOk(review);
  } catch (error) {
    return apiError(error);
  }
}
