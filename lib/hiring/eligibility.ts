import type { HiringRole } from "@/lib/hiring/domain";

export type EligibilityRule = {
  key: string;
  label: string;
  weight: number;
  passed: boolean;
  reason: string;
};

export type EligibilityReview = {
  role: HiringRole;
  rules: EligibilityRule[];
  automatedScore: number;
  outcome: "review" | "eligible";
  automaticRejection: false;
};

export const eligibilityChecksByRole = {
  academic_writer: [
    { key: "full_time_commitment", label: "Full-time employment commitment", weight: 20 },
    { key: "qualification", label: "Relevant qualification", weight: 20 },
    { key: "subject_expertise", label: "Subject expertise", weight: 20 },
    { key: "written_english", label: "Written English evidence", weight: 20 },
    { key: "research_editing", label: "Research or editing evidence", weight: 20 },
    { key: "integrity_declaration", label: "Integrity and AI disclosure", weight: 20 }
  ],
  sales_executive: [
    { key: "full_time_commitment", label: "Full-time employment commitment", weight: 20 },
    { key: "communication", label: "Customer communication evidence", weight: 20 },
    { key: "language_capability", label: "Approved language capability", weight: 20 },
    { key: "lead_handling", label: "Lead and objection-handling evidence", weight: 20 },
    { key: "crm_readiness", label: "CRM and process readiness", weight: 20 },
    { key: "integrity_declaration", label: "Integrity declaration", weight: 20 }
  ]
} as const satisfies Record<HiringRole, ReadonlyArray<{ key: string; label: string; weight: number }>>;

export type EligibilityCheckKey =
  (typeof eligibilityChecksByRole)[HiringRole][number]["key"];

export function buildEligibilityRules(
  role: HiringRole,
  checks: Record<string, boolean>,
  reasons: Partial<Record<string, string>> = {}
): EligibilityRule[] {
  return eligibilityChecksByRole[role].map((rule) => ({
    ...rule,
    passed: checks[rule.key] === true,
    reason:
      reasons[rule.key]?.trim() ||
      (checks[rule.key] === true ? "Reviewed and supported." : "Requires human review.")
  }));
}

export function calculateEligibility(
  role: HiringRole,
  rules: EligibilityRule[]
): EligibilityReview {
  const totalWeight = rules.reduce((sum, rule) => sum + Math.max(rule.weight, 0), 0);
  const passedWeight = rules.reduce(
    (sum, rule) => sum + (rule.passed ? Math.max(rule.weight, 0) : 0),
    0
  );
  const automatedScore = totalWeight
    ? Math.round((passedWeight / totalWeight) * 100)
    : 0;

  return {
    role,
    rules,
    automatedScore,
    outcome: automatedScore >= 60 ? "eligible" : "review",
    automaticRejection: false
  };
}
