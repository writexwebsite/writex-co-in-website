export const portalStageKeys = [
  "brief_received",
  "requirements_checked",
  "expert_assigned",
  "work_in_progress",
  "quality_review",
  "preview_ready",
  "payment_pending",
  "download_unlocked",
  "revision_requested",
  "closed"
] as const;

export type PortalStageKey = (typeof portalStageKeys)[number];

export type PortalStageStatus = "pending" | "active" | "complete";

// Future: replace placeholder mappings after WriteX provides final LTS status codes.
export const ltsStatusToPortalStage: Record<string, PortalStageKey> = {
  ORDER_CREATED: "brief_received",
  BRIEF_RECEIVED: "brief_received",
  REQUIREMENTS_CHECKED: "requirements_checked",
  ASSIGNED: "expert_assigned",
  EXPERT_ASSIGNED: "expert_assigned",
  IN_PROGRESS: "work_in_progress",
  QA_PENDING: "quality_review",
  QUALITY_REVIEW: "quality_review",
  COMPLETED: "preview_ready",
  PREVIEW_READY: "preview_ready",
  REVISION_REQUESTED: "revision_requested",
  DELIVERED: "closed",
  CLOSED: "closed"
};

// Future: replace placeholder mappings after WriteX provides final PMT status codes.
export const paymentStatusToPortalStage: Record<string, PortalStageKey> = {
  UNPAID: "payment_pending",
  PARTIAL: "payment_pending",
  PENDING_VERIFICATION: "payment_pending",
  PAID: "download_unlocked",
  SETTLED: "download_unlocked",
  APPROVED: "download_unlocked"
};

const settledPaymentStatuses = new Set(["PAID", "SETTLED", "APPROVED"]);

export function normalizeExternalStatus(value?: string | null) {
  return String(value || "UNKNOWN").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function mapLtsStatusToPortalStage(status?: string | null): PortalStageKey {
  return ltsStatusToPortalStage[normalizeExternalStatus(status)] || "brief_received";
}

export function mapPaymentStatusToPortalStage(status?: string | null): PortalStageKey {
  return paymentStatusToPortalStage[normalizeExternalStatus(status)] || "payment_pending";
}

export function isSettledPaymentStatus(status?: string | null) {
  return settledPaymentStatuses.has(normalizeExternalStatus(status));
}
