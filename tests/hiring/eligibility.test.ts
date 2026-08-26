import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEligibilityRules,
  calculateEligibility
} from "../../lib/hiring/eligibility";

test("eligibility remains reviewable and never auto rejects", () => {
  const result = calculateEligibility("academic_writer", [
    { key: "subject", label: "Subject fit", weight: 60, passed: false, reason: "Needs review" },
    { key: "availability", label: "Availability", weight: 40, passed: true, reason: "Available" }
  ]);
  assert.equal(result.automatedScore, 40);
  assert.equal(result.outcome, "review");
  assert.equal(result.automaticRejection, false);
});

test("eligibility weights produce a transparent eligible outcome", () => {
  const result = calculateEligibility("sales_executive", [
    { key: "communication", label: "Communication", weight: 50, passed: true, reason: "Meets requirement" },
    { key: "experience", label: "Experience", weight: 30, passed: true, reason: "Meets requirement" },
    { key: "notice", label: "Notice period", weight: 20, passed: false, reason: "Review" }
  ]);
  assert.equal(result.automatedScore, 80);
  assert.equal(result.outcome, "eligible");
  assert.equal(result.rules.length, 3);
});

test("role eligibility uses the approved fixed evidence checks", () => {
  const rules = buildEligibilityRules("academic_writer", {
    full_time_commitment: true,
    qualification: true,
    subject_expertise: true,
    written_english: true,
    research_editing: false,
    integrity_declaration: true,
    injected_unapproved_rule: true
  });
  assert.equal(rules.length, 6);
  assert.equal(rules.some((rule) => rule.key === "injected_unapproved_rule"), false);
  const result = calculateEligibility("academic_writer", rules);
  assert.equal(result.automatedScore, 83);
  assert.equal(result.automaticRejection, false);
});
