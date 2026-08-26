import "server-only";

import { z } from "zod";
import { badRequest } from "@/lib/api/response";
import { decryptHiringReviewValue } from "@/lib/hiring/candidate-disclosure";
import type {
  ConnectedCandidateControls,
  ConnectedCandidateDecision,
  ConnectedCandidateRiskLevel
} from "@/lib/hiring/connected-candidate-types";
import { dbQuery, withDbTransaction } from "@/lib/db";

export type ConnectedCandidateReviewRecord = {
  id: string;
  candidateA: {
    reference: string;
    role: string;
    department: string | null;
  };
  candidateB: {
    reference: string;
    role: string;
    department: string | null;
  };
  riskLevel: ConnectedCandidateRiskLevel;
  riskScore: number;
  reviewStatus:
    | "pending_review"
    | "in_review"
    | "approved"
    | "declined"
    | "false_positive";
  decision: ConnectedCandidateDecision | null;
  requiresHumanReview: boolean;
  requiresManagementApproval: boolean;
  automaticRejection: false;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  finalOfferApprovedAt: string | null;
  signals: Array<{
    type: string;
    weight: number;
    confidence: "low" | "medium" | "high";
    similarity: number | null;
  }>;
  disclosures: Array<{
    candidateReference: string;
    disclosed: boolean;
    relatedPersonName: string | null;
    relationship: string | null;
    relatedRole: string | null;
    details: string | null;
  }>;
  controls: ConnectedCandidateControls & { notes: string | null };
  updatedAt: string;
};

type ReviewRow = {
  id: string;
  candidate_a_reference: string;
  candidate_a_role: string;
  candidate_a_department: string | null;
  candidate_b_reference: string;
  candidate_b_role: string;
  candidate_b_department: string | null;
  risk_level: ConnectedCandidateRiskLevel;
  risk_score: number;
  review_status: ConnectedCandidateReviewRecord["reviewStatus"];
  decision: ConnectedCandidateDecision | null;
  requires_human_review: boolean;
  requires_management_approval: boolean;
  automatic_rejection: false;
  reviewer_notes: string | null;
  reviewed_at: Date | null;
  final_offer_approved_at: Date | null;
  signals: ConnectedCandidateReviewRecord["signals"];
  a_disclosed: boolean | null;
  a_name: string | null;
  a_relationship: string | null;
  a_role: string | null;
  a_details: string | null;
  b_disclosed: boolean | null;
  b_name: string | null;
  b_relationship: string | null;
  b_role: string | null;
  b_details: string | null;
  separate_assessors: boolean;
  separate_reporting_lines: boolean;
  restricted_cross_system_access: boolean;
  enhanced_probation_monitoring: boolean;
  no_direct_work_allocation_authority: boolean;
  no_shared_approval_chain: boolean;
  post_joining_audit_required: boolean;
  control_notes: string | null;
  updated_at: Date;
};

const controlsSchema = z.object({
  separateAssessors: z.boolean(),
  separateReportingLines: z.boolean(),
  restrictedCrossSystemAccess: z.boolean(),
  enhancedProbationMonitoring: z.boolean(),
  noDirectWorkAllocationAuthority: z.boolean(),
  noSharedApprovalChain: z.boolean(),
  postJoiningAuditRequired: z.boolean()
});

export const connectedCandidateDecisionSchema = z.object({
  decision: z.enum([
    "approved_no_additional_controls",
    "approved_with_controls",
    "declined_after_review",
    "false_positive"
  ]),
  reviewerNotes: z.string().trim().min(10).max(2000),
  finalOfferApproved: z.boolean().default(false),
  controls: controlsSchema,
  controlNotes: z.string().trim().max(2000).nullable().optional()
});

export type ConnectedCandidateDecisionInput = z.infer<
  typeof connectedCandidateDecisionSchema
>;

function mapReview(row: ReviewRow): ConnectedCandidateReviewRecord {
  const disclosures: ConnectedCandidateReviewRecord["disclosures"] = [];
  if (row.a_disclosed !== null) {
    disclosures.push({
      candidateReference: row.candidate_a_reference,
      disclosed: row.a_disclosed,
      relatedPersonName: decryptHiringReviewValue(row.a_name),
      relationship: row.a_relationship,
      relatedRole: row.a_role,
      details: decryptHiringReviewValue(row.a_details)
    });
  }
  if (row.b_disclosed !== null) {
    disclosures.push({
      candidateReference: row.candidate_b_reference,
      disclosed: row.b_disclosed,
      relatedPersonName: decryptHiringReviewValue(row.b_name),
      relationship: row.b_relationship,
      relatedRole: row.b_role,
      details: decryptHiringReviewValue(row.b_details)
    });
  }

  return {
    id: row.id,
    candidateA: {
      reference: row.candidate_a_reference,
      role: row.candidate_a_role,
      department: row.candidate_a_department
    },
    candidateB: {
      reference: row.candidate_b_reference,
      role: row.candidate_b_role,
      department: row.candidate_b_department
    },
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    reviewStatus: row.review_status,
    decision: row.decision,
    requiresHumanReview: row.requires_human_review,
    requiresManagementApproval: row.requires_management_approval,
    automaticRejection: false,
    reviewerNotes: row.reviewer_notes,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    finalOfferApprovedAt:
      row.final_offer_approved_at?.toISOString() ?? null,
    signals: row.signals ?? [],
    disclosures,
    controls: {
      separateAssessors: row.separate_assessors,
      separateReportingLines: row.separate_reporting_lines,
      restrictedCrossSystemAccess: row.restricted_cross_system_access,
      enhancedProbationMonitoring: row.enhanced_probation_monitoring,
      noDirectWorkAllocationAuthority:
        row.no_direct_work_allocation_authority,
      noSharedApprovalChain: row.no_shared_approval_chain,
      postJoiningAuditRequired: row.post_joining_audit_required,
      notes: row.control_notes
    },
    updatedAt: row.updated_at.toISOString()
  };
}

