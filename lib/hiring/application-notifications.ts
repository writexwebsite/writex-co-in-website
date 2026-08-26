import "server-only";

import { dbQuery } from "@/lib/db";
import { hashHiringSignal } from "@/lib/hiring/candidate-disclosure";
import { hiringRoleLabel } from "@/lib/hiring/domain";
import { sendInternalEmail } from "@/lib/notifications";

type NotificationResult = {
  sent: boolean;
  provider?: string;
  messageId?: string;
  reason?: string;
  status?: number;
};

type NewApplicationNotificationInput = {
  applicationId: string;
  applicationReference: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  submittedAt: string;
  correlationId: string;
};

export const hiringNotificationTypes = [
  "internal_hiring_alert",
  "application_acknowledgement"
] as const;

export type HiringNotificationType = (typeof hiringNotificationTypes)[number];

function adminApplicationUrl(reference: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://www.writex.co.in";
  return `${baseUrl}/admin/hiring/applications/${encodeURIComponent(reference)}`;
}

async function safeSend(payload: {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
}): Promise<NotificationResult> {
  try {
    return await sendInternalEmail(payload);
  } catch {
    return { sent: false, reason: "provider_request_failed" };
  }
}

async function latestNotificationWasSent(
  applicationId: string,
  notificationType: HiringNotificationType
) {
  const result = await dbQuery<{ status: string }>(
    `select status
       from hiring_notifications
      where application_id = $1
        and notification_type = $2
      order by created_at desc
      limit 1`,
    [applicationId, notificationType]
  );
  return result.rows[0]?.status === "sent";
}

async function recordNotification({
  applicationId,
  notificationType,
  recipient,
  result,
  correlationId
}: {
  applicationId: string;
  notificationType: HiringNotificationType;
  recipient: string;
  result: NotificationResult;
  correlationId: string;
}) {
  const status = result.sent
    ? "sent"
    : result.reason?.includes("not_configured")
      ? "unavailable"
      : "failed";
  await dbQuery(
    `insert into hiring_notifications (
       application_id, notification_type, recipient_hash, provider,
       provider_message_reference, status, safe_failure_reason, sent_at,
       correlation_id, last_attempted_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())`,
    [
      applicationId,
      notificationType,
      hashHiringSignal("notification_recipient", recipient.toLowerCase()),
      result.provider || null,
      result.messageId || null,
      status,
      result.sent
        ? null
        : result.reason || `provider_status_${result.status || "unknown"}`,
      result.sent ? new Date() : null,
      correlationId
    ]
  );
  await dbQuery(
    `insert into hiring_audit_logs (
       application_id, actor_type, action, entity_type, entity_reference,
       safe_metadata, correlation_id
     ) values ($1,'system','application_notification_recorded',
       'hiring_notification',$2,$3::jsonb,$4)`,
    [
      applicationId,
      notificationType,
      JSON.stringify({ notificationType, status, provider: result.provider || null }),
      correlationId
    ]
  );
  return status;
}

async function sendOne(
  input: NewApplicationNotificationInput,
  notificationType: HiringNotificationType,
  options: { skipAlreadySent?: boolean } = {}
) {
  if (
    options.skipAlreadySent !== false &&
    (await latestNotificationWasSent(input.applicationId, notificationType))
  ) {
    return { notificationType, status: "suppressed" as const };
  }

  const internal = notificationType === "internal_hiring_alert";
  const recipient = internal
    ? process.env.HIRING_NOTIFICATION_EMAIL || process.env.SUPPORT_EMAIL
    : input.candidateEmail;
  if (!recipient) {
    const status = await recordNotification({
      applicationId: input.applicationId,
      notificationType,
      recipient: `unconfigured:${notificationType}`,
      result: { sent: false, reason: "hiring_email_not_configured" },
      correlationId: input.correlationId
    });
    return { notificationType, status };
  }

  const result = internal
    ? await safeSend({
        to: recipient,
        replyTo: input.candidateEmail,
        subject: `New WriteX application - ${input.applicationReference}`,
        text: [
          "New application received",
          "",
          `Candidate: ${input.candidateName}`,
          `Role: ${hiringRoleLabel(input.role)}`,
          `Application reference: ${input.applicationReference}`,
          `Submitted: ${input.submittedAt}`,
          `Open application: ${adminApplicationUrl(input.applicationReference)}`,
          "",
          "Private candidate files are not attached. Open them only through the authorised Admin application detail."
        ].join("\n")
      })
    : await safeSend({
        to: recipient,
        subject: "WriteX application received",
        text: [
          `Hello ${input.candidateName},`,
          "",
          "Your WriteX application has been received for human review.",
          `Application reference: ${input.applicationReference}`,
          "",
          "Keep this reference to check your application status. A relationship disclosure or an automated assessment signal never causes automatic rejection by itself.",
          "",
          "WriteX Smart Hiring"
        ].join("\n")
      });

  const status = await recordNotification({
    applicationId: input.applicationId,
    notificationType,
    recipient,
    result,
    correlationId: input.correlationId
  });
  return { notificationType, status };
}

export async function deliverNewApplicationNotifications(
  input: NewApplicationNotificationInput
) {
  const results = [];
  for (const notificationType of hiringNotificationTypes) {
    try {
      results.push(await sendOne(input, notificationType));
    } catch {
      console.error("Hiring notification state could not be recorded", {
        applicationReference: input.applicationReference,
        notificationType,
        correlationId: input.correlationId,
        category: "notification_recording_failed",
        timestamp: new Date().toISOString()
      });
      results.push({ notificationType, status: "failed" as const });
    }
  }
  return results;
}

export async function retryNewApplicationNotification(
  input: NewApplicationNotificationInput,
  notificationType: HiringNotificationType
) {
  return sendOne(input, notificationType);
}
