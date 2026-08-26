import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { assertHiringPermission, type HiringPermission } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  runApplicationOperation,
  runAdminReviewOperation,
  runAssessmentOperation,
  runEligibilityOperation,
  runHrmsOperation,
  runFinalDecisionOperation,
  runIntegrityReviewOperation,
  runInterviewOperation,
  runReferralOperation,
  runTalentPoolOperation,
  runSystemReviewOperation,
  runTrustPublishOperation,
  runVerificationOperation
} from "@/lib/hiring/operations";
import { hiringOperationSchema } from "@/lib/hiring/operations-schema";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const permissions: Record<string, HiringPermission> = {
  application: "hiring.applications.manage",
  eligibility: "hiring.applications.manage",
  assessment: "hiring.assessments.review",
  system_review: "hiring.assessments.review",
  admin_review: "hiring.applications.manage",
  final_decision: "hiring.applications.manage",
  integrity_review: "hiring.assessments.review",
  interview: "hiring.interviews.manage",
  talent_pool: "hiring.applications.manage",
  referral: "hiring.applications.manage",
  verification: "hiring.verification.review",
  hrms: "hiring.offers.approve",
  trust_publish: "hiring.offers.approve"
};

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin=getAdminSessionFromRequest(request);
    const input=await parseJson(request,hiringOperationSchema);
    assertHiringPermission(admin,permissions[input.resource]);
    const context=getRequestContext(request);
    assertRateLimit({key:`hiring-operation:${admin.adminUserId}:${context.ipAddress}`,limit:120,windowSeconds:3600});
    const result=input.resource==="application"?await runApplicationOperation(input,admin.adminUserId)
      :input.resource==="eligibility"?await runEligibilityOperation(input,admin.adminUserId)
      :input.resource==="assessment"?await runAssessmentOperation(input,admin.adminUserId)
      :input.resource==="system_review"?await runSystemReviewOperation(input,admin.adminUserId)
      :input.resource==="admin_review"?await runAdminReviewOperation(input,admin.adminUserId)
      :input.resource==="final_decision"?await runFinalDecisionOperation(input,admin.adminUserId)
      :input.resource==="integrity_review"?await runIntegrityReviewOperation(input,admin.adminUserId)
      :input.resource==="interview"?await runInterviewOperation(input,admin.adminUserId)
      :input.resource==="talent_pool"?await runTalentPoolOperation(input,admin.adminUserId)
      :input.resource==="referral"?await runReferralOperation(input,admin.adminUserId)
      :input.resource==="verification"?await runVerificationOperation(input,admin.adminUserId)
      :input.resource==="hrms"?await runHrmsOperation(input,admin.adminUserId)
      :await runTrustPublishOperation(input,admin.adminUserId);
    return apiOk(result,{headers:{"cache-control":"no-store"}});
  } catch (error) {
    return apiError(error);
  }
}
