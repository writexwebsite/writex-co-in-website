import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageConnectedCandidateReviews } from "@/lib/admin/permissions";
import { getHiringAdminSessionFromRequest } from "@/lib/hiring/access";
import {
  getConnectedCandidateReviewSummary,
  listConnectedCandidateReviews
} from "@/lib/hiring/connected-candidate-admin";
import {
  assertRateLimit,
  getRequestContext
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getHiringAdminSessionFromRequest(request);
    assertCanManageConnectedCandidateReviews(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `connected-candidate-review-list:${admin.adminUserId}:${context.ipAddress}`,
      limit: 120,
      windowSeconds: 60 * 60
    });
    const [summary, reviews] = await Promise.all([
      getConnectedCandidateReviewSummary(),
      listConnectedCandidateReviews()
    ]);

    return apiOk(
      { summary, reviews },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}

