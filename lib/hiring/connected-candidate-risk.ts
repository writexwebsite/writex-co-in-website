import type {
  CandidateConnectionContext,
  ConnectedCandidateAssessment,
  ConnectedCandidateControls,
  ConnectedCandidateSignalType,
  SignalEvidence
} from "@/lib/hiring/connected-candidate-types";

const signalWeights: Record<ConnectedCandidateSignalType, number> = {
  same_ip: 8,
  same_device_fingerprint: 34,
  same_browser_device_profile: 8,
  same_address: 28,
  same_referral_source: 5,
  same_emergency_contact: 38,
  shared_uploaded_file_metadata: 24,
  declared_personal_relationship: 30,
  overlapping_application_timing: 7,
  unusual_answer_similarity: 20,
  repeated_identical_language: 22,
  same_voice_script_pattern: 20,
  same_assessment_session_behaviour: 15,
  same_reporting_line: 15,
  shared_sensitive_access: 18
};

const signalLabels: Record<ConnectedCandidateSignalType, string> = {
  same_ip: "Shared network indicator",
  same_device_fingerprint: "Shared device indicator",
  same_browser_device_profile: "Matching browser/device profile",
  same_address: "Matching declared address",
  same_referral_source: "Matching referral source",
  same_emergency_contact: "Matching emergency contact",
  shared_uploaded_file_metadata: "Matching uploaded-file metadata",
  declared_personal_relationship: "Declared personal relationship",
  overlapping_application_timing: "Overlapping application timing",
  unusual_answer_similarity: "Unusual answer similarity",
  repeated_identical_language: "Repeated identical language",
  same_voice_script_pattern: "Matching voice-script pattern",
  same_assessment_session_behaviour: "Matching assessment-session behaviour",
  same_reporting_line: "Candidates may enter the same reporting line",
  shared_sensitive_access: "Roles may share customer, work, or payment access"
};

const sensitiveAccessDomains = new Set([
  "customer_data",
  "work_allocation",
  "payment_access",
  "approval_authority"
]);

function normalizeRole(role: string) {
  return role.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function getSensitiveRolePair(leftRole: string, rightRole: string) {
  const roles = [normalizeRole(leftRole), normalizeRole(rightRole)];
  const includes = (value: string) =>
    roles.some((role) => role === value || role.includes(value));

  if (includes("writer") && includes("sales")) return "writer_sales";
  if (includes("writer") && includes("operations")) {
    return "writer_operations";
  }
  if (includes("sales") && includes("accounts")) return "sales_accounts";

  return null;
}

function haveSameReportingLine(
  left: CandidateConnectionContext,
  right: CandidateConnectionContext
) {
  return Boolean(
    left.reportingLineReference &&
      right.reportingLineReference &&
      left.reportingLineReference === right.reportingLineReference
  );
}

function haveSharedSensitiveAccess(
  left: CandidateConnectionContext,
  right: CandidateConnectionContext
) {
  const rightDomains = new Set(right.accessDomains ?? []);

  return (left.accessDomains ?? []).some(
    (domain) => sensitiveAccessDomains.has(domain) && rightDomains.has(domain)
  );
}

function withContextSignals(
  evidence: SignalEvidence[],
  left: CandidateConnectionContext,
  right: CandidateConnectionContext
) {
  const result = new Map<ConnectedCandidateSignalType, SignalEvidence>();
  for (const item of evidence) result.set(item.type, item);

  if (haveSameReportingLine(left, right)) {
    result.set("same_reporting_line", {
      type: "same_reporting_line",
      confidence: "high"
    });
  }
  if (haveSharedSensitiveAccess(left, right)) {
    result.set("shared_sensitive_access", {
      type: "shared_sensitive_access",
      confidence: "high"
    });
  }

  return Array.from(result.values());
}

function similarityWeight(item: SignalEvidence) {
  const base = signalWeights[item.type];
  if (item.similarity === undefined) return base;
  if (item.similarity < 0.7) return 0;

  return Math.round(base * Math.min(1, item.similarity));
}

function defaultControls({
  riskLevel,
  sensitiveRolePair,
  sameReportingLine,
  sharedSensitiveAccess
}: {
  riskLevel: ConnectedCandidateAssessment["riskLevel"];
  sensitiveRolePair: string | null;
  sameReportingLine: boolean;
  sharedSensitiveAccess: boolean;
}): ConnectedCandidateControls {
  const heightened = riskLevel === "high";
  const needsSeparation = Boolean(sensitiveRolePair) || sharedSensitiveAccess;

  return {
    separateAssessors: riskLevel !== "low",
    separateReportingLines: sameReportingLine || heightened,
    restrictedCrossSystemAccess: needsSeparation || heightened,
    enhancedProbationMonitoring: heightened,
    noDirectWorkAllocationAuthority: needsSeparation || heightened,
    noSharedApprovalChain: sharedSensitiveAccess || heightened,
    postJoiningAuditRequired: heightened
  };
}

export function assessConnectedCandidates({
  left,
  right,
  evidence
}: {
  left: CandidateConnectionContext;
  right: CandidateConnectionContext;
  evidence: SignalEvidence[];
}): ConnectedCandidateAssessment {
  const signals = withContextSignals(evidence, left, right)
    .map((item) => ({
      type: item.type,
      weight: similarityWeight(item),
      confidence: item.confidence ?? "medium",
      similarity: item.similarity
    }))
    .filter((item) => item.weight > 0);
  const sensitiveRolePair = getSensitiveRolePair(left.role, right.role);
  const sameReportingLine = signals.some(
    (item) => item.type === "same_reporting_line"
  );
  const sharedSensitiveAccess = signals.some(
    (item) => item.type === "shared_sensitive_access"
  );
  const strongSignalCount = signals.filter((item) => item.weight >= 20).length;
  const evidenceScore = signals.reduce((total, item) => total + item.weight, 0);
  const rolePairWeight = sensitiveRolePair && strongSignalCount > 0 ? 12 : 0;
  const riskScore = Math.min(100, evidenceScore + rolePairWeight);
  const highBySensitiveCombination = Boolean(
    sensitiveRolePair && strongSignalCount >= 1 && sharedSensitiveAccess
  );
  const riskLevel =
    riskScore >= 60 || highBySensitiveCombination
      ? "high"
      : riskScore >= 20 || strongSignalCount > 0
        ? "review"
        : "low";

  return {
    riskLevel,
    riskScore,
    signals,
    linkReasons: signals.map((item) => signalLabels[item.type]),
    requiresHumanReview: signals.length > 0,
    requiresManagementApproval: riskLevel === "high",
    automaticRejection: false,
    sensitiveRolePair,
    recommendedControls: defaultControls({
      riskLevel,
      sensitiveRolePair,
      sameReportingLine,
      sharedSensitiveAccess
    })
  };
}

export function canFinalizeCandidateOffer({
  assessment,
  reviewStatus,
  finalOfferApproved
}: {
  assessment: ConnectedCandidateAssessment;
  reviewStatus:
    | "pending_review"
    | "in_review"
    | "approved"
    | "declined"
    | "false_positive";
  finalOfferApproved: boolean;
}) {
  if (reviewStatus === "declined") return false;
  if (reviewStatus === "false_positive") return true;
  if (assessment.requiresHumanReview && reviewStatus !== "approved") {
    return false;
  }
  if (assessment.requiresManagementApproval && !finalOfferApproved) {
    return false;
  }

  return true;
}
