import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateRelationshipDisclosureSchema,
  createPrivateTextSignature,
  decryptHiringReviewValue,
  encryptHiringReviewValue,
  signatureSimilarity
} from "../../lib/hiring/candidate-disclosure";

process.env.HIRING_RISK_HMAC_SECRET = "test-risk-secret-with-at-least-32-bytes";
process.env.HIRING_REVIEW_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
  "base64"
);

test("relationship details are mandatory when candidate answers yes", () => {
  const result = candidateRelationshipDisclosureSchema.safeParse({
    knowsApplicantOrEmployee: true
  });

  assert.equal(result.success, false);
});

test("no relationship is valid without extra personal data", () => {
  const result = candidateRelationshipDisclosureSchema.safeParse({
    knowsApplicantOrEmployee: false
  });

  assert.equal(result.success, true);
});

test("relationship disclosure rejects HTML", () => {
  const result = candidateRelationshipDisclosureSchema.safeParse({
    knowsApplicantOrEmployee: true,
    name: "<script>alert(1)</script>",
    relationship: "Sibling",
    role: "Sales",
    disclosureDetails: "Applying in the same recruitment cycle."
  });

  assert.equal(result.success, false);
});

test("relationship details encrypt and decrypt without plaintext storage", () => {
  const encrypted = encryptHiringReviewValue("Declared sibling");

  assert.equal(encrypted.includes("Declared sibling"), false);
  assert.equal(decryptHiringReviewValue(encrypted), "Declared sibling");
});

test("similarity signatures identify repeated language without retaining raw text", () => {
  const left = createPrivateTextSignature(
    "I would review the brief, confirm the deadline, and communicate clearly."
  );
  const right = createPrivateTextSignature(
    "I would review the brief, confirm the deadline, and communicate clearly."
  );

  assert.equal(left.exactHash, right.exactHash);
  assert.equal(signatureSimilarity(left.signatureHashes, right.signatureHashes), 1);
  assert.equal(JSON.stringify(left).includes("review the brief"), false);
});

