import assert from "node:assert/strict";
import test from "node:test";
import { assessmentAccommodationSchema, resolveAssessmentAccommodation } from "../../lib/hiring/accommodations";

test("assessment accommodations default to protected standard behaviour", () => {
  assert.deepEqual(resolveAssessmentAccommodation(undefined), {
    extraTimeMinutes: 0,
    questionCopyAllowed: false,
    answerPasteAllowed: false,
    screenReaderMode: false,
    alternateAssessment: false,
    vivaHeavy: false
  });
});

test("enabled accommodations require an audited reason", () => {
  assert.equal(assessmentAccommodationSchema.safeParse({
    extraTimeMinutes: 30,
    questionCopyAllowed: true
  }).success, false);
  assert.equal(assessmentAccommodationSchema.safeParse({
    extraTimeMinutes: 30,
    questionCopyAllowed: true,
    answerPasteAllowed: false,
    screenReaderMode: false,
    alternateAssessment: false,
    vivaHeavy: false,
    reason: "Approved accessibility accommodation"
  }).success, true);
});
