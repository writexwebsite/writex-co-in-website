import { z } from "zod";

export function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalTrimmedString = (maxLength = 255) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(maxLength).optional()
  );

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.email("Enter a valid email address.").optional()
);

const optionalWordCount = z.preprocess(
  emptyToUndefined,
  z
    .union([z.string(), z.number()])
    .optional()
    .refine(
      (value) => value === undefined || Number(value) > 0,
      "Enter a positive word count."
    )
);

const consentField = z.boolean().refine((value) => value, {
  message: "Consent is required before sending a quote request."
});

function coalesceString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function parseOptionalWordCount(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function hasTooManyLinks(value: string) {
  return (value.match(/https?:\/\//gi) || []).length > 3;
}

export const quoteLeadSubmissionSchema = z.object({
  service: z.string().trim().min(1, "Select the service required."),
  level: optionalTrimmedString(),
  subject: optionalTrimmedString(),
  country: optionalTrimmedString(),
  wordCount: optionalWordCount,
  deadline: z
    .string()
    .min(1, "Select your deadline.")
    .refine(
      (value) => value >= getTodayInputValue(),
      "Select today or a future date."
    ),
  documentCondition: optionalTrimmedString(),
  referencingStyle: optionalTrimmedString(),
  urgency: optionalTrimmedString(),
  instructions: z
    .string()
    .trim()
    .min(10, "Add at least 10 characters of brief instructions.")
    .max(4000, "Keep instructions under 4000 characters.")
    .refine((value) => !hasTooManyLinks(value), "Please remove excessive links."),
  rubricAvailable: optionalTrimmedString(),
  draftAvailable: optionalTrimmedString(),
  supervisorCommentsAvailable: optionalTrimmedString(),
  name: z.string().trim().min(2, "Enter your full name."),
  email: optionalEmail,
  whatsapp: z
    .string()
    .trim()
    .regex(/^[+\d\s()-]{8,}$/, "Enter a valid WhatsApp number."),
  consent: consentField,
  fileName: z.string().trim().max(255).optional(),
  fileSize: optionalWordCount,
  fileType: optionalTrimmedString(120),
  uploadedFileAssetId: z.string().trim().uuid().optional(),
  leadIntelligence: z.record(z.string(), z.unknown()).optional()
});

export const quoteLeadApiSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required."),
    email: optionalEmail,
    whatsapp: z.string().trim().min(8, "WhatsApp number is required."),
    country: optionalTrimmedString(),
    service: optionalTrimmedString(),
    service_required: optionalTrimmedString(),
    level: optionalTrimmedString(),
    academic_level: optionalTrimmedString(),
    subject: optionalTrimmedString(),
    wordCount: optionalWordCount,
    word_count: optionalWordCount,
    deadline: z.string().trim().min(1, "Deadline is required."),
    instructions: optionalTrimmedString(4000),
    brief_summary: optionalTrimmedString(4000),
    source: optionalTrimmedString(),
    consent: consentField,
    fileName: optionalTrimmedString(255),
    file_name: optionalTrimmedString(255),
    fileSize: optionalWordCount,
    file_size: optionalWordCount,
    fileType: optionalTrimmedString(120),
    file_type: optionalTrimmedString(120),
    uploadedFileAssetId: z.string().trim().uuid().optional(),
    uploaded_file_asset_id: z.string().trim().uuid().optional(),
    documentCondition: optionalTrimmedString(),
    document_condition: optionalTrimmedString(),
    referencingStyle: optionalTrimmedString(),
    referencing_style: optionalTrimmedString(),
    urgency: optionalTrimmedString(),
    rubricAvailable: optionalTrimmedString(),
    rubric_available: optionalTrimmedString(),
    draftAvailable: optionalTrimmedString(),
    draft_available: optionalTrimmedString(),
    supervisorCommentsAvailable: optionalTrimmedString(),
    supervisor_comments_available: optionalTrimmedString(),
    leadIntelligence: z.record(z.string(), z.unknown()).optional(),
    lead_intelligence: z.record(z.string(), z.unknown()).optional(),
    page_path: optionalTrimmedString(500),
    landing_page: optionalTrimmedString(500),
    referrer: optionalTrimmedString(1000),
    utm_source: optionalTrimmedString(160),
    utm_medium: optionalTrimmedString(160),
    utm_campaign: optionalTrimmedString(240),
    utm_term: optionalTrimmedString(240),
    utm_content: optionalTrimmedString(240),
    device_type: optionalTrimmedString(80),
    website: optionalTrimmedString()
  })
  .superRefine((value, context) => {
    const serviceRequired = coalesceString(value.service_required, value.service);
    const instructions = coalesceString(value.instructions, value.brief_summary);

    if (!serviceRequired) {
      context.addIssue({
        code: "custom",
        path: ["service_required"],
        message: "Service required is required."
      });
    }

    if (!instructions || instructions.length < 10) {
      context.addIssue({
        code: "custom",
        path: ["instructions"],
        message: "Brief instructions are required."
      });
    }

    if (instructions && hasTooManyLinks(instructions)) {
      context.addIssue({
        code: "custom",
        path: ["instructions"],
        message: "Please remove excessive links."
      });
    }

    if (value.website) {
      context.addIssue({
        code: "custom",
        path: ["website"],
        message: "The request could not be accepted."
      });
    }
  })
  .transform((value) => ({
    name: value.name,
    email: value.email ?? "",
    whatsapp: value.whatsapp,
    country: value.country ?? "",
    serviceRequired: coalesceString(value.service_required, value.service),
    academicLevel: coalesceString(value.academic_level, value.level),
    subject: value.subject ?? "",
    wordCount: parseOptionalWordCount(value.word_count ?? value.wordCount),
    deadline: value.deadline,
    instructions: coalesceString(value.instructions, value.brief_summary),
    source: value.source ?? "website_quote_form",
    consent: value.consent,
    fileName: coalesceString(value.file_name, value.fileName) || undefined,
    fileSize: parseOptionalWordCount(value.file_size ?? value.fileSize),
    fileType: coalesceString(value.file_type, value.fileType) || undefined,
    uploadedFileAssetId:
      value.uploaded_file_asset_id ?? value.uploadedFileAssetId,
    documentCondition:
      coalesceString(value.document_condition, value.documentCondition) ||
      undefined,
    referencingStyle:
      coalesceString(value.referencing_style, value.referencingStyle) ||
      undefined,
    urgency: value.urgency,
    rubricAvailable:
      coalesceString(value.rubric_available, value.rubricAvailable) ||
      undefined,
    draftAvailable:
      coalesceString(value.draft_available, value.draftAvailable) || undefined,
    supervisorCommentsAvailable:
      coalesceString(
        value.supervisor_comments_available,
        value.supervisorCommentsAvailable
      ) || undefined,
    leadIntelligence: value.lead_intelligence ?? value.leadIntelligence,
    pagePath: value.page_path,
    landingPage: value.landing_page,
    referrer: value.referrer,
    utmSource: value.utm_source,
    utmMedium: value.utm_medium,
    utmCampaign: value.utm_campaign,
    utmTerm: value.utm_term,
    utmContent: value.utm_content,
    deviceType: value.device_type
  }));

export const fileUploadMetadataSchema = z.object({
  invoiceId: z.string().trim().min(1).optional(),
  quoteLeadId: z.string().trim().uuid().optional(),
  assetType: z
    .enum([
      "quote_brief",
      "rubric",
      "draft",
      "sop_prompt",
      "dissertation_chapter",
      "payment_proof",
      "preview",
      "final_delivery",
      "revision_attachment",
      "other"
    ])
    .default("quote_brief"),
  uploadedBy: z.enum(["client", "admin", "system"]).default("client")
});

export const adminLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

const strongAdminPassword = z
  .string()
  .min(14, "Use at least 14 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(/[^A-Za-z0-9]/, "Add a symbol.");

export const adminChangePasswordSchema = z
  .object({
    newPassword: strongAdminPassword,
    confirmPassword: z.string()
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const futureClientLoginSchema = z
  .object({
    invoiceNumber: z.string().trim().min(3).optional(),
    mobile: z.string().trim().min(8).optional(),
    invoiceId: z.string().trim().min(3).optional(),
    whatsapp: z.string().trim().min(8).optional()
  })
  .transform((value, context) => {
    const invoiceId = value.invoiceNumber || value.invoiceId;
    const whatsapp = value.mobile || value.whatsapp;
    if (!invoiceId) {
      context.addIssue({
        code: "custom",
        path: ["invoiceNumber"],
        message: "Invoice number is required."
      });
    }
    if (!whatsapp) {
      context.addIssue({
        code: "custom",
        path: ["mobile"],
        message: "Registered mobile number is required."
      });
    }
    return { invoiceId: invoiceId || "", whatsapp: whatsapp || "" };
  });

export const employeeLoginSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  password: z.string().min(8).max(256)
});

export type QuoteLeadSubmission = z.infer<typeof quoteLeadSubmissionSchema>;
export type QuoteLeadApiInput = z.infer<typeof quoteLeadApiSchema>;
export type FileUploadMetadata = z.infer<typeof fileUploadMetadataSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>;
export type FutureClientLoginInput = z.infer<typeof futureClientLoginSchema>;
