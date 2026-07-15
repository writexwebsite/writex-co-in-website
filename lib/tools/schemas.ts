import { z } from "zod";
import { toolTypes } from "./config";

const cleanText = (max: number) => z.string().trim().max(max).transform((value) => value.replace(/[<>]/g, ""));
const optionalText = (max: number) => z.preprocess((value) => value === "" ? undefined : value, cleanText(max).optional());

export const toolSessionSchema = z.object({
  anonymousSessionId: z.string().trim().min(12).max(100),
  toolType: z.enum(toolTypes),
  completionPercent: z.number().int().min(0).max(100),
  previewGenerated: z.boolean().optional(),
  completed: z.boolean().optional(),
  downloadRequested: z.boolean().optional(),
  metadata: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).optional()
});

export const toolLeadSchema = z.object({
  anonymousSessionId: z.string().trim().min(12).max(100),
  toolType: z.enum(toolTypes),
  templateId: optionalText(80),
  name: cleanText(120).pipe(z.string().min(2, "Enter your name.")),
  phone: z.string().trim().min(7).max(30),
  phoneCountry: z.string().trim().length(2),
  email: z.preprocess((value) => value === "" ? undefined : value, z.email().optional()),
  country: optionalText(100),
  programmeOrRole: optionalText(180),
  deadline: z.preprocess((value) => value === "" ? undefined : value, z.iso.date().optional()),
  mainSupportNeed: optionalText(300),
  completionPercent: z.number().int().min(0).max(100),
  previewGenerated: z.boolean(),
  completed: z.boolean(),
  whatsappClicked: z.boolean().optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
  document: z.object({
    title: cleanText(160),
    subtitle: optionalText(220),
    sections: z.array(z.object({
      heading: cleanText(120),
      lines: z.array(cleanText(600)).max(20)
    })).max(12).optional(),
    templateId: optionalText(80)
  })
});

export const termPlanInterestSchema = z.object({
  name: cleanText(120).pipe(z.string().min(2)),
  phone: z.string().trim().min(7).max(30),
  phoneCountry: z.string().trim().length(2),
  country: cleanText(100).pipe(z.string().min(2)),
  institution: optionalText(180),
  expectedDeadlines: z.number().int().min(1).max(50),
  termStart: z.iso.date(),
  termEnd: z.iso.date(),
  supportAreas: z.array(cleanText(80)).min(1).max(8),
  consent: z.literal(true),
  website: z.string().max(0).optional()
}).refine((value) => value.termEnd >= value.termStart, { path: ["termEnd"], message: "Term end must be after the start." });

