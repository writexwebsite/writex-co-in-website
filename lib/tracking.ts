export const quoteTrackingEvents = {
  pricingPageViewed: "pricing_page_viewed",
  headerServiceClick: "header_service_click",
  headerResourceClick: "header_resource_click",
  aboutPageView: "about_page_view",
  servicePageView: "service_page_view",
  heroWhatsappClicked: "hero_whatsapp_clicked",
  heroQuoteClicked: "hero_quote_clicked",
  serviceCardClicked: "service_card_click",
  supportPathStarted: "support_path_started",
  supportPathCompleted: "support_path_completed",
  quoteFormStarted: "quote_form_started",
  quoteStepCompleted: "quote_step_completed",
  quoteFormSubmitted: "quote_form_submitted",
  quoteFormFailed: "quote_form_failed",
  fileUploadStarted: "file_upload_started",
  fileUploadCompleted: "file_upload_completed",
  fileUploadFailed: "file_upload_failed",
  fileUploaded: "file_uploaded",
  whatsappQuoteClicked: "whatsapp_quote_clicked",
  whatsappFallbackClicked: "whatsapp_fallback_click",
  uploadBriefClicked: "upload_brief_clicked",
  faqOpened: "faq_opened",
  relatedGuideClicked: "related_guide_click",
  sampleInteraction: "sample_interaction",
  sampleViewed: "sample_viewed",
  guideViewed: "guide_viewed",
  relatedServiceClick: "related_service_click",
  clientLoginClicked: "client_login_click",
  employeeLoginClicked: "employee_login_click",
  finalCtaClicked: "final_cta_clicked",
  scopeCardClicked: "scope_card_clicked",
  pricingScopeCardClicked: "pricing_scope_card_clicked",
  toolsHubViewed: "tools_hub_viewed",
  cvBuilderStarted: "cv_builder_started",
  cvBuilderStepCompleted: "cv_builder_step_completed",
  cvBuilderPreviewGenerated: "cv_builder_preview_generated",
  cvBuilderCompleted: "cv_builder_completed",
  sopBuilderStarted: "sop_builder_started",
  sopBuilderStepCompleted: "sop_builder_step_completed",
  sopBuilderPreviewGenerated: "sop_builder_preview_generated",
  sopBuilderCompleted: "sop_builder_completed",
  templatePreviewed: "template_previewed",
  templateDownloadRequested: "template_download_requested",
  leadCaptureStarted: "lead_capture_started",
  leadCaptureCompleted: "lead_capture_completed",
  leadCaptureFailed: "lead_capture_failed",
  downloadCompleted: "download_completed",
  downloadFailed: "download_failed",
  whatsappUpsellClicked: "whatsapp_upsell_clicked",
  termPlanInterestStarted: "term_plan_interest_started",
  termPlanInterestSubmitted: "term_plan_interest_submitted"
} as const;

export type QuoteTrackingEvent =
  (typeof quoteTrackingEvents)[keyof typeof quoteTrackingEvents];

type TrackingPayload = Record<string, string | number | boolean | undefined>;

type AnalyticsWindow = Window & {
  dataLayer?: TrackingPayload[];
};

export function trackQuoteEvent(
  eventName: QuoteTrackingEvent,
  payload: TrackingPayload = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  const eventPayload = {
    event: eventName,
    ...payload
  };

  window.dispatchEvent(
    new CustomEvent("writex:quote-event", {
      detail: eventPayload
    })
  );

  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.dataLayer?.push(eventPayload);
}
