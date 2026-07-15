import "server-only";

import { isProduction } from "@/lib/security";

type NotificationPayload = {
  subject: string;
  text: string;
  to: string;
};

export type QuoteNotification = {
  leadId: string;
  name: string;
  email?: string;
  whatsapp: string;
  country?: string;
  serviceRequired: string;
  academicLevel?: string;
  subject?: string;
  wordCount?: number;
  deadline: string;
  instructions: string;
  source: string;
  createdAt: string;
  uploadedFileName?: string;
  fileAssetId?: string;
};

async function sendEmail({ subject, text, to }: NotificationPayload) {
  if (!process.env.RESEND_API_KEY) {
    if (isProduction()) {
      return {
        sent: false,
        reason: "resend_not_configured"
      };
    }

    return {
      sent: false,
      reason: "development_email_not_configured"
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "WriteX <noreply@writex.co.in>",
      to,
      subject,
      text
    })
  });

  return {
    sent: response.ok,
    status: response.status
  };
}

export async function sendInternalEmail(payload: NotificationPayload) {
  return sendEmail(payload);
}

export async function notifyNewLead(lead: QuoteNotification) {
  const to = process.env.QUOTE_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "quote_email_not_configured" };

  return sendEmail({
    to,
    subject: `New WriteX Quote Request - ${lead.serviceRequired}`,
    text: [
      `Lead ID: ${lead.leadId}`,
      `Created: ${lead.createdAt}`,
      `Name: ${lead.name}`,
      `WhatsApp: ${lead.whatsapp}`,
      `Email: ${lead.email || "Not provided"}`,
      `Country: ${lead.country || "Not provided"}`,
      `Service: ${lead.serviceRequired}`,
      `Academic level: ${lead.academicLevel || "Not provided"}`,
      `Subject: ${lead.subject || "Not provided"}`,
      `Word count: ${lead.wordCount || "Not provided"}`,
      `Deadline: ${lead.deadline}`,
      `Source: ${lead.source}`,
      `Uploaded file: ${lead.uploadedFileName || "Not uploaded"}`,
      `File asset ID: ${lead.fileAssetId || "Not available"}`,
      lead.fileAssetId
        ? "File storage: private S3 object. Use internal signed access only."
        : "File storage: no private file asset linked.",
      "",
      "Instructions:",
      lead.instructions
    ].join("\n")
  });
}

export type PaymentProofNotification = {
  invoiceId: string;
  clientName?: string | null;
  whatsapp?: string | null;
  amountPaid?: number | string | null;
  currency?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentDate?: string | null;
  notes?: string | null;
  proofFileAssetId?: string | null;
  proofFileName?: string | null;
  currentPmtPaymentStatus?: string | null;
  adminUrl?: string | null;
};

export async function notifyPaymentProof({
  invoiceId,
  clientName,
  whatsapp,
  amountPaid,
  currency,
  paymentMethod,
  paymentReference,
  paymentDate,
  notes,
  proofFileAssetId,
  proofFileName,
  currentPmtPaymentStatus,
  adminUrl
}: PaymentProofNotification) {
  const to = process.env.ACCOUNTS_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "accounts_email_not_configured" };

  return sendEmail({
    to,
    subject: `Payment Proof Submitted - Invoice ${invoiceId}`,
    text: [
      `Invoice ID: ${invoiceId}`,
      `Client name: ${clientName || "Not available"}`,
      `WhatsApp: ${whatsapp || "Not available"}`,
      `Amount claimed paid: ${amountPaid ?? "Not provided"} ${currency || ""}`.trim(),
      `Payment method: ${paymentMethod || "Not provided"}`,
      `Payment reference: ${paymentReference || "Not provided"}`,
      `Payment date: ${paymentDate || "Not provided"}`,
      `Notes: ${notes || "Not provided"}`,
      `Proof file asset ID: ${proofFileAssetId || "Not uploaded"}`,
      `Proof file name: ${proofFileName || "Not uploaded"}`,
      `Current PMT payment status: ${currentPmtPaymentStatus || "Unavailable"}`,
      adminUrl ? `Admin review link: ${adminUrl}` : "Admin review link: Not configured",
      "",
      "Do not treat this proof as settled until accounts/PMT verification is complete.",
      "Proof files are private. Use protected admin signed access only."
    ].join("\n")
  });
}

export async function notifyAccounts(message: string) {
  const to = process.env.ACCOUNTS_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "accounts_email_not_configured" };

  return sendEmail({
    to,
    subject: "WriteX accounts notification",
    text: message
  });
}

export type RevisionRequestNotification = {
  revisionRequestId: string;
  invoiceId: string;
  requestType: string;
  issueCategory: string;
  relatedSection?: string | null;
  priority: string;
  message: string;
  fileAssetId?: string | null;
  clientName?: string | null;
  whatsapp?: string | null;
  createdAt: string;
  adminUrl?: string | null;
};

export async function notifyRevisionRequest({
  revisionRequestId,
  invoiceId,
  requestType,
  issueCategory,
  relatedSection,
  priority,
  message,
  fileAssetId,
  clientName,
  whatsapp,
  createdAt,
  adminUrl
}: RevisionRequestNotification) {
  const to = process.env.SUPPORT_NOTIFICATION_EMAIL || process.env.OPS_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "support_email_not_configured" };

  return sendEmail({
    to,
    subject: `Revision Request Submitted - Invoice ${invoiceId}`,
    text: [
      `Revision request ID: ${revisionRequestId}`,
      `Invoice ID: ${invoiceId}`,
      `Created: ${createdAt}`,
      `Client name: ${clientName || "Not available"}`,
      `WhatsApp: ${whatsapp || "Not available"}`,
      `Request type: ${requestType}`,
      `Issue category: ${issueCategory}`,
      `Related section: ${relatedSection || "Not provided"}`,
      `Priority: ${priority}`,
      `File asset ID: ${fileAssetId || "No attachment"}`,
      adminUrl ? `Admin review link: ${adminUrl}` : "Admin review link: Not configured",
      "",
      "Message:",
      message,
      "",
      "Review this against the original brief and agreed scope before confirming action."
    ].join("\n")
  });
}

export async function notifyDownloadUnlocked(invoiceId: string) {
  const to = process.env.ACCOUNTS_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "accounts_email_not_configured" };

  return sendEmail({
    to,
    subject: `Download unlocked: ${invoiceId}`,
    text: `Final file download was unlocked for invoice ${invoiceId}.`
  });
}
