import assert from "node:assert/strict";
import test from "node:test";
import { hiringOperationSchema } from "../../lib/hiring/operations-schema";
import { questionInputSchema } from "../../lib/hiring/question-bank-schema";
import { hasSupportedHiringFileSignature } from "../../lib/hiring/file-signatures";

test("interview operations require canonical datetimes", () => {
  const valid = hiringOperationSchema.safeParse({
    resource: "interview",
    applicationReference: "WX-HR-TEST123",
    action: "schedule",
    interviewType: "screening",
    interviewerAdminUserId: "11111111-1111-4111-8111-111111111111",
    scheduledAt: "2026-07-30T10:30:00.000Z",
    durationMinutes: 30,
    reason: "Production QA scheduling check"
  });
  assert.equal(valid.success, true);
  const invalid = hiringOperationSchema.safeParse({
    resource: "interview",
    applicationReference: "WX-HR-TEST123",
    action: "schedule",
    scheduledAt: "2026-07-30T10:30",
    reason: "Production QA scheduling check"
  });
  assert.equal(invalid.success, false);
});

test("eligibility review requires a separate human outcome and rationale", () => {
  const valid = hiringOperationSchema.safeParse({
    resource: "eligibility",
    applicationReference: "WX-HR-TEST123",
    checks: {
      qualification: true,
      subject_expertise: true,
      written_english: true,
      research_editing: false,
      integrity_declaration: true
    },
    reviewerOutcome: "review",
    notes: "Research evidence requires a human follow-up.",
    reason: "Initial eligibility review"
  });
  assert.equal(valid.success, true);
  const automaticReject = hiringOperationSchema.safeParse({
    resource: "eligibility",
    applicationReference: "WX-HR-TEST123",
    checks: {},
    reviewerOutcome: "rejected",
    notes: "Automated rejection must not be supported.",
    reason: "Unsafe automated outcome"
  });
  assert.equal(automaticReject.success, false);
});

test("integrity review requires explicit human confirmation and has no reject outcome", () => {
  const valid = hiringOperationSchema.safeParse({
    resource: "integrity_review",
    sessionReference: "WX-AS-TEST123",
    outcome: "requires_viva",
    notes: "Focus changes require a viva follow-up, not an automated decision.",
    reason: "Human integrity review",
    explicitConfirmation: true
  });
  assert.equal(valid.success, true);
  const rejected = hiringOperationSchema.safeParse({
    resource: "integrity_review",
    sessionReference: "WX-AS-TEST123",
    outcome: "auto_reject",
    notes: "Unsafe automated outcome.",
    reason: "Automated decision",
    explicitConfirmation: true
  });
  assert.equal(rejected.success, false);
});

test("verification decisions accept only approved human outcomes", () => {
  const completionChecklist = {
    consentRecorded: true,
    identityReviewed: true,
    educationReviewed: true,
    backgroundMethodRecorded: true,
    reportOrSourceAvailable: true,
    identityMatchReviewed: true,
    clarificationReviewed: true,
    discrepanciesDisplayed: true,
    reviewerRecommendationAvailable: true
  };
  const approved = hiringOperationSchema.safeParse({
    resource: "verification",
    applicationReference: "WX-HR-TEST123",
    action: "decide",
    verificationType: "background",
    decision: "approved_with_conditions",
    notes: "Manual evidence was reviewed by an authorised person.",
    conditions: ["Enhanced probation review"],
    evidenceReviewed: ["consent", "background report", "candidate clarification"],
    completionChecklist,
    explicitConfirmation: true,
    reason: "Human verification decision"
  });
  assert.equal(approved.success, true);
  const unsupported = hiringOperationSchema.safeParse({
    resource: "verification",
    applicationReference: "WX-HR-TEST123",
    action: "decide",
    verificationType: "background",
    decision: "criminal_cleared",
    notes: "Unsupported conclusion",
    reason: "Machine decision"
  });
  assert.equal(unsupported.success, false);
});

test("verification decisions require evidence and explicit human confirmation", () => {
  const incomplete = hiringOperationSchema.safeParse({
    resource: "verification",
    applicationReference: "WX-HR-TEST123",
    action: "decide",
    verificationType: "education",
    decision: "approved_for_hiring",
    notes: "A decision without evidence must not be accepted.",
    reason: "Missing decision controls"
  });
  assert.equal(incomplete.success, false);
  const conditionalWithoutConditions = hiringOperationSchema.safeParse({
    resource: "verification",
    applicationReference: "WX-HR-TEST123",
    action: "decide",
    verificationType: "background",
    decision: "approved_with_conditions",
    notes: "Conditions were not supplied.",
    evidenceReviewed: ["consent", "report"],
    completionChecklist: {
      consentRecorded: true,
      identityReviewed: true,
      educationReviewed: true,
      backgroundMethodRecorded: true,
      reportOrSourceAvailable: true,
      identityMatchReviewed: true,
      clarificationReviewed: true,
      discrepanciesDisplayed: true,
      reviewerRecommendationAvailable: true
    },
    explicitConfirmation: true,
    reason: "Conditional approval validation"
  });
  assert.equal(conditionalWithoutConditions.success, false);
});

test("custom question input rejects HTML and accepts practical rubrics", () => {
  assert.equal(questionInputSchema.safeParse({
    role: "academic_writer",
    title: "Evidence-based revision plan",
    category: "analysis",
    section: "written",
    difficulty: "advanced",
    prompt: "Explain the evidence-based revision plan.",
    variants: [],
    scoringRubric: { reasoning: 60, clarity: 40 },
    expectedCompetencies: ["analysis"],
    active: false,
    changeReason: "Add a reviewed custom production question"
  }).success, true);
  assert.equal(questionInputSchema.safeParse({
    role: "academic_writer",
    title: "Unsafe question",
    category: "analysis",
    section: "written",
    difficulty: "advanced",
    prompt: "<script>alert(1)</script>",
    changeReason: "Unsafe test"
  }).success, false);
});

test("candidate upload signature validation blocks disguised content", () => {
  assert.equal(hasSupportedHiringFileSignature(Buffer.from("%PDF-1.7\n"), "application/pdf"), true);
  assert.equal(hasSupportedHiringFileSignature(Buffer.from("not a pdf"), "application/pdf"), false);
  assert.equal(hasSupportedHiringFileSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), true);
  assert.equal(hasSupportedHiringFileSignature(Buffer.from([0x4d, 0x5a, 0x90, 0x00]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), false);
});

test("notification retry is explicit and limited to approved application notices", () => {
  const valid = hiringOperationSchema.safeParse({
    resource: "application",
    applicationReference: "WX-HR-TEST123",
    action: "retry_notification",
    notificationType: "internal_hiring_alert",
    reason: "Retry after reviewing the recorded provider failure"
  });
  assert.equal(valid.success, true);

  const unsafe = hiringOperationSchema.safeParse({
    resource: "application",
    applicationReference: "WX-HR-TEST123",
    action: "retry_notification",
    notificationType: "arbitrary_recipient",
    reason: "Unsafe recipient override"
  });
  assert.equal(unsafe.success, false);
});
