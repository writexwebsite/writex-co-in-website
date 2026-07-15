export const paymentVerificationStatuses = [
  "pending",
  "verified",
  "rejected",
  "needs_clarification"
] as const;

export type PaymentVerificationStatus =
  (typeof paymentVerificationStatuses)[number];
