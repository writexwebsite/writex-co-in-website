import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Website Admin renders the corrected Delivery Trainer profile", async () => {
  const view = await read("components/admin/EmployeeControlPlane.tsx");
  for (const fact of [
    "Trainer / Evaluator",
    "Learning role",
    "All 26 Development lessons · Read only",
    "Assessment review scope",
    "All Development / Operations learners"
  ]) assert.match(view, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(view, /!isStoredDeliveryTrainer \? <WebsiteDeliveryLearningAssignment/);
});

test("Website Admin AXO returns a no-learning Trainer entitlement contract", async () => {
  const control = await read("lib/axo/admin-control.ts");
  assert.match(control, /TRAINER_EVALUATOR/);
  assert.match(control, /learningRole: "NONE"/);
  assert.match(control, /ALL_26_DEVELOPMENT_LESSONS_READ_ONLY/);
  assert.match(control, /ALL_DEVELOPMENT_OPERATIONS_LEARNER_ASSESSMENTS/);
  assert.match(control, /learningAssignment: isDeliveryTrainer \? null/);
  for (const action of ["CLAIM_REVIEW", "SAVE_REVIEW_DRAFT", "COMPLETE_ASSESSMENT_REVIEW", "ESCALATE_ASSESSMENT_REVIEW"]) {
    assert.match(control, new RegExp(action));
  }
});
