export const clientPublicStages = [
  "Order Confirmed",
  "Requirements Received",
  "Project Allocated",
  "Work in Progress",
  "Clarification Required",
  "Quality Review",
  "Revision in Progress",
  "Timeline Under Review",
  "Ready for Delivery",
  "Delivered",
  "On Hold",
  "Cancelled"
] as const;

export type ClientPublicStage = (typeof clientPublicStages)[number];
export type ClientViewMode = "automatic" | "manual" | "frozen";

export type ClientStatusOverrideInput = {
  mode: ClientViewMode;
  publicStage?: string | null;
  approvedPublicMessage?: string | null;
  publicDeadline?: string | null;
  overrideReason?: string | null;
  expiresAt?: string | null;
};

export type ProviderFacts = {
  approvedDeliverableAvailable: boolean;
  workComplete: boolean;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

function validDate(value?: string | null) {
  if (!value) return true;
  return !Number.isNaN(new Date(value).getTime());
}

export function validateClientStatusOverride(
  input: ClientStatusOverrideInput,
  providerFacts: ProviderFacts
) {
  if (!["automatic", "manual", "frozen"].includes(input.mode)) {
    return { valid: false as const, error: "Select a valid client view mode." };
  }
  if (input.mode === "automatic") {
    return {
      valid: true as const,
      value: {
        mode: "automatic" as const,
        publicStage: null,
        approvedPublicMessage: null,
        publicDeadline: null,
        overrideReason: null,
        expiresAt: null
      }
    };
  }

  const stage = clean(input.publicStage);
  if (!clientPublicStages.includes(stage as ClientPublicStage)) {
    return { valid: false as const, error: "Select an approved public stage." };
  }
  const reason = clean(input.overrideReason);
  if (reason.length < 10 || reason.length > 500) {
    return {
      valid: false as const,
      error: "Provide a 10–500 character override reason."
    };
  }
  const message = clean(input.approvedPublicMessage);
  if (message.length > 500) {
    return {
      valid: false as const,
      error: "The public message must not exceed 500 characters."
    };
  }
  if (!validDate(input.publicDeadline) || !validDate(input.expiresAt)) {
    return { valid: false as const, error: "Use valid dates." };
  }
  if (!input.expiresAt || new Date(input.expiresAt).getTime() <= Date.now()) {
    return {
      valid: false as const,
      error: "Manual and frozen overrides require a future expiry."
    };
  }
  if (
    stage === "Delivered" &&
    !providerFacts.approvedDeliverableAvailable
  ) {
    return {
      valid: false as const,
      error: "Delivered requires an approved client-facing deliverable."
    };
  }
  if (stage === "Ready for Delivery" && !providerFacts.workComplete) {
    return {
      valid: false as const,
      error: "Ready for Delivery requires confirmed completed work."
    };
  }

  return {
    valid: true as const,
    value: {
      mode: input.mode,
      publicStage: stage as ClientPublicStage,
      approvedPublicMessage: message || null,
      publicDeadline: input.publicDeadline || null,
      overrideReason: reason,
      expiresAt: input.expiresAt
    }
  };
}
