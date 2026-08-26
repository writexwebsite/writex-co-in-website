import assert from "node:assert/strict";
import test from "node:test";
import { assertProtectedQuestionMutationAllowed, generateAssessmentForm } from "../../lib/hiring/assessment-engine";

const questions = [
  { id: "00000000-0000-4000-8000-000000000001", version: 1, role: "academic_writer" as const, category: "editing", section: "Writing", difficulty: "intermediate" as const, prompt: "Edit the controlled paragraph.", protected: true, active: true },
  { id: "00000000-0000-4000-8000-000000000002", version: 2, role: "academic_writer" as const, category: "referencing", section: "Sources", difficulty: "intermediate" as const, prompt: "Review the source references.", protected: false, active: true, variants: ["Review source set A.", "Review source set B."] },
  { id: "00000000-0000-4000-8000-000000000003", version: 1, role: "sales_executive" as const, category: "closing", section: "Sales", difficulty: "foundation" as const, prompt: "Respond to the scenario.", protected: true, active: true }
];

test("assessment forms keep exact versions and exclude other roles", () => {
  const form = generateAssessmentForm({ role: "academic_writer", questions });
  assert.equal(form.length, 2);
  assert.deepEqual(new Set(form.map((item) => item.questionId)).size, 2);
  assert.ok(form.every((item) => item.version > 0 && item.contentHash.length === 64));
});

test("protected base questions reject normal edit and delete", () => {
  assert.throws(() => assertProtectedQuestionMutationAllowed({ protectedQuestion: true, operation: "edit" }), /founder-authorised/);
  assert.throws(() => assertProtectedQuestionMutationAllowed({ protectedQuestion: true, operation: "delete" }), /founder-authorised/);
  assert.doesNotThrow(() => assertProtectedQuestionMutationAllowed({ protectedQuestion: true, operation: "deactivate" }));
});

