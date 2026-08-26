import "server-only";

import { z } from "zod";
import {
  candidateRelationshipDisclosureSchema,
  createPrivateTextSignature,
  encryptHiringReviewValue,
  hashHiringSignal,
  signatureSimilarity
} from "@/lib/hiring/candidate-disclosure";
import { assessConnectedCandidates } from "@/lib/hiring/connected-candidate-risk";
import type {
  CandidateConnectionContext,
  ConnectedCandidateSignalType,
  SignalEvidence
} from "@/lib/hiring/connected-candidate-types";
import { withDbTransaction } from "@/lib/db";

const profileValue = z.string().trim().min(1).max(500);
const safeStringArray = z.array(z.string().trim().min(1).max(100)).max(10);

export const candidateObservationSchema = z.object({
  candidateReference: z.string().trim().min(6).max(100),
  applicationRole: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(120).optional(),
  reportingLineReference: z.string().trim().min(2).max(120).optional(),
  accessDomains: safeStringArray.optional().default([]),
  applicationStatus: z
    .enum([
      "applied",
      "assessment",
      "shortlisted",
      "offer_pending",
      "offered",
      "hired",
      "withdrawn",
      "rejected"
    ])
    .default("applied"),
  appliedAt: z.iso.datetime(),
  disclosure: candidateRelationshipDisclosureSchema,
  indicators: z
    .object({
      deviceFingerprint: profileValue.optional(),
      browserDeviceProfile: profileValue.optional(),
      address: profileValue.optional(),
      referralSource: profileValue.optional(),
      emergencyContact: profileValue.optional(),
      uploadedFileMetadata: z.array(profileValue).max(20).optional(),
      assessmentSessionBehaviour: profileValue.optional(),
      assessmentAnswers: z.array(profileValue.max(10_000)).max(50).optional(),
      voiceScripts: z.array(profileValue.max(10_000)).max(20).optional()
    })
    .default({})
});

export type CandidateObservation = z.infer<typeof candidateObservationSchema>;

type DbCandidate = {
  id: string;
  candidate_reference: string;
  application_role: string;
  reporting_line_reference_hash: string | null;
  access_domains: string[];
  applied_at: Date;
};

type MatchingIdentifier = {
  candidate_id: string;
  signal_type: string;
};

type SimilarityArtifact = {
  candidate_id: string;
  artifact_type: string;
  exact_hash: string;
  signature_hashes: string[];
};

const identifierSignalMap: Record<string, ConnectedCandidateSignalType> = {
  ip: "same_ip",
  device_fingerprint: "same_device_fingerprint",
  browser_device_profile: "same_browser_device_profile",
  address: "same_address",
  referral_source: "same_referral_source",
  emergency_contact: "same_emergency_contact",
  uploaded_file_metadata: "shared_uploaded_file_metadata",
  assessment_session_behaviour: "same_assessment_session_behaviour"
};

function normalizedCandidatePair(left: string, right: string) {
  return left < right ? [left, right] : [right, left];
}

function contextFor(candidate: DbCandidate): CandidateConnectionContext {
  return {
    role: candidate.application_role,
    reportingLineReference: candidate.reporting_line_reference_hash,
    accessDomains: candidate.access_domains
  };
}

