import { z } from "zod";

export const assessmentAccommodationSchema = z.object({
  extraTimeMinutes: z.number().int().min(0).max(240).default(0),
  questionCopyAllowed: z.boolean().default(false),
  answerPasteAllowed: z.boolean().default(false),
  screenReaderMode: z.boolean().default(false),
  alternateAssessment: z.boolean().default(false),
  vivaHeavy: z.boolean().default(false),
  reason: z.string().trim().min(3).max(500).refine((value) => !/[<>]/.test(value), "HTML is not allowed.").optional()
}).superRefine((value, context) => {
  const enabled = value.extraTimeMinutes > 0 || value.questionCopyAllowed || value.answerPasteAllowed || value.screenReaderMode || value.alternateAssessment || value.vivaHeavy;
  if (enabled && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "An audited accommodation reason is required." });
  }
});

export type AssessmentAccommodation = z.infer<typeof assessmentAccommodationSchema>;

export function resolveAssessmentAccommodation(input: unknown): AssessmentAccommodation {
  const parsed = assessmentAccommodationSchema.safeParse(input || {});
  return parsed.success ? parsed.data : {
    extraTimeMinutes: 0,
    questionCopyAllowed: false,
    answerPasteAllowed: false,
    screenReaderMode: false,
    alternateAssessment: false,
    vivaHeavy: false
  };
}
