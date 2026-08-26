export const connectedCandidateSignalTypes = [
  "same_ip",
  "same_device_fingerprint",
  "same_browser_device_profile",
  "same_address",
  "same_referral_source",
  "same_emergency_contact",
  "shared_uploaded_file_metadata",
  "declared_personal_relationship",
  "overlapping_application_timing",
  "unusual_answer_similarity",
  "repeated_identical_language",
  "same_voice_script_pattern",
  "same_assessment_session_behaviour",
  "same_reporting_line",
  "shared_sensitive_access"
] as const;

export type ConnectedCandidateSignalType =
  (typeof connectedCandidateSignalTypes)[number];

export type ConnectedCandidateRiskLevel = "low" | "review" | "high";

export type SignalEvidence = {
  type: ConnectedCandidateSignalType;
  confidence?: "low" | "medium" | "high";
  similarity?: number;
};

export type CandidateConnectionContext = {
  role: string;
  reportingLineReference?: string | null;
  accessDomains?: string[];
};

export type ConnectedCandidateAssessment = {
  riskLevel: ConnectedCandidateRiskLevel;
  riskScore: number;
  signals: Array<{
    type: ConnectedCandidateSignalType;
    weight: number;
    confidence: "low" | "medium" | "high";
    similarity?: number;
  }>;
  linkReasons: string[];
  requiresHumanReview: boolean;
  requiresManagementApproval: boolean;
  automaticRejection: false;
  sensitiveRolePair: string | null;
  recommendedControls: ConnectedCandidateControls;
};

export type ConnectedCandidateControls = {
  separateAssessors: boolean;
  separateReportingLines: boolean;
  restrictedCrossSystemAccess: boolean;
  enhancedProbationMonitoring: boolean;
  noDirectWorkAllocationAuthority: boolean;
  noSharedApprovalChain: boolean;
  postJoiningAuditRequired: boolean;
};

export type ConnectedCandidateDecision =
  | "approved_no_additional_controls"
  | "approved_with_controls"
  | "declined_after_review"
  | "false_positive";
