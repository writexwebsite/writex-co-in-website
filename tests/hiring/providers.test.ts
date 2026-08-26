import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTrustPublishingEligibility, getHiringHrmsProvider } from "../../lib/hiring/providers";

test("unavailable HRMS provider never fabricates success", async () => {
  const result = await getHiringHrmsProvider().createEmployeeFromCandidate("WX-HR-TEST");
  assert.equal(result.status, "not_ready");
  assert.match(result.safeFailureReason || "", /not connected/);
});

test("Trust publishing requires every approval gate", () => {
  const approved = evaluateTrustPublishingEligibility({ stage: "joined", hrmsStatus: "Active", employeeReference: "W9999", officialMobileAvailable: true, department: "Sales", designation: "Business Development Executive", publicVerificationApproved: true });
  assert.equal(approved.eligible, true);
  const blocked = evaluateTrustPublishingEligibility({ stage: "selected", hrmsStatus: "Active", employeeReference: "W9999", officialMobileAvailable: true, department: "Academic", designation: "Subject Matter Expert", publicVerificationApproved: true });
  assert.equal(blocked.eligible, false);
  assert.deepEqual(blocked.blockers, ["candidate_not_joined", "department_not_approved", "designation_not_approved"]);
});
