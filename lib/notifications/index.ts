import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { isProduction } from "@/lib/security";

type NotificationPayload = {
  subject: string;
  text: string;
  to: string;
  replyTo?: string;
};

function smtpFrom() {
  const address = process.env.SMTP_FROM_EMAIL;
  const name = process.env.SMTP_FROM_NAME?.trim();

  if (!address) return undefined;
  return name ? { name, address } : address;
}

function resendFrom() {
  const address = process.env.SMTP_FROM_EMAIL;
  const name = process.env.SMTP_FROM_NAME?.trim();

  if (address) return name ? `${name} <${address}>` : address;
  return process.env.RESEND_FROM_EMAIL || "WriteX <noreply@writex.co.in>";
}

const globalForMail = globalThis as typeof globalThis & {
  writexSmtpTransport?: Transporter;
};

function smtpEnabled() {
  const hasAuthUser = Boolean(process.env.SMTP_USER);
  const hasAuthPassword = Boolean(
    process.env.SMTP_PASSWORD || process.env.SMTP_PASS
  );

  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_FROM_EMAIL &&
      hasAuthUser === hasAuthPassword
  );
}

export function isEmailConfigured() {
  return smtpEnabled() || Boolean(process.env.RESEND_API_KEY);
}

export async function verifyEmailTransport() {
  const smtp = getSmtpTransport();
  if (!smtp) {
    return {
      configured: false,
      reachable: false,
      provider: process.env.RESEND_API_KEY ? "resend" : "none"
    };
  }
  try {
    await smtp.verify();
    return { configured: true, reachable: true, provider: "smtp" };
  } catch {
    return { configured: true, reachable: false, provider: "smtp" };
  }
}

function getSmtpTransport() {
  if (!smtpEnabled()) return null;
  if (globalForMail.writexSmtpTransport) return globalForMail.writexSmtpTransport;

  const secure = process.env.SMTP_SECURE === "true";
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const auth = process.env.SMTP_USER && smtpPassword
    ? { user: process.env.SMTP_USER, pass: smtpPassword }
    : undefined;

  globalForMail.writexSmtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure && process.env.SMTP_REQUIRE_TLS !== "false",
    auth,
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false"
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000)
  });

  return globalForMail.writexSmtpTransport;
}

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

async function sendEmail({ subject, text, to, replyTo }: NotificationPayload) {
  const smtp = getSmtpTransport();
  if (smtp) {
    const result = await smtp.sendMail({
      from: smtpFrom(),
      to,
      replyTo: replyTo || process.env.SMTP_REPLY_TO || undefined,
      subject,
      text,
      headers: process.env.SES_CONFIGURATION_SET
        ? { "X-SES-CONFIGURATION-SET": process.env.SES_CONFIGURATION_SET }
        : undefined
    });

    return {
      sent: true,
      provider: "smtp",
      messageId: result.messageId
    };
  }

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
      from: resendFrom(),
      to,
      reply_to: replyTo || process.env.SMTP_REPLY_TO || undefined,
      subject,
      text
    })
  });

  return {
    sent: response.ok,
    provider: "resend",
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
    replyTo: lead.email,
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

export async function notifyQuoteAcknowledgement(lead: QuoteNotification) {
  if (!lead.email) return { sent: false, reason: "client_email_not_provided" };

  return sendEmail({
    to: lead.email,
    subject: "WriteX quote request received",
    text: [
      `Hello ${lead.name},`,
      "",
      "Thank you for sharing your academic support requirement with WriteX.",
      `Reference: ${lead.leadId}`,
      `Service: ${lead.serviceRequired}`,
      `Deadline: ${lead.deadline}`,
      "",
      "The team will review the brief and confirm the support scope before quoting.",
      "",
      "WriteX Academic Support"
    ].join("\n")
  });
}

export type ContactNotification = {
  intent: string;
  name: string;
  email: string;
  whatsapp?: string;
  reference?: string;
  message: string;
};

export async function notifyContactEnquiry(contact: ContactNotification) {
  const to = process.env.CONTACT_NOTIFICATION_EMAIL || process.env.QUOTE_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "contact_email_not_configured" };

  return sendEmail({
    to,
    replyTo: contact.email,
    subject: `WriteX contact enquiry - ${contact.intent}`,
    text: [
      `Intent: ${contact.intent}`,
      `Name: ${contact.name}`,
      `Email: ${contact.email}`,
      `WhatsApp: ${contact.whatsapp || "Not provided"}`,
      `Reference: ${contact.reference || "Not provided"}`,
      "",
      "Message:",
      contact.message
    ].join("\n")
  });
}

export async function notifyContactAcknowledgement(contact: ContactNotification) {
  return sendEmail({
    to: contact.email,
    subject: "WriteX enquiry received",
    text: [
      `Hello ${contact.name},`,
      "",
      "Thank you for contacting WriteX. Your enquiry has reached the team and will be routed to the appropriate support function.",
      contact.reference ? `Reference shared: ${contact.reference}` : "",
      "",
      "WriteX Academic Support"
    ].filter(Boolean).join("\n")
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
