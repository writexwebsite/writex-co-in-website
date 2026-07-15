export const followUpTemplates = {
  new_lead_acknowledgement:
    "Hi {name}, this is WriteX. We received your quote request for {service}. Please share your full brief, deadline, and files so we can review the scope.",
  brief_missing:
    "Hi {name}, this is WriteX. We need the brief, rubric, deadline, word count, and files to scope your request accurately.",
  quote_ready:
    "Hi {name}, this is WriteX. Your scope-based quote for {service} is ready for review.",
  quote_follow_up:
    "Hi {name}, this is WriteX following up on your academic support quote. Please let us know if you need help with the next step.",
  payment_pending:
    "Hi {name}, this is WriteX. Payment verification is pending for your request. Please share the payment proof if already completed.",
  revision_received:
    "Hi {name}, this is WriteX. Your revision or clarification request has been received and will be reviewed against the agreed scope."
} as const;

export function renderFollowUpTemplate(
  template: keyof typeof followUpTemplates,
  values: Record<string, string | null | undefined>
) {
  return followUpTemplates[template].replace(/\{(\w+)\}/g, (_, key: string) => {
    return values[key] || "";
  });
}
