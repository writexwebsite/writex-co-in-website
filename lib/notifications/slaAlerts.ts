import "server-only";

import { sendInternalEmail } from "@/lib/notifications";
import type { AdminSlaAlert } from "@/lib/admin/sla";

async function notifyIfEnabled(toEnv: string, alert: AdminSlaAlert, label: string) {
  if (process.env.SLA_EMAIL_ALERTS_ENABLED !== "true") {
    return { sent: false, reason: "sla_email_disabled" };
  }

  if (!process.env[toEnv]) {
    return { sent: false, reason: `${toEnv.toLowerCase()}_not_configured` };
  }

  return sendInternalEmail({
    to: process.env[toEnv] || "",
    subject: label,
    text: [
      `${label}: ${alert.severity.toUpperCase()}`,
      `Alert type: ${alert.alert_type}`,
      `Entity: ${alert.entity_type} ${alert.entity_id}`,
      `Message: ${alert.message}`,
      `Recommended action: ${alert.recommended_action || "Review in admin."}`
    ].join("\n")
  });
}

export function notifyManagerCriticalAlert(alert: AdminSlaAlert) {
  return notifyIfEnabled("MANAGER_NOTIFICATION_EMAIL", alert, "Critical SLA alert");
}

export function notifyOwnerOverdueFollowup(alert: AdminSlaAlert) {
  return notifyIfEnabled("SALES_MANAGER_NOTIFICATION_EMAIL", alert, "Overdue follow-up");
}

export function notifyAccountsPaymentAlert(alert: AdminSlaAlert) {
  return notifyIfEnabled("ACCOUNTS_NOTIFICATION_EMAIL", alert, "Payment SLA alert");
}

export function notifyOpsRevisionAlert(alert: AdminSlaAlert) {
  return notifyIfEnabled("OPS_NOTIFICATION_EMAIL", alert, "Revision SLA alert");
}
