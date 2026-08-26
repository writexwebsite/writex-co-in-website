import { z } from "zod";
import { hiringStages } from "@/lib/hiring/domain";
import { assessmentAccommodationSchema } from "@/lib/hiring/accommodations";

const safeText = (min: number, max: number) => z.string().trim().min(min).max(max).refine((value) => !/[<>]/.test(value), "HTML is not allowed.");
const optionalText = (max: number) => z.string().trim().max(max).refine((value) => !/[<>]/.test(value), "HTML is not allowed.").optional();

export const verificationChecklistSchema = z.object({
  consentRecorded: z.boolean(),
  identityReviewed: z.boolean(),
  educationReviewed: z.boolean(),
  backgroundMethodRecorded: z.boolean(),
  reportOrSourceAvailable: z.boolean(),
  identityMatchReviewed: z.boolean(),
  clarificationReviewed: z.boolean(),
  discrepanciesDisplayed: z.boolean(),
  reviewerRecommendationAvailable: z.boolean()
});

const verificationOperationSchema = z.object({
  resource: z.literal("verification"),
  applicationReference: safeText(5, 80),
  action: z.enum(["open_case", "decide", "request_clarification"]),
  verificationType: z.enum(["identity", "aadhaar", "education", "background", "employment", "reference"]),
  decision: z.enum(["approved_for_hiring", "approved_with_conditions", "additional_verification", "candidate_clarification", "return_to_reviewer", "unable_to_verify", "not_approved_for_hiring", "reopened"]).optional(),
  method: optionalText(120),
  notes: safeText(3, 5000),
  conditions: z.array(safeText(1, 500)).max(20).optional(),
  evidenceReviewed: z.array(safeText(1, 120)).max(20).optional(),
  completionChecklist: verificationChecklistSchema.optional(),
  explicitConfirmation: z.boolean().optional(),
  reason: safeText(3, 500)
}).superRefine((value, context) => {
  if (value.action !== "decide") return;
  if (!value.decision) {
    context.addIssue({ code: "custom", path: ["decision"], message: "A verification decision is required." });
  }
  if (!value.evidenceReviewed?.length) {
    context.addIssue({ code: "custom", path: ["evidenceReviewed"], message: "Record the evidence reviewed before deciding." });
  }
  if (!value.completionChecklist) {
    context.addIssue({ code: "custom", path: ["completionChecklist"], message: "Complete the decision checklist." });
  }
  if (value.explicitConfirmation !== true) {
    context.addIssue({ code: "custom", path: ["explicitConfirmation"], message: "Explicit confirmation is required." });
  }
  if (
    ["approved_for_hiring", "approved_with_conditions"].includes(value.decision || "") &&
    value.completionChecklist &&
    Object.values(value.completionChecklist).some((complete) => !complete)
  ) {
    context.addIssue({ code: "custom", path: ["completionChecklist"], message: "Every approval-gate checklist item must be complete." });
  }
  if (value.decision === "approved_with_conditions" && !value.conditions?.length) {
    context.addIssue({ code: "custom", path: ["conditions"], message: "Approval conditions are required." });
  }
});

