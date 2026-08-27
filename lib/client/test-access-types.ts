export const clientTestProfileReferences = [
  "partially_paid",
  "fully_paid",
  "project_in_progress",
  "delivered"
] as const;

export type ClientTestProfileReference =
  (typeof clientTestProfileReferences)[number];

export const clientTestProfileOptions: Array<{
  value: ClientTestProfileReference;
  label: string;
  description: string;
}> = [
  {
    value: "partially_paid",
    label: "Partially Paid",
    description: "Sanitized billing data with an outstanding test balance."
  },
  {
    value: "fully_paid",
    label: "Fully Paid",
    description: "Sanitized billing data with a settled test balance."
  },
  {
    value: "project_in_progress",
    label: "Project In Progress",
    description: "Sanitized project data at the Work in Progress stage."
  },
  {
    value: "delivered",
    label: "Delivered",
    description: "Sanitized project data at the Delivered stage."
  }
];

export type ClientTestAccessStatus =
  | "active"
  | "used"
  | "expired"
  | "revoked";

export type ClientTestAccessRecord = {
  id: string;
  testId: string;
  testProfileReference: ClientTestProfileReference;
  testInvoiceReference: string;
  expiresAt: string;
  singleUse: boolean;
  usedAt: string | null;
  revokedAt: string | null;
  createdByAdminId: string;
  createdByEmail: string | null;
  createdAt: string;
  reason: string;
  lastUsedAt: string | null;
  status: ClientTestAccessStatus;
};

export type ClientTestAccessSummary = {
  active: number;
  used: number;
  expired: number;
  revoked: number;
  activeSessions: number;
};

export type ClientTestAccessAuditEvent = {
  id: string;
  eventType:
    | "generated"
    | "login_failed"
    | "login_succeeded"
    | "single_use_consumed"
    | "launched"
    | "revoked"
    | "security_revoked";
  result: "success" | "denied" | "failed";
  userAgentCategory: string | null;
  createdAt: string;
};

export function isClientPortalTestAccessEnabled() {
  return process.env.CLIENT_PORTAL_TEST_ACCESS_ENABLED === "true";
}

export function isClientTestProfileReference(
  value: string
): value is ClientTestProfileReference {
  return clientTestProfileReferences.includes(
    value as ClientTestProfileReference
  );
}

export function normalizeClientTestId(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeClientTestInvoiceReference(value: string) {
  return value.trim().toUpperCase();
}

export function isSafeClientTestInvoiceReference(value: string) {
  return /^WX-TEST-[A-Z0-9][A-Z0-9-]{3,63}$/.test(
    normalizeClientTestInvoiceReference(value)
  );
}

export function getClientTestAccessStatus({
  expiresAt,
  singleUse,
  usedAt,
  revokedAt,
  now = Date.now()
}: {
  expiresAt: string | Date;
  singleUse: boolean;
  usedAt: string | Date | null;
  revokedAt: string | Date | null;
  now?: number;
}): ClientTestAccessStatus {
  if (revokedAt) return "revoked";
  if (new Date(expiresAt).getTime() <= now) return "expired";
  if (singleUse && usedAt) return "used";
  return "active";
}

export function getUserAgentCategory(userAgent: string) {
  const value = userAgent.toLowerCase();
  if (!value || value === "unknown") return "unknown";
  if (/bot|crawler|spider|headless/.test(value)) return "automated";
  if (/ipad|tablet|kindle|silk/.test(value)) return "tablet";
  if (/mobile|iphone|android/.test(value)) return "mobile";
  return "desktop";
}
