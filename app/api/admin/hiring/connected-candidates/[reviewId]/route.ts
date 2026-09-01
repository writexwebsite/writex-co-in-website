import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageConnectedCandidateReviews } from "@/lib/admin/permissions";
import { getHiringAdminSessionFromRequest } from "@/lib/hiring/access";
import {
  connectedCandidateDecisionSchema,
  decideConnectedCandidateReview
} from "@/lib/hiring/connected-candidate-admin";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = await getHiringAdminSessionFromRequest(request);
    assertCanManageConnectedCandidateReviews(admin);
    const requestContext = getRequestContext(request);
    assertRateLimit({
      key: `connected-candidate-review-decision:${admin.adminUserId}:${requestContext.ipAddress}`,
      limit: 40,
      windowSeconds: 60 * 60
    });
    const { reviewId } = await context.params;
    const input = await parseJson(request, connectedCandidateDecisionSchema);
    const review = await decideConnectedCandidateReview({
      reviewId,
      input,
      adminUserId: admin.adminUserId
    });

    return apiOk(
      { review },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}