export const hiringOperationSchema = z.discriminatedUnion("resource", [
  z.object({resource:z.literal("application"),applicationReference:safeText(5,80),action:z.enum(["assign","set_stage","add_note","mark_duplicate","set_retention","retry_notification"]),notificationType:z.enum(["internal_hiring_alert","application_acknowledgement"]).optional(),assignedAdminUserId:z.uuid().nullable().optional(),stage:z.enum(hiringStages).optional(),reason:safeText(3,500),note:optionalText(5000),duplicateOfReference:optionalText(80),retentionCategory:z.enum(["active_candidate","selected","joined","rejected","withdrawn","expired","talent_pool","legal_hold","deletion_requested"]).optional(),reviewDueAt:z.iso.datetime().optional()}),
  z.object({
    resource: z.literal("eligibility"),
    applicationReference: safeText(5, 80),
    checks: z.record(z.string().min(1).max(80), z.boolean()),
    reviewerOutcome: z.enum(["eligible", "review"]),
    notes: safeText(3, 3000),
    reason: safeText(3, 500)
  }),
  z.object({resource:z.literal("assessment"),applicationReference:safeText(5,80),action:z.enum(["invite","resend","remind","revoke","score"]),durationMinutes:z.number().int().min(10).max(480).optional(),expiresInHours:z.number().int().min(1).max(336).optional(),humanScore:z.number().min(0).max(100).optional(),vivaScore:z.number().min(0).max(100).optional(),recommendation:z.enum(["advance","review","talent_pool","not_selected"]).optional(),notes:optionalText(5000),accommodation:assessmentAccommodationSchema.optional(),backNavigationAllowed:z.boolean().optional(),reason:safeText(3,500)}),
  z.object({
    resource:z.literal("system_review"),
    applicationReference:safeText(5,80),
    action:z.literal("recalculate"),
    reason:safeText(3,500)
  }),
  z.object({
    resource:z.literal("admin_review"),
    applicationReference:safeText(5,80),
    decision:z.enum(["accept","reject","hold","talent_pool","request_reassessment","request_viva"]),
    adminScore:z.number().min(0).max(100).optional(),
    structuredNotes:z.record(z.string().max(80),z.string().trim().max(2000).refine((value)=>!/[<>]/.test(value),"HTML is not allowed.")).default({}),
    notes:optionalText(5000),
    recommendationAction:z.enum(["confirm","override","independent"]),
    overrideReason:optionalText(2000),
    reason:safeText(3,500)
  }).superRefine((value,context)=>{
    if(value.recommendationAction==="override"&&!value.overrideReason){
      context.addIssue({code:"custom",path:["overrideReason"],message:"An override reason is required."});
    }
  }),
  z.object({
    resource:z.literal("final_decision"),
    applicationReference:safeText(5,80),
    outcome:z.enum(["selected","rejected","talent_pool","hold","offer_released"]),
    reason:safeText(3,3000),
    explicitConfirmation:z.literal(true)
  }),
  z.object({
    resource: z.literal("integrity_review"),
    sessionReference: safeText(5, 80),
    outcome: z.enum(["acknowledged", "false_positive", "requires_viva", "requires_investigation", "cleared_after_review"]),
    notes: safeText(3, 3000),
    reason: safeText(3, 500),
    explicitConfirmation: z.literal(true)
  }),
  z.object({resource:z.literal("interview"),applicationReference:safeText(5,80),action:z.enum(["schedule","reschedule","complete","cancel","no_show"]),interviewId:z.uuid().optional(),interviewType:z.enum(["screening","role_interview","viva","management","final"]).optional(),interviewerAdminUserId:z.uuid().optional(),scheduledAt:z.iso.datetime().optional(),durationMinutes:z.number().int().min(15).max(240).optional(),recommendation:z.enum(["advance","hold","talent_pool","not_selected"]).optional(),notes:optionalText(5000),scores:z.record(z.string().min(1).max(80),z.number().min(0).max(100)).optional(),reason:safeText(3,500)}),
  z.object({resource:z.literal("talent_pool"),applicationReference:safeText(5,80),action:z.enum(["add","update","remove","convert"]),category:z.enum(["ready_now","interview_ready","trainable","freelance_pool","future_hire","hold","rejected"]).optional(),skillTags:z.array(safeText(1,60)).max(20).optional(),roleTags:z.array(safeText(1,60)).max(10).optional(),availability:optionalText(200),reviewAt:z.iso.datetime().optional(),notes:optionalText(3000),reason:safeText(3,500)}),
  z.object({resource:z.literal("referral"),applicationReference:safeText(5,80),action:z.enum(["save","mark_joined","mark_conflict"]),referralSource:safeText(2,100),referrerCode:safeText(2,150),joinedStatus:z.enum(["not_joined","joined","left"]).optional(),payoutStatus:z.enum(["not_applicable","pending","eligible","paid","blocked"]).optional(),conflictStatus:z.enum(["clear","review","duplicate","resolved"]).optional(),notes:optionalText(2000),reason:safeText(3,500)}),
  verificationOperationSchema,
  z.object({resource:z.literal("hrms"),applicationReference:safeText(5,80),action:z.literal("retry"),reason:safeText(3,500)}),
  z.object({resource:z.literal("trust_publish"),applicationReference:safeText(5,80),action:z.enum(["evaluate","approve","revoke"]),reason:safeText(3,500)})
]);

export type HiringOperation = z.infer<typeof hiringOperationSchema>;
