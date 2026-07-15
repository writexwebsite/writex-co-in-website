export const leadStatuses = [
  "new",
  "contacted",
  "quoted",
  "converted",
  "lost",
  "spam"
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const revisionStatuses = [
  "submitted",
  "under_review",
  "accepted",
  "needs_clarification",
  "out_of_scope",
  "completed",
  "rejected",
  "closed"
] as const;

export type RevisionStatus = (typeof revisionStatuses)[number];
