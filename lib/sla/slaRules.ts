export const slaRules = {
  lead: {
    newLeadContactMinutes: 30,
    urgentLeadContactMinutes: 15,
    contactedFollowUpMinutes: 24 * 60,
    quotedFollowUpMinutes: 24 * 60
  },
  payment: {
    proofReviewMinutes: 2 * 60,
    clarificationFollowUpMinutes: 24 * 60
  },
  revision: {
    acknowledgeMinutes: 2 * 60,
    urgentReviewMinutes: 60,
    underReviewMaxMinutes: 24 * 60
  }
} as const;

export type SlaSeverity = "ok" | "warning" | "breached" | "critical";
export type SlaEntityType = "quote_lead" | "payment_event" | "revision_request" | "portal_event" | "integration";

export type SlaEvaluation = {
  status: SlaSeverity;
  slaDeadline: Date | null;
  overdueByMinutes: number;
  reason: string;
  recommendedAction: string;
};
