import { z } from "zod";
import { candidateRelationshipDisclosureSchema } from "@/lib/hiring/candidate-disclosure";
import { hiringRoles } from "@/lib/hiring/domain";

const safeText = (max: number) =>
  z.string().trim().min(1).max(max).refine((value) => !/[<>]/.test(value), "HTML is not allowed.");

const roleRequiredFields = {
  academic_writer: [
    "subjectExpertise",
    "academicLevels",
    "writingExperience",
    "researchExperience",
    "editingExperience",
    "referencingStyles",
    "aiUsageSelection",
    "fullTimeCommitment",
    "currentEmploymentStatus",
    "joiningAvailability"
  ],
  sales_executive: [
    "totalExperience",
    "languages",
    "languageProficiency",
    "communicationComfort",
    "objectionHandling",
    "salaryStructure",
    "fullTimeCommitment",
    "currentEmploymentStatus",
    "joiningAvailability"
  ]
} as const;

export const hiringApplicationSchema = z.object({
  role: z.enum(hiringRoles),
  fullName: safeText(120),
  email: z.email().max(200),
  mobile: z.string().trim().min(10).max(30),
  city: safeText(100),
  qualification: safeText(200),
  experience: safeText(1000),
  availability: safeText(200),
  compensation: safeText(200),
  noticePeriod: safeText(120),
  workMode: safeText(120),
  roleDetails: z.record(z.string(), z.string().trim().max(1500)).default({}),
  aiUsageDisclosure: z.string().trim().max(1000).optional(),
  relationship: candidateRelationshipDisclosureSchema,
  consent: z.literal(true),
  assessmentMonitoringConsent: z.literal(true),
  declaration: z.literal(true),
  videoIntroductionConsent: z.boolean().optional(),
  website: z.string().max(0).optional()
}).superRefine((value, context) => {
  for (const field of roleRequiredFields[value.role]) {
    if (!value.roleDetails[field]?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["roleDetails", field],
        message: "Complete every required role-specific field."
      });
    }
  }
  const prohibitedEmploymentPattern = /\b(freelance|part[- ]?time|hourly|contract)\b/i;
  for (const [field, fieldValue] of [
    ["availability", value.availability],
    ["workMode", value.workMode],
    ["engagementPreference", value.roleDetails.engagementPreference || ""]
  ]) {
    if (prohibitedEmploymentPattern.test(fieldValue)) {
      context.addIssue({
        code: "custom",
        path: field === "engagementPreference" ? ["roleDetails", field] : [field],
        message: "This role is available only as full-time employment."
      });
    }
  }
  if (value.role === "academic_writer" && !value.aiUsageDisclosure?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["aiUsageDisclosure"],
      message: "AI usage disclosure is required for Academic Writer applications."
    });
  }
  if (value.role === "sales_executive") {
    if (!value.videoIntroductionConsent) {
      context.addIssue({ code: "custom", path: ["videoIntroductionConsent"], message: "Consent to private video review is required for Sales applications." });
    }
    if (value.roleDetails.totalExperience !== "Fresher") {
      for (const field of ["previousIndustry", "leadHandling", "targetHistory", "conversionExperience"]) {
        if (!value.roleDetails[field]?.trim()) context.addIssue({ code: "custom", path: ["roleDetails", field], message: "Complete the previous-sales experience field." });
      }
    }
  }
});

export type HiringApplicationInput = z.infer<typeof hiringApplicationSchema>;