function identifierInputs(
  input: CandidateObservation,
  ipAddress: string
) {
  const values: Array<{
    signalType: string;
    value: string;
    expiresAt: string | null;
  }> = [
    {
      signalType: "ip",
      value: ipAddress,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  const direct = [
    ["device_fingerprint", input.indicators.deviceFingerprint],
    ["browser_device_profile", input.indicators.browserDeviceProfile],
    ["address", input.indicators.address],
    ["referral_source", input.indicators.referralSource],
    ["emergency_contact", input.indicators.emergencyContact],
    [
      "assessment_session_behaviour",
      input.indicators.assessmentSessionBehaviour
    ]
  ] as const;
  for (const [signalType, value] of direct) {
    if (value) values.push({ signalType, value, expiresAt: null });
  }
  for (const value of input.indicators.uploadedFileMetadata ?? []) {
    values.push({
      signalType: "uploaded_file_metadata",
      value,
      expiresAt: null
    });
  }

  return values.map((item) => ({
    signalType: item.signalType,
    valueHash: hashHiringSignal(item.signalType, item.value),
    expiresAt: item.expiresAt
  }));
}

function similarityInputs(input: CandidateObservation) {
  return [
    ...(input.indicators.assessmentAnswers ?? []).map((value) => ({
      artifactType: "assessment_answer",
      ...createPrivateTextSignature(value)
    })),
    ...(input.indicators.assessmentAnswers ?? []).map((value) => ({
      artifactType: "repeated_language",
      ...createPrivateTextSignature(value)
    })),
    ...(input.indicators.voiceScripts ?? []).map((value) => ({
      artifactType: "voice_script_pattern",
      ...createPrivateTextSignature(value)
    }))
  ];
}

function similaritySignal(
  artifactType: string,
  similarity: number,
  exact: boolean
): SignalEvidence | null {
  if (!exact && similarity < 0.7) return null;
  if (artifactType === "voice_script_pattern") {
    return {
      type: "same_voice_script_pattern",
      confidence: exact ? "high" : "medium",
      similarity
    };
  }
  if (artifactType === "repeated_language" && (exact || similarity >= 0.85)) {
    return {
      type: "repeated_identical_language",
      confidence: exact ? "high" : "medium",
      similarity
    };
  }

  return {
    type: "unusual_answer_similarity",
    confidence: exact ? "high" : "medium",
    similarity
  };
}

export async function recordCandidateObservation({
  input,
  ipAddress
}: {
  input: CandidateObservation;
  ipAddress: string;
}) {
  const parsed = candidateObservationSchema.parse(input);
  const identifiers = identifierInputs(parsed, ipAddress);
  const similarityArtifacts = similarityInputs(parsed);

  return withDbTransaction(async (query) => {
    const reportingLineHash = parsed.reportingLineReference
      ? hashHiringSignal("reporting_line", parsed.reportingLineReference)
      : null;
    const candidateRows = await query<DbCandidate>(
      `
        insert into hiring_candidates (
          candidate_reference, application_role, department,
          reporting_line_reference_hash, access_domains,
          application_status, applied_at
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (candidate_reference)
        do update set
          application_role = excluded.application_role,
          department = excluded.department,
          reporting_line_reference_hash = excluded.reporting_line_reference_hash,
          access_domains = excluded.access_domains,
          application_status = excluded.application_status,
          applied_at = excluded.applied_at
        returning id, candidate_reference, application_role,
                  reporting_line_reference_hash, access_domains, applied_at
      `,
      [
        parsed.candidateReference,
        parsed.applicationRole,
        parsed.department ?? null,
        reportingLineHash,
        parsed.accessDomains,
        parsed.applicationStatus,
        parsed.appliedAt
      ]
    );
    const candidate = candidateRows[0];

    await query(
      `
        insert into hiring_candidate_disclosures (
          candidate_id, knows_applicant_or_employee,
          related_person_name_encrypted, relationship_type, related_role,
          disclosure_details_encrypted, encryption_version, disclosed_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, now())
        on conflict (candidate_id)
        do update set
          knows_applicant_or_employee = excluded.knows_applicant_or_employee,
          related_person_name_encrypted = excluded.related_person_name_encrypted,
          relationship_type = excluded.relationship_type,
          related_role = excluded.related_role,
          disclosure_details_encrypted = excluded.disclosure_details_encrypted,
          encryption_version = excluded.encryption_version,
          disclosed_at = now()
      `,
      [
        candidate.id,
        parsed.disclosure.knowsApplicantOrEmployee,
        parsed.disclosure.name
          ? encryptHiringReviewValue(parsed.disclosure.name)
          : null,
        parsed.disclosure.relationship ?? null,
        parsed.disclosure.role ?? null,
        parsed.disclosure.disclosureDetails
          ? encryptHiringReviewValue(parsed.disclosure.disclosureDetails)
          : null,
        parsed.disclosure.knowsApplicantOrEmployee ? "v1" : null
      ]
    );
    await query(
      `
        insert into hiring_connected_candidate_audit (
          candidate_id, actor_type, action, safe_metadata
        )
        values ($1, 'candidate', 'relationship_disclosure', $2::jsonb)
      `,
      [
        candidate.id,
        JSON.stringify({
          disclosed: parsed.disclosure.knowsApplicantOrEmployee,
          relationship: parsed.disclosure.relationship ?? null,
          relatedRole: parsed.disclosure.role ?? null
        })
      ]
    );

    for (const identifier of identifiers) {
      await query(
        `
          insert into hiring_candidate_identifiers (
            candidate_id, signal_type, value_hash, expires_at
          )
          values ($1, $2, $3, $4)
          on conflict (candidate_id, signal_type, value_hash)
          do update set observed_at = now(), expires_at = excluded.expires_at
        `,
        [
          candidate.id,
          identifier.signalType,
          identifier.valueHash,
          identifier.expiresAt
        ]
      );
    }
    for (const artifact of similarityArtifacts) {
      await query(
        `
          insert into hiring_candidate_similarity_artifacts (
            candidate_id, artifact_type, exact_hash, signature_hashes
          )
          values ($1, $2, $3, $4)
          on conflict (candidate_id, artifact_type, exact_hash)
          do update set
            signature_hashes = excluded.signature_hashes,
            observed_at = now()
        `,
        [
          candidate.id,
          artifact.artifactType,
          artifact.exactHash,
          artifact.signatureHashes
        ]
      );
    }

    const matchingIdentifiers = await query<MatchingIdentifier>(
      `
        select distinct other.candidate_id, other.signal_type
        from hiring_candidate_identifiers current
        join hiring_candidate_identifiers other
          on other.signal_type = current.signal_type
         and other.value_hash = current.value_hash
         and other.candidate_id <> current.candidate_id
         and (other.expires_at is null or other.expires_at > now())
        where current.candidate_id = $1
          and (current.expires_at is null or current.expires_at > now())
      `,
      [candidate.id]
    );
    const otherArtifacts = await query<SimilarityArtifact>(
      `
        select candidate_id, artifact_type, exact_hash, signature_hashes
        from hiring_candidate_similarity_artifacts
        where candidate_id <> $1
          and artifact_type = any($2::text[])
      `,
      [
        candidate.id,
        Array.from(
          new Set(similarityArtifacts.map((item) => item.artifactType))
        )
      ]
    );

    const evidenceByCandidate = new Map<string, SignalEvidence[]>();
    for (const match of matchingIdentifiers) {
      const type = identifierSignalMap[match.signal_type];
      if (!type) continue;
      const evidence = evidenceByCandidate.get(match.candidate_id) ?? [];
      evidence.push({ type, confidence: type === "same_ip" ? "low" : "high" });
      evidenceByCandidate.set(match.candidate_id, evidence);
    }
    for (const other of otherArtifacts) {
      const currentMatches = similarityArtifacts.filter(
        (item) => item.artifactType === other.artifact_type
      );
      for (const current of currentMatches) {
        const exact = current.exactHash === other.exact_hash;
        const similarity = exact
          ? 1
          : signatureSimilarity(
              current.signatureHashes,
              other.signature_hashes
            );
        const signal = similaritySignal(
          other.artifact_type,
          similarity,
          exact
        );
        if (!signal) continue;
        const evidence = evidenceByCandidate.get(other.candidate_id) ?? [];
        evidence.push(signal);
        evidenceByCandidate.set(other.candidate_id, evidence);
      }
    }
    if (
      parsed.disclosure.knowsApplicantOrEmployee &&
      parsed.disclosure.relatedCandidateReference
    ) {
      const declaredRows = await query<{ id: string }>(
        `
          select id
          from hiring_candidates
          where candidate_reference = $1
            and id <> $2
          limit 1
        `,
        [parsed.disclosure.relatedCandidateReference, candidate.id]
      );
      const declaredCandidate = declaredRows[0];
      if (declaredCandidate) {
        const evidence =
          evidenceByCandidate.get(declaredCandidate.id) ?? [];
        evidence.push({
          type: "declared_personal_relationship",
          confidence: "high"
        });
        evidenceByCandidate.set(declaredCandidate.id, evidence);
      }
    }

    const reviewIds: string[] = [];
    for (const [otherCandidateId, evidence] of evidenceByCandidate) {
      const otherRows = await query<DbCandidate>(
        `
          select id, candidate_reference, application_role,
                 reporting_line_reference_hash, access_domains, applied_at
          from hiring_candidates
          where id = $1
        `,
        [otherCandidateId]
      );
      const other = otherRows[0];
      if (!other) continue;
      if (
        Math.abs(candidate.applied_at.getTime() - other.applied_at.getTime()) <=
        30 * 60 * 1000
      ) {
        evidence.push({
          type: "overlapping_application_timing",
          confidence: "low"
        });
      }
      const assessment = assessConnectedCandidates({
        left: contextFor(candidate),
        right: contextFor(other),
        evidence
      });
      const [candidateA, candidateB] = normalizedCandidatePair(
        candidate.id,
        other.id
      );
      const reviewRows = await query<{ id: string; created: boolean }>(
        `
          insert into hiring_connected_candidate_reviews (
            candidate_a_id, candidate_b_id, risk_level, risk_score,
            requires_human_review, requires_management_approval,
            automatic_rejection
          )
          values ($1, $2, $3, $4, $5, $6, false)
          on conflict (candidate_a_id, candidate_b_id)
          do update set
            risk_level = excluded.risk_level,
            risk_score = excluded.risk_score,
            requires_human_review = excluded.requires_human_review,
            requires_management_approval =
              excluded.requires_management_approval,
            review_status =
              case
                when excluded.risk_score >
                  hiring_connected_candidate_reviews.risk_score
                then 'pending_review'
                else hiring_connected_candidate_reviews.review_status
              end,
            decision =
              case
                when excluded.risk_score >
                  hiring_connected_candidate_reviews.risk_score
                then null
                else hiring_connected_candidate_reviews.decision
              end,
            final_offer_approved_by_admin_user_id =
              case
                when excluded.risk_score >
                  hiring_connected_candidate_reviews.risk_score
                then null
                else hiring_connected_candidate_reviews
                  .final_offer_approved_by_admin_user_id
              end,
            final_offer_approved_at =
              case
                when excluded.risk_score >
                  hiring_connected_candidate_reviews.risk_score
                then null
                else hiring_connected_candidate_reviews.final_offer_approved_at
              end,
            automatic_rejection = false,
            last_evaluated_at = now()
          returning id, (xmax = 0) as created
        `,
        [
          candidateA,
          candidateB,
          assessment.riskLevel,
          assessment.riskScore,
          assessment.requiresHumanReview,
          assessment.requiresManagementApproval
        ]
      );
      const review = reviewRows[0];
      reviewIds.push(review.id);
      await query(
        `
          delete from hiring_connected_candidate_signals
          where review_id = $1
        `,
        [review.id]
      );
      for (const signal of assessment.signals) {
        await query(
          `
            insert into hiring_connected_candidate_signals (
              review_id, signal_type, signal_weight, confidence, safe_details
            )
            values ($1, $2, $3, $4, $5::jsonb)
          `,
          [
            review.id,
            signal.type,
            signal.weight,
            signal.confidence,
            JSON.stringify({
              similarity:
                signal.similarity === undefined
                  ? null
                  : Number(signal.similarity.toFixed(4))
            })
          ]
        );
      }
      const controls = assessment.recommendedControls;
      await query(
        `
          insert into hiring_connected_candidate_controls (
            review_id, separate_assessors, separate_reporting_lines,
            restricted_cross_system_access, enhanced_probation_monitoring,
            no_direct_work_allocation_authority, no_shared_approval_chain,
            post_joining_audit_required
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (review_id) do nothing
        `,
        [
          review.id,
          controls.separateAssessors,
          controls.separateReportingLines,
          controls.restrictedCrossSystemAccess,
          controls.enhancedProbationMonitoring,
          controls.noDirectWorkAllocationAuthority,
          controls.noSharedApprovalChain,
          controls.postJoiningAuditRequired
        ]
      );
      await query(
        `
          insert into hiring_connected_candidate_audit (
            review_id, actor_type, action, safe_metadata
          )
          values ($1, 'system', $2, $3::jsonb)
        `,
        [
          review.id,
          review.created ? "risk_flag_created" : "risk_flag_updated",
          JSON.stringify({
            riskLevel: assessment.riskLevel,
            riskScore: assessment.riskScore,
            signalTypes: assessment.signals.map((signal) => signal.type),
            automaticRejection: false
          })
        ]
      );
    }

    return {
      candidateReference: candidate.candidate_reference,
      reviewIds,
      relationshipDisclosureRecorded: true
    };
  });
}
