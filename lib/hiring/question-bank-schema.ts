import { z } from "zod";
import { hiringRoles } from "@/lib/hiring/domain";

const safeText = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/[<>]/.test(value), "HTML is not allowed.");

export const questionInputSchema = z.object({
  role: z.enum(hiringRoles),
  title: safeText(160),
  category: safeText(80),
  section: safeText(80),
  difficulty: z.enum(["foundation", "intermediate", "advanced"]),
  prompt: safeText(10000),
  instructions: z.string().trim().max(5000).refine((value) => !/[<>]/.test(value), "HTML is not allowed.").default(""),
  sourceMaterial: z.string().trim().max(20000).refine((value) => !/[<>]/.test(value), "HTML is not allowed.").default(""),
  answerType: z.enum(["long_text", "short_text", "structured_response", "editing_task", "source_based_response", "voice_response", "scenario_response", "file_interaction"]).default("long_text"),
  expectedTimeMinutes: z.number().int().min(1).max(240).default(15),
  maximumScore: z.number().positive().max(1000).default(100),
  required: z.boolean().default(true),
  randomizationEligible: z.boolean().default(true),
  backNavigationRule: z.enum(["session_default", "allowed", "locked_after_next"]).default("session_default"),
  variants: z.array(safeText(10000)).max(20).default([]),
  scoringRubric: z.record(z.string(), z.unknown()).default({}),
  autoScoringRule: z.record(z.string(), z.unknown()).default({}),
  expectedCompetencies: z.array(safeText(100)).max(30).default([]),
  humanReviewRequired: z.boolean().default(true),
  antiCheatSensitivity: z.enum(["low", "standard", "high"]).default("standard"),
  vivaFollowUpRequired: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(100000).default(100),
  active: z.boolean().default(false),
  changeReason: safeText(500)
});

export const questionMutationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("set_active"), active: z.boolean(), reason: safeText(500) }),
  z.object({ operation: z.literal("update_draft"), input: questionInputSchema }),
  z.object({ operation: z.literal("create_version"), input: questionInputSchema }),
  z.object({ operation: z.literal("duplicate"), reason: safeText(500) }),
  z.object({ operation: z.literal("publish"), reason: safeText(500) }),
  z.object({ operation: z.literal("reorder"), displayOrder: z.number().int().min(0).max(100000), reason: safeText(500) }),
  z.object({ operation: z.literal("archive"), reason: safeText(500) })
]);

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuestionMutation = z.infer<typeof questionMutationSchema>;
