import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertCanManageConnectedCandidateReviews } from "@/lib/admin/permissions";
import { getHiringAdminSessionFromRequest } from "@/lib/hiring/access";
import {
  candidateObservationSchema,
  recordCandidateObservation
} from "@/lib/hiring/candidate-observation";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = await getHiringAdminSessionFromRequest(request);
    assertCanManageConnectedCandidateReviews(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `candidate-observation:${admin.adminUserId}:${context.ipAddress}`,
      limit: 120,
      windowSeconds: 60 * 60
    });
    const input = await parseJson(request, candidateObservationSchema);
    const result = await recordCandidateObservation({
      input,
      ipAddress: context.ipAddress
    });

    return apiOk(
      {
        received: true,
        candidateReference: result.candidateReference,
        connectedReviewCount: result.reviewIds.length
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}

