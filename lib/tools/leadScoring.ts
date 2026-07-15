import type { PhoneConfidence } from "./phone";

export const toolLeadScoreRules = {
  validPhone: 25,
  emailProvided: 15,
  toolCompleted: 15,
  previewGenerated: 10,
  deadlineProvided: 10,
  programmeOrCountryProvided: 10,
  whatsappClicked: 15,
  duplicateBehaviour: -25,
  impossiblePhone: -35,
  botBehaviour: -30,
  incompleteSession: -20
} as const;

export type ToolLeadScoreInput = {
  phoneConfidence: PhoneConfidence;
  emailProvided: boolean;
  completed: boolean;
  previewGenerated: boolean;
  deadlineProvided: boolean;
  programmeOrCountryProvided: boolean;
  whatsappClicked?: boolean;
  duplicateCount?: number;
  botSignal?: boolean;
  completionPercent: number;
};

export type ToolLeadCategory = "hot" | "qualified" | "nurture" | "low_confidence";

export function scoreToolLead(input: ToolLeadScoreInput) {
  let score = 0;
  const reasons: string[] = [];
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  if (input.phoneConfidence !== "suspicious") add(toolLeadScoreRules.validPhone, "Valid phone format");
  if (input.emailProvided) add(toolLeadScoreRules.emailProvided, "Email provided");
  if (input.completed) add(toolLeadScoreRules.toolCompleted, "Tool completed");
  if (input.previewGenerated) add(toolLeadScoreRules.previewGenerated, "Preview generated");
  if (input.deadlineProvided) add(toolLeadScoreRules.deadlineProvided, "Deadline provided");
  if (input.programmeOrCountryProvided) add(toolLeadScoreRules.programmeOrCountryProvided, "Programme or country provided");
  if (input.whatsappClicked) add(toolLeadScoreRules.whatsappClicked, "WhatsApp intent");
  if ((input.duplicateCount || 0) > 2) add(toolLeadScoreRules.duplicateBehaviour, "Repeated duplicate behaviour");
  if (input.phoneConfidence === "suspicious") add(toolLeadScoreRules.impossiblePhone, "Suspicious phone pattern");
  if (input.botSignal) add(toolLeadScoreRules.botBehaviour, "Automated submission signal");
  if (input.completionPercent < 35) add(toolLeadScoreRules.incompleteSession, "Incomplete session");

  score = Math.max(0, Math.min(100, score));
  const category: ToolLeadCategory =
    score >= 80 ? "hot" : score >= 55 ? "qualified" : score >= 30 ? "nurture" : "low_confidence";

  return { score, category, reasons };
}

