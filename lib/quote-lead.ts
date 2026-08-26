import type { QuoteLeadIntelligence } from "./lead-intelligence";

export type QuoteLeadPayload = {
  name: string;
  email?: string;
  whatsapp: string;
  country?: string;
  level?: string;
  service: string;
  subject?: string;
  wordCount?: string;
  deadline: string;
  documentCondition?: string;
  referencingStyle?: string;
  urgency?: string;
  instructions: string;
  rubricAvailable?: string;
  draftAvailable?: string;
  supervisorCommentsAvailable?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  uploadedFileAssetId?: string;
  leadIntelligence: QuoteLeadIntelligence;
  pagePath?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  deviceType?: string;
  idempotencyKey?: string;
};

export type QuoteLeadResult = {
  leadId: string;
  message: string;
};

export async function submitQuoteLead(
  payload: QuoteLeadPayload
): Promise<QuoteLeadResult> {
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(payload.idempotencyKey
        ? { "idempotency-key": payload.idempotencyKey }
        : {})
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      whatsapp: payload.whatsapp,
      country: payload.country,
      service_required: payload.service,
      academic_level: payload.level,
      subject: payload.subject,
      word_count: payload.wordCount,
      deadline: payload.deadline,
      instructions: payload.instructions,
      source: "website_quote_form",
      consent: true,
      file_name: payload.fileName,
      file_size: payload.fileSize,
      file_type: payload.fileType,
      uploaded_file_asset_id: payload.uploadedFileAssetId,
      document_condition: payload.documentCondition,
      referencing_style: payload.referencingStyle,
      urgency: payload.urgency,
      rubric_available: payload.rubricAvailable,
      draft_available: payload.draftAvailable,
      supervisor_comments_available: payload.supervisorCommentsAvailable,
      lead_intelligence: payload.leadIntelligence,
      page_path: payload.pagePath,
      landing_page: payload.landingPage,
      referrer: payload.referrer,
      utm_source: payload.utmSource,
      utm_medium: payload.utmMedium,
      utm_campaign: payload.utmCampaign,
      utm_term: payload.utmTerm,
      utm_content: payload.utmContent,
      device_type: payload.deviceType
    })
  });

  const result = (await response.json()) as
    | {
        success: true;
        leadId: string;
        message: string;
      }
    | {
        success: false;
        message?: string;
        fallback?: "whatsapp";
      };

  if (!response.ok || !result.success) {
    throw new Error(
      !result.success && result.message
        ? result.message
        : "The quote request could not be submitted."
    );
  }

  return {
    leadId: result.leadId,
    message: result.message
  };
}
