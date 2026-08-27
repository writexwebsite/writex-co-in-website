export const WRITEX_ID_MIN_LENGTH = 5;
export const WRITEX_ID_MAX_LENGTH = 30;

const RESERVED_WRITEX_IDS = new Set([
  "admin",
  "administrator",
  "api",
  "billing",
  "help",
  "invoice",
  "login",
  "manager",
  "mywritex",
  "root",
  "security",
  "support",
  "writex",
]);

// This deliberately small local list proves the filtering hook. The production
// implementation must use an approved, versioned moderation source.
const BLOCKED_FRAGMENTS = ["abuseword", "offensiveword"];

export function normalizeWriteXId(value: string) {
  return value.normalize("NFKC").trim().replace(/^@+/, "").toLowerCase();
}

export function validateWriteXId(value: string) {
  const normalized = normalizeWriteXId(value);
  if (
    normalized.length < WRITEX_ID_MIN_LENGTH ||
    normalized.length > WRITEX_ID_MAX_LENGTH
  ) {
    return { normalized, valid: false, reason: "length" as const };
  }
  if (!/^[a-z][a-z0-9._-]*[a-z0-9]$/.test(normalized)) {
    return { normalized, valid: false, reason: "format" as const };
  }
  if (RESERVED_WRITEX_IDS.has(normalized)) {
    return { normalized, valid: false, reason: "reserved" as const };
  }
  if (BLOCKED_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
    return { normalized, valid: false, reason: "blocked" as const };
  }
  if (/^(?:inv|invoice|wx[-_.]?\d)/.test(normalized)) {
    return { normalized, valid: false, reason: "invoice_conflict" as const };
  }
  return { normalized, valid: true, reason: null };
}

function stableSuffix(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 3).padEnd(3, "2");
}

export function checkWriteXIdAvailability(
  candidate: string,
  existingIds: Iterable<string>,
) {
  const validation = validateWriteXId(candidate);
  const existing = new Set(Array.from(existingIds, normalizeWriteXId));
  const available = validation.valid && !existing.has(validation.normalized);
  const compactBase = validation.normalized
    .replace(/[^a-z0-9]/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, WRITEX_ID_MAX_LENGTH - 4);
  const safeBase = compactBase.length >= WRITEX_ID_MIN_LENGTH ? compactBase : "client";
  const suggestions = [
    `${safeBase}.${stableSuffix(validation.normalized || candidate)}`,
    `${safeBase}-${stableSuffix(`${candidate}:alternate`)}`,
  ].filter((suggestion) => !existing.has(suggestion));

  return {
    normalized: validation.normalized,
    available,
    reason: validation.valid
      ? available
        ? null
        : ("unavailable" as const)
      : validation.reason,
    suggestions,
  };
}

export function normalizeRegisteredPhone(value: string) {
  const nfkc = value.normalize("NFKC").trim();
  const hasInternationalPrefix = nfkc.startsWith("+") || nfkc.startsWith("00");
  const digits = nfkc.replace(/\D/g, "");
  const internationalDigits = nfkc.startsWith("00") ? digits.slice(2) : digits;
  if (!hasInternationalPrefix || !/^\d{8,15}$/.test(internationalDigits)) return null;
  return `+${internationalDigits}`;
}

export function classifyPortalIdentifier(value: string) {
  const normalized = value.normalize("NFKC").trim();
  return /^wx[-_]/i.test(normalized)
    ? ({ kind: "invoice" as const, normalized: normalized.toUpperCase() })
    : ({ kind: "writex_id" as const, normalized: normalizeWriteXId(normalized) });
}

export type DuplicateCandidate = Readonly<{
  customerRef: string;
  name?: string;
  normalizedPhones?: readonly string[];
  verifiedEmails?: readonly string[];
  phoneAliases?: readonly string[];
  emailAliases?: readonly string[];
  invoiceEvidenceCount?: number;
}>;

export type DuplicateSuggestion = Readonly<{
  status: "Suggested Duplicate";
  confidence: "high" | "medium" | "low";
  reasons: readonly string[];
  autoMergeAllowed: false;
}>;

function overlap(left: readonly string[] = [], right: readonly string[] = []) {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.some((value) => rightSet.has(value.toLowerCase()));
}

export function suggestDuplicateCustomers(
  left: DuplicateCandidate,
  right: DuplicateCandidate,
): DuplicateSuggestion {
  const reasons: string[] = [];
  let confidence: DuplicateSuggestion["confidence"] = "low";

  if (overlap(left.normalizedPhones, right.normalizedPhones)) {
    confidence = "high";
    reasons.push("exact_normalized_phone");
  }
  if (overlap(left.verifiedEmails, right.verifiedEmails)) {
    confidence = "high";
    reasons.push("exact_verified_email");
  }
  if (
    confidence !== "high" &&
    (overlap(left.phoneAliases, right.normalizedPhones) ||
      overlap(right.phoneAliases, left.normalizedPhones))
  ) {
    confidence = "medium";
    reasons.push("phone_alias_history");
  }
  if (
    confidence !== "high" &&
    (overlap(left.emailAliases, right.verifiedEmails) ||
      overlap(right.emailAliases, left.verifiedEmails))
  ) {
    confidence = "medium";
    reasons.push("email_alias_history");
  }
  if (
    confidence === "low" &&
    left.name &&
    right.name &&
    left.name.trim().toLowerCase() === right.name.trim().toLowerCase()
  ) {
    reasons.push("name_only");
  }
  if (
    confidence === "low" &&
    (left.invoiceEvidenceCount ?? 0) >= 2 &&
    (right.invoiceEvidenceCount ?? 0) >= 2
  ) {
    confidence = "medium";
    reasons.push("repeated_invoice_contact_evidence");
  }

  return {
    status: "Suggested Duplicate",
    confidence,
    reasons: reasons.length ? reasons : ["insufficient_evidence"],
    autoMergeAllowed: false,
  };
}

export type MergeImpactSource = Readonly<{
  invoices?: readonly string[];
  projects?: readonly string[];
  payments?: readonly string[];
  files?: readonly string[];
  managerHistory?: readonly string[];
  portalAccounts?: readonly string[];
}>;

export function buildMergeImpactPreview(...records: readonly MergeImpactSource[]) {
  const uniqueCount = (key: keyof MergeImpactSource) =>
    new Set(records.flatMap((record) => record[key] ?? [])).size;
  return {
    invoicesAffected: uniqueCount("invoices"),
    projectsAffected: uniqueCount("projects"),
    paymentsAffected: uniqueCount("payments"),
    filesAffected: uniqueCount("files"),
    managerHistoryAffected: uniqueCount("managerHistory"),
    portalAccountsAffected: uniqueCount("portalAccounts"),
    executable: false as const,
  };
}
