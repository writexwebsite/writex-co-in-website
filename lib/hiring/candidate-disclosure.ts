import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes
} from "crypto";
import { z } from "zod";

const safeText = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !/[<>]/.test(value), "HTML is not allowed.");

export const candidateRelationshipDisclosureSchema = z
  .object({
    knowsApplicantOrEmployee: z.boolean(),
    name: safeText.max(100).optional(),
    relationship: safeText.max(100).optional(),
    role: safeText.max(120).optional(),
    disclosureDetails: safeText.optional(),
    relatedCandidateReference: z.string().trim().min(6).max(100).optional()
  })
  .superRefine((value, context) => {
    if (!value.knowsApplicantOrEmployee) return;

    for (const field of [
      "name",
      "relationship",
      "role",
      "disclosureDetails"
    ] as const) {
      if (!value[field]) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "This field is required when a relationship is disclosed."
        });
      }
    }
  });

export type CandidateRelationshipDisclosure = z.infer<
  typeof candidateRelationshipDisclosureSchema
>;

function encryptionKey() {
  const encoded = process.env.HIRING_REVIEW_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("HIRING_REVIEW_ENCRYPTION_KEY is required.");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("HIRING_REVIEW_ENCRYPTION_KEY must be 32 bytes in base64.");
  }

  return key;
}

export function encryptHiringReviewValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value.trim(), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptHiringReviewValue(value: string | null) {
  if (!value) return null;
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (
    version !== "v1" ||
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {
    throw new Error("Unsupported hiring review encryption payload.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function hashHiringSignal(signalType: string, value: string) {
  const secret = process.env.HIRING_RISK_HMAC_SECRET;
  if (!secret) {
    throw new Error("HIRING_RISK_HMAC_SECRET is required.");
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");

  return createHmac("sha256", secret)
    .update(`${signalType}\0${normalized}`)
    .digest("hex");
}

export function createPrivateTextSignature(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = normalized.split(" ").filter(Boolean);
  const shingles = new Set<string>();
  for (let index = 0; index <= words.length - 3; index += 1) {
    shingles.add(words.slice(index, index + 3).join(" "));
  }

  return {
    exactHash: hashHiringSignal("text_exact", normalized),
    signatureHashes: Array.from(shingles)
      .slice(0, 500)
      .map((value) => hashHiringSignal("text_shingle", value))
  };
}

export function signatureSimilarity(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;
  for (const value of leftSet) {
    if (rightSet.has(value)) intersection += 1;
  }
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
}
