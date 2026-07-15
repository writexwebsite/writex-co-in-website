import { z } from "zod";
import { AXO_MAX_FILE_MB, AXO_SERVICES } from "./config";
import type { AxoBrief, AxoServiceId } from "./types";

export const axoContactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  whatsapp: z.string().trim().regex(/^[+\d\s()-]{8,}$/, "Enter a valid phone or WhatsApp number.").optional().or(z.literal("")),
  preferredContact: z.enum(["email", "whatsapp", "phone"]),
  consent: z.literal(true, { message: "Confirm consent before continuing." })
}).refine((value) => Boolean(value.email || value.whatsapp), {
  message: "Add an email or phone/WhatsApp number.",
  path: ["email"]
});

export function requiredFieldsForService(serviceId?: AxoServiceId) {
  const service = AXO_SERVICES.find((item) => item.id === serviceId);
  return service?.fields ?? [];
}

export function missingBriefFields(brief: AxoBrief) {
  const common: Array<keyof AxoBrief> = ["serviceId", "deadline", "timezone", "instructions"];
  const serviceFields = requiredFieldsForService(brief.serviceId);
  const meaningful = new Set([...common, ...serviceFields]);
  return [...meaningful].filter((key) => {
    const value = brief[key];
    return typeof value === "string" ? value.trim().length === 0 : value == null;
  });
}

export function validateAxoFile(file: Pick<File, "name" | "size" | "type">) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowed = new Set(["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "jpg", "jpeg", "png", "txt"]);
  if (!extension || !allowed.has(extension)) return "This file type is not supported.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > AXO_MAX_FILE_MB * 1024 * 1024) return `Files must be ${AXO_MAX_FILE_MB} MB or smaller.`;
  return null;
}

export function escapeSummaryValue(value: string) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function buildRequirementSummary(brief: AxoBrief) {
  const service = AXO_SERVICES.find((item) => item.id === brief.serviceId);
  const lines = [
    ["Service", service?.label], ["Subject", brief.subject], ["Title / topic", brief.title],
    ["Academic level", brief.academicLevel || brief.degreeLevel], ["Length", brief.wordCount ? `${brief.wordCount} words` : undefined],
    ["Deadline", [brief.deadline, brief.deadlineTime, brief.timezone].filter(Boolean).join(" ")],
    ["Referencing", brief.referencingStyle], ["Files", brief.files?.map((file) => file.name).join(", ")],
    ["Instructions", brief.instructions]
  ];
  return lines.filter(([, value]) => Boolean(value)).map(([label, value]) => `${label}: ${escapeSummaryValue(String(value))}`).join("\n");
}