const reviewSelect = `
  select
    review.id,
    candidate_a.candidate_reference as candidate_a_reference,
    candidate_a.application_role as candidate_a_role,
    candidate_a.department as candidate_a_department,
    candidate_b.candidate_reference as candidate_b_reference,
    candidate_b.application_role as candidate_b_role,
    candidate_b.department as candidate_b_department,
    review.risk_level,
    review.risk_score,
    review.review_status,
    review.decision,
    review.requires_human_review,
    review.requires_management_approval,
    review.automatic_rejection,
    review.reviewer_notes,
    review.reviewed_at,
    review.final_offer_approved_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'type', signal.signal_type,
            'weight', signal.signal_weight,
            'confidence', signal.confidence,
            'similarity', signal.safe_details -> 'similarity'
          )
          order by signal.signal_weight desc
        )
        from hiring_connected_candidate_signals signal
        where signal.review_id = review.id
      ),
      '[]'::jsonb
    ) as signals,
    disclosure_a.knows_applicant_or_employee as a_disclosed,
    disclosure_a.related_person_name_encrypted as a_name,
    disclosure_a.relationship_type as a_relationship,
    disclosure_a.related_role as a_role,
    disclosure_a.disclosure_details_encrypted as a_details,
    disclosure_b.knows_applicant_or_employee as b_disclosed,
    disclosure_b.related_person_name_encrypted as b_name,
    disclosure_b.relationship_type as b_relationship,
    disclosure_b.related_role as b_role,
    disclosure_b.disclosure_details_encrypted as b_details,
    coalesce(controls.separate_assessors, false) as separate_assessors,
    coalesce(controls.separate_reporting_lines, false)
      as separate_reporting_lines,
    coalesce(controls.restricted_cross_system_access, false)
      as restricted_cross_system_access,
    coalesce(controls.enhanced_probation_monitoring, false)
      as enhanced_probation_monitoring,
    coalesce(controls.no_direct_work_allocation_authority, false)
      as no_direct_work_allocation_authority,
    coalesce(controls.no_shared_approval_chain, false)
      as no_shared_approval_chain,
    coalesce(controls.post_joining_audit_required, false)
      as post_joining_audit_required,
    controls.control_notes,
    review.updated_at
  from hiring_connected_candidate_reviews review
  join hiring_candidates candidate_a on candidate_a.id = review.candidate_a_id
  join hiring_candidates candidate_b on candidate_b.id = review.candidate_b_id
  left join hiring_candidate_disclosures disclosure_a
    on disclosure_a.candidate_id = candidate_a.id
  left join hiring_candidate_disclosures disclosure_b
    on disclosure_b.candidate_id = candidate_b.id
  left join hiring_connected_candidate_controls controls
    on controls.review_id = review.id
`;

export async function listConnectedCandidateReviews(limit = 100) {
  const result = await dbQuery<ReviewRow>(
    `
      ${reviewSelect}
      order by
        case review.risk_level
          when 'high' then 1
          when 'review' then 2
          else 3
        end,
        review.updated_at desc
      limit $1
    `,
    [Math.min(Math.max(limit, 1), 250)]
  );

  return result.rows.map(mapReview);
}

export async function getConnectedCandidateReview(reviewId: string) {
  const result = await dbQuery<ReviewRow>(
    `
      ${reviewSelect}
      where review.id = $1
      limit 1
    `,
    [reviewId]
  );

  return result.rows[0] ? mapReview(result.rows[0]) : null;
}

