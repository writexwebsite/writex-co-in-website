import assert from "node:assert/strict";
import test from "node:test";
import { validateAndNormalizePhone } from "../../lib/tools/phone";
import { scoreToolLead } from "../../lib/tools/leadScoring";
import { routeToolLead } from "../../lib/tools/routing";

test("normalizes a genuine phone number to E.164", () => {
  const result = validateAndNormalizePhone("81009 77068", "IN");
  assert.equal(result.normalized, "+918100977068");
  assert.equal(result.valid, true);
  assert.equal(result.confidence, "medium");
});

test("rejects impossible repeated patterns", () => {
  const result = validateAndNormalizePhone("9999999999", "IN");
  assert.equal(result.valid, false);
  assert.equal(result.confidence, "suspicious");
});

test("scores a completed high-intent builder lead", () => {
  const result = scoreToolLead({ phoneConfidence: "high", emailProvided: true, completed: true, previewGenerated: true, deadlineProvided: true, programmeOrCountryProvided: true, whatsappClicked: true, completionPercent: 100 });
  assert.equal(result.score, 100);
  assert.equal(result.category, "hot");
});

test("routes SOP leads to the admissions queue", () => {
  const result = routeToolLead({ toolType: "sop_builder", category: "qualified", programmeOrRole: "MSc Management" });
  assert.equal(result.queue, "SOP & Admissions");
  assert.equal(result.slaMinutes, 15);
  assert.match(result.suggestedMessage, /MSc Management/);
});

test("routes dissertation templates to research teams", () => {
  const result = routeToolLead({ toolType: "template", templateId: "dissertation-proposal-outline", category: "qualified" });
  assert.equal(result.queue, "Dissertation");
  assert.equal(result.slaMinutes, 120);
});

