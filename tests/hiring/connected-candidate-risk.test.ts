import assert from "node:assert/strict";
import test from "node:test";
import {
  assessConnectedCandidates,
  canFinalizeCandidateOffer
} from "../../lib/hiring/connected-candidate-risk";

const writer = {
  role: "Writer",
  reportingLineReference: "writer-team-a",
  accessDomains: ["customer_data", "work_allocation"]
};
const sales = {
  role: "Business Development Executive - Sales",
  reportingLineReference: "sales-team-a",
  accessDomains: ["customer_data", "payment_access"]
};

test("same IP alone stays low risk and never auto-rejects", () => {
  const result = assessConnectedCandidates({
    left: writer,
    right: { ...sales, accessDomains: ["payment_access"] },
    evidence: [{ type: "same_ip", confidence: "low" }]
  });

  assert.equal(result.riskLevel, "low");
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.automaticRejection, false);
});

test("same device requires human review without automatic rejection", () => {
  const result = assessConnectedCandidates({
    left: writer,
    right: { ...sales, accessDomains: ["payment_access"] },
    evidence: [{ type: "same_device_fingerprint", confidence: "high" }]
  });

  assert.equal(result.riskLevel, "review");
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.automaticRejection, false);
});

test("declared relationship creates a review signal", () => {
  const result = assessConnectedCandidates({
    left: writer,
    right: { ...sales, accessDomains: ["payment_access"] },
    evidence: [
      { type: "declared_personal_relationship", confidence: "high" }
    ]
  });

  assert.equal(result.riskLevel, "review");
  assert.equal(result.requiresHumanReview, true);
});

test("undeclared relationship can be reviewed when later evidence is discovered", () => {
  const result = assessConnectedCandidates({
    left: writer,
    right: { ...sales, accessDomains: ["payment_access"] },
    evidence: [
      { type: "same_emergency_contact", confidence: "high" },
      { type: "same_address", confidence: "high" }
    ]
  });

  assert.equal(result.riskLevel, "high");
  assert.equal(result.requiresManagementApproval, true);
});

test("writer and sales with shared customer access receives separation controls", () => {
  const result = assessConnectedCandidates({
    left: writer,
    right: sales,
    evidence: [
      { type: "same_device_fingerprint", confidence: "high" }
    ]
  });

  assert.equal(result.sensitiveRolePair, "writer_sales");
  assert.equal(result.riskLevel, "high");
  assert.equal(result.recommendedControls.separateAssessors, true);
  assert.equal(result.recommendedControls.restrictedCrossSystemAccess, true);
  assert.equal(
    result.recommendedControls.noDirectWorkAllocationAuthority,
    true
  );
  assert.equal(result.recommendedControls.noSharedApprovalChain, true);
});

test("false-positive human decision permits progression", () => {
  const assessment = assessConnectedCandidates({
    left: writer,
    right: sales,
    evidence: [{ type: "same_device_fingerprint", confidence: "high" }]
  });

  assert.equal(
    canFinalizeCandidateOffer({
      assessment,
      reviewStatus: "false_positive",
      finalOfferApproved: false
    }),
    true
  );
});

test("high-risk review blocks offer until Super Admin approval", () => {
  const assessment = assessConnectedCandidates({
    left: writer,
    right: sales,
    evidence: [
      { type: "same_device_fingerprint", confidence: "high" }
    ]
  });

  assert.equal(
    canFinalizeCandidateOffer({
      assessment,
      reviewStatus: "approved",
      finalOfferApproved: false
    }),
    false
  );
  assert.equal(
    canFinalizeCandidateOffer({
      assessment,
      reviewStatus: "approved",
      finalOfferApproved: true
    }),
    true
  );
});

test("operations and accounts-sensitive role pairs are detected", () => {
  const writerOperations = assessConnectedCandidates({
    left: { role: "Writer", accessDomains: [] },
    right: { role: "Operations Manager", accessDomains: [] },
    evidence: [{ type: "same_address", confidence: "high" }]
  });
  const salesAccounts = assessConnectedCandidates({
    left: { role: "Sales", accessDomains: [] },
    right: { role: "Accounts", accessDomains: [] },
    evidence: [{ type: "same_address", confidence: "high" }]
  });

  assert.equal(writerOperations.sensitiveRolePair, "writer_operations");
  assert.equal(salesAccounts.sensitiveRolePair, "sales_accounts");
});
