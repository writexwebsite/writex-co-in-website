import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import {
  assertHiringPermission,
  canViewHiringCandidateIdentity
} from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { getHiringApplicationDetail } from "@/lib/hiring/admin";
import {
  assertRateLimit,
  getRequestContext
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const correlationId = randomUUID();
  try {
    const session = getAdminSessionFromRequest(request);
    assertHiringPermission(session, "hiring.applications.view");
    const context = getRequestContext(request);
    assertRateLimit({
      key: `hiring-application-detail:${session.adminUserId}:${context.ipAddress}`,
      limit: 240,
      windowSeconds: 60 * 60
    });
    const { reference } = await params;
    const item = await getHiringApplicationDetail(reference, {
      revealContact: canViewHiringCandidateIdentity(session)
    });
    if (!item) {
      throw new ApiError(404, "NOT_FOUND", "Application was not found.");
    }
    const response = apiOk(item, {
      headers: { "cache-control": "private, no-store" }
    });
    response.headers.set("x-correlation-id", correlationId);
    return response;
  } catch (error) {
    console.error("Hiring application detail API failed", {
      route: "/api/admin/hiring/applications/[reference]",
      correlationId,
      category:
        error instanceof ApiError
          ? error.code.toLowerCase()
          : "application_detail_api_failed",
      timestamp: new Date().toISOString()
    });
    const response = apiError(error);
    response.headers.set("cache-control", "private, no-store");
    response.headers.set("x-correlation-id", correlationId);
    return response;
  }
}