export async function decideConnectedCandidateReview({
  reviewId,
  input,
  adminUserId
}: {
  reviewId: string;
  input: ConnectedCandidateDecisionInput;
  adminUserId: string;
}) {
  const parsed = connectedCandidateDecisionSchema.parse(input);

  await withDbTransaction(async (query) => {
    const reviewRows = await query<{
      risk_level: ConnectedCandidateRiskLevel;
    }>(
      `
        select risk_level
        from hiring_connected_candidate_reviews
        where id = $1
        for update
      `,
      [reviewId]
    );
    const review = reviewRows[0];
    if (!review) throw badRequest("Connected Candidate Review not found.");
    const approved = parsed.decision.startsWith("approved_");
    if (
      review.risk_level === "high" &&
      approved &&
      !parsed.finalOfferApproved
    ) {
      throw badRequest(
        "High-risk connected candidates require explicit final-offer approval."
      );
    }
    if (
      parsed.decision === "approved_with_controls" &&
      !Object.values(parsed.controls).some(Boolean)
    ) {
      throw badRequest("Select at least one post-review control.");
    }

    const reviewStatus =
      parsed.decision === "false_positive"
        ? "false_positive"
        : parsed.decision === "declined_after_review"
          ? "declined"
          : "approved";
    await query(
      `
        update hiring_connected_candidate_reviews
        set
          review_status = $2,
          decision = $3,
          reviewer_notes = $4,
          reviewed_by_admin_user_id = $5::uuid,
          reviewed_at = now(),
          final_offer_approved_by_admin_user_id =
            case when $6::boolean then $5::uuid else null::uuid end,
          final_offer_approved_at =
            case when $6::boolean then now() else null::timestamptz end,
          automatic_rejection = false
        where id = $1
      `,
      [
        reviewId,
        reviewStatus,
        parsed.decision,
        parsed.reviewerNotes,
        adminUserId,
        parsed.finalOfferApproved
      ]
    );
    await query(
      `
        insert into hiring_connected_candidate_controls (
          review_id, separate_assessors, separate_reporting_lines,
          restricted_cross_system_access, enhanced_probation_monitoring,
          no_direct_work_allocation_authority, no_shared_approval_chain,
          post_joining_audit_required, control_notes,
          approved_by_admin_user_id, approved_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        on conflict (review_id)
        do update set
          separate_assessors = excluded.separate_assessors,
          separate_reporting_lines = excluded.separate_reporting_lines,
          restricted_cross_system_access =
            excluded.restricted_cross_system_access,
          enhanced_probation_monitoring =
            excluded.enhanced_probation_monitoring,
          no_direct_work_allocation_authority =
            excluded.no_direct_work_allocation_authority,
          no_shared_approval_chain = excluded.no_shared_approval_chain,
          post_joining_audit_required =
            excluded.post_joining_audit_required,
          control_notes = excluded.control_notes,
          approved_by_admin_user_id = excluded.approved_by_admin_user_id,
          approved_at = now()
      `,
      [
        reviewId,
        parsed.controls.separateAssessors,
        parsed.controls.separateReportingLines,
        parsed.controls.restrictedCrossSystemAccess,
        parsed.controls.enhancedProbationMonitoring,
        parsed.controls.noDirectWorkAllocationAuthority,
        parsed.controls.noSharedApprovalChain,
        parsed.controls.postJoiningAuditRequired,
        parsed.controlNotes ?? null,
        adminUserId
      ]
    );
    await query(
      `
        insert into hiring_connected_candidate_audit (
          review_id, actor_type, actor_admin_user_id, action, safe_metadata
        )
        values ($1, 'admin', $2, 'reviewer_decision', $3::jsonb)
      `,
      [
        reviewId,
        adminUserId,
        JSON.stringify({
          decision: parsed.decision,
          finalOfferApproved: parsed.finalOfferApproved,
          controls: parsed.controls
        })
      ]
    );
    if (parsed.decision === "false_positive") {
      await query(
        `
          insert into hiring_connected_candidate_audit (
            review_id, actor_type, actor_admin_user_id,
            action, safe_metadata
          )
          values (
            $1, 'admin', $2, 'override',
            '{"reason":"reviewed_false_positive"}'::jsonb
          )
        `,
        [reviewId, adminUserId]
      );
    }
    if (parsed.finalOfferApproved) {
      await query(
        `
          insert into hiring_connected_candidate_audit (
            review_id, actor_type, actor_admin_user_id,
            action, safe_metadata
          )
          values (
            $1, 'admin', $2, 'final_offer_approval',
            '{"approved":true}'::jsonb
          )
        `,
        [reviewId, adminUserId]
      );
    }
    if (Object.values(parsed.controls).some(Boolean)) {
      await query(
        `
          insert into hiring_connected_candidate_audit (
            review_id, actor_type, actor_admin_user_id,
            action, safe_metadata
          )
          values (
            $1, 'admin', $2, 'post_joining_restrictions', $3::jsonb
          )
        `,
        [reviewId, adminUserId, JSON.stringify(parsed.controls)]
      );
    }
  });

  return getConnectedCandidateReview(reviewId);
}

export async function getConnectedCandidateReviewSummary() {
  const result = await dbQuery<{
    risk_level: ConnectedCandidateRiskLevel;
    review_status: string;
    count: string;
  }>(
    `
      select risk_level, review_status, count(*)::text as count
      from hiring_connected_candidate_reviews
      group by risk_level, review_status
    `
  );

  return result.rows.reduce(
    (summary, row) => {
      summary.total += Number(row.count);
      summary[row.risk_level] += Number(row.count);
      if (row.review_status === "pending_review") {
        summary.pending += Number(row.count);
      }
      return summary;
    },
    { total: 0, low: 0, review: 0, high: 0, pending: 0 }
  );
}
