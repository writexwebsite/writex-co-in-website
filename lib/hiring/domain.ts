export const hiringRoles = ["academic_writer", "sales_executive"] as const;
export type HiringRole = (typeof hiringRoles)[number];

export const CAREERS_LOCATION = "Kolkata, India";

export const hiringRoleLabels: Record<HiringRole, string> = {
  academic_writer: "Academic Writer",
  sales_executive: "Sales Executive"
};

export function hiringRoleLabel(role: string) {
  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "academic_writer" || normalized === "sales_executive") {
    return hiringRoleLabels[normalized];
  }
  return role
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const hiringStages = [
  "application_received",
  "eligibility_review",
  "assessment_invited",
  "assessment_started",
  "assessment_submitted",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "selected",
  "offer_released",
  "joined",
  "talent_pool",
  "rejected",
  "withdrawn",
  "expired"
] as const;
export type HiringStage = (typeof hiringStages)[number];

export const publicHiringStages: Record<HiringStage, string> = {
  application_received: "Application received",
  eligibility_review: "Application received",
  assessment_invited: "Assessment invited",
  assessment_started: "Assessment invited",
  assessment_submitted: "Assessment completed",
  under_review: "Under review",
  shortlisted: "Under review",
  interview_scheduled: "Interview scheduled",
  interview_completed: "Under review",
  selected: "Selected",
  offer_released: "Selected",
  joined: "Selected",
  talent_pool: "Talent pool",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Withdrawn"
};

export const writerAssessmentCategories = [
  "source_reading",
  "argument_outline",
  "analytical_writing",
  "editing",
  "referencing",
  "revision",
  "integrity_declaration",
  "viva"
] as const;

export const salesAssessmentCategories = [
  "voice_pitch",
  "lead_qualification",
  "price_objection",
  "trust_objection",
  "follow_up",
  "closing",
  "complaint_response",
  "live_role_play"
] as const;

export const allowedHiringFileTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "image/jpeg",
  "image/png"
]);

export const assessmentIntegrityEventTypes = [
  "copy_attempt",
  "paste_attempt",
  "context_menu_attempt",
  "protected_selection",
  "drag_drop_attempt",
  "large_insertion",
  "typing_burst",
  "focus_loss",
  "fullscreen_exit",
  "visibility_change",
  "page_reload",
  "device_change",
  "disconnection"
] as const;

export type AssessmentIntegrityEventType =
  (typeof assessmentIntegrityEventTypes)[number];
