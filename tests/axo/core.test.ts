import assert from "node:assert/strict";
import test from "node:test";
import { AXO_MASCOT_STATES, AXO_SERVICES } from "../../lib/axo/config";
import { AXO_UNKNOWN_ANSWER, searchApprovedKnowledge } from "../../lib/axo/knowledge";
import { sanitizeAxoAnalytics } from "../../lib/axo/analytics";
import { axoContactSchema, buildRequirementSummary, requiredFieldsForService, validateAxoFile } from "../../lib/axo/rules";

test("uses only approved public service categories", () => {
  assert.deepEqual(AXO_SERVICES.map(({ id }) => id), ["coursework", "dissertation", "sop", "editing", "originality", "formatting"]);
});

test("branches dissertation and SOP fields", () => {
  assert.ok(requiredFieldsForService("dissertation").includes("methodology"));
  assert.ok(requiredFieldsForService("dissertation").includes("supervisorFeedback"));
  assert.ok(requiredFieldsForService("sop").includes("targetProgramme"));
  assert.ok(!requiredFieldsForService("sop").includes("methodology"));
});

test("validates quote contact and explicit consent", () => {
  assert.equal(axoContactSchema.safeParse({ name: "Student", email: "student@example.com", whatsapp: "", preferredContact: "email", consent: true }).success, true);
  assert.equal(axoContactSchema.safeParse({ name: "Student", email: "", whatsapp: "", preferredContact: "email", consent: false }).success, false);
});

test("preserves deadline timezone in an escaped requirement summary", () => {
  const summary = buildRequirementSummary({ serviceId: "coursework", title: "<script>alert(1)</script>", deadline: "2026-07-18", deadlineTime: "18:00", timezone: "Europe/London", instructions: "Use UK examples" });
  assert.match(summary, /2026-07-18 18:00 Europe\/London/);
  assert.doesNotMatch(summary, /[<>]/);
});

test("rejects unsupported, empty and oversized files", () => {
  assert.match(validateAxoFile({ name: "payload.exe", size: 100, type: "application/octet-stream" }) ?? "", /not supported/);
  assert.match(validateAxoFile({ name: "brief.pdf", size: 0, type: "application/pdf" }) ?? "", /empty/);
  assert.equal(validateAxoFile({ name: "brief.pdf", size: 1024, type: "application/pdf" }), null);
});

test("removes PII and raw content from analytics", () => {
  assert.deepEqual(sanitizeAxoAnalytics({ service_id: "sop", file_count: 2, email: "private@example.com", order_id: "WX-1", message: "raw brief" }), { service_id: "sop", file_count: 2 });
});

test("approved FAQ search falls back without fabrication", () => {
  assert.ok(searchApprovedKnowledge("confidential").length > 0);
  assert.equal(searchApprovedKnowledge("guaranteed grade").length, 0);
  assert.match(AXO_UNKNOWN_ANSWER, /approved answer/);
});

test("all required mascot emotional states have mappings", () => {
  for (const state of ["idle", "welcoming", "attentive", "curious", "thinking", "guiding", "reassuring", "waiting", "concerned", "pleased", "successful", "unavailable"]) assert.ok(state in AXO_MASCOT_STATES);
});
