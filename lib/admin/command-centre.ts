import "server-only";

import type { AdminSession } from "@/lib/auth";
import { getAdminMetrics } from "@/lib/admin/metrics";
import { canManageSmartHiring } from "@/lib/admin/permissions";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { getClientPortalOperationsSummary } from "@/lib/client/admin-operations";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";
import {
  getTrustOperationsSummary,
  listSuspiciousReportsForAdmin
} from "@/lib/trust/admin-operations";

export type CommandCentreAction = {
  title: string;
  value: string | number;
  description: string;
  href: string;
  actionLabel: string;
  tone: "critical" | "action" | "normal";
  updatedAt?: string;
};

export type CommandCentreSystem = {
  name: string;
  status: string;
  detail: string;
  href: string;
  checkedAt?: string;
};

export type CommandCentreFestival = {
  active: boolean;
  festivalName: string;
  variantName: string | null;
  scheduledCount: number;
};

export async function getAdminCommandCentre(session: AdminSession) {
  const isSuperAdmin = session.role === "super_admin";
  const hiringVisible = canManageSmartHiring(session);
  const [metrics, hiring, trust, reports, client, festival] = await Promise.all([
    getAdminMetrics({ includeStorageHealth: isSuperAdmin }),
    hiringVisible ? getHiringAdminSnapshot().catch(() => null) : null,
    isSuperAdmin ? getTrustOperationsSummary().catch(() => null) : null,
    isSuperAdmin ? listSuspiciousReportsForAdmin(100).catch(() => []) : [],
    isSuperAdmin
      ? getClientPortalOperationsSummary().catch(() => null)
      : null,
    getFestivalOperationalStatus()
  ]);

  const openReports = reports.filter((report) =>
    ["received", "under_review"].includes(report.status)
  ).length;
  const failedReportNotifications = reports.filter(
    (report) => report.notificationStatus === "failed"
  ).length;
  const newApplications = hiring?.counts.application_received || 0;
  const interviewQueue =
    (hiring?.counts.interview_scheduled || 0) +
    (hiring?.counts.interview_completed || 0);

  const critical: CommandCentreAction[] = [
    ...(isSuperAdmin && metrics.system.s3Health?.state !== "configured_healthy"
      ? [
          {
            title: "Private storage",
            value: "Review",
            description:
              "The latest private-storage check is not confirmed healthy.",
            href: "/admin/storage",
            actionLabel: "Review storage",
            tone: "critical" as const,
            updatedAt: metrics.system.s3Health?.lastCheckedAt
              ? formatTimestamp(metrics.system.s3Health.lastCheckedAt)
              : "Not checked"
          }
        ]
      : []),
    ...(isSuperAdmin && !metrics.system.emailConfigured
      ? [
          {
            title: "Email delivery",
            value: "Unavailable",
            description:
              "Customer and operational notifications require configuration review.",
            href: "/admin/email",
            actionLabel: "Review email",
            tone: "critical" as const
          }
        ]
      : []),
    ...(metrics.actionQueue.openSlaAlerts > 0
      ? [
          {
            title: "Open SLA alerts",
            value: metrics.actionQueue.openSlaAlerts,
            description: "Client response deadlines require an owner.",
            href: "/admin/sla",
            actionLabel: "Open SLA queue",
            tone: "critical" as const
          }
        ]
      : []),
    ...(failedReportNotifications > 0
      ? [
          {
            title: "Failed trust alerts",
            value: failedReportNotifications,
            description:
              "Management notification delivery failed for suspicious reports.",
            href: "/admin/suspicious-reports",
            actionLabel: "Review failed alerts",
            tone: "critical" as const
          }
        ]
      : [])
  ];

  const actionRequired: CommandCentreAction[] = [
    ...(isSuperAdmin
      ? [
          {
            title: "Suspicious reports",
            value: openReports,
            description:
              "Review evidence, assign an owner and record the case outcome.",
            href: "/admin/suspicious-reports",
            actionLabel: "Review reports",
            tone: openReports ? ("action" as const) : ("normal" as const)
          }
        ]
      : []),
    ...(hiringVisible
      ? [
          {
            title: "Connected candidates",
            value: hiring?.connectedReviewCount || 0,
            description:
              "Human review is required before linked candidates progress.",
            href: "/admin/hiring/connected-candidates",
            actionLabel: "Review connections",
            tone: hiring?.connectedReviewCount
              ? ("action" as const)
              : ("normal" as const)
          },
          {
            title: "Assessment integrity",
            value: hiring?.integrityReviewCount || 0,
            description:
              "Advisory integrity signals are waiting for an assessor.",
            href: "/admin/hiring/assessments",
            actionLabel: "Review assessments",
            tone: hiring?.integrityReviewCount
              ? ("action" as const)
              : ("normal" as const)
          },
          {
            title: "Verification cases",
            value: hiring?.verificationCases.length || 0,
            description:
              "Identity, education and background checks need human decisions.",
            href: "/admin/hiring/verification-centre",
            actionLabel: "Open verification",
            tone: hiring?.verificationCases.length
              ? ("action" as const)
              : ("normal" as const)
          }
        ]
      : []),
    {
      title: "Payment proofs",
      value: metrics.payments.pendingVerification,
      description: "Submitted payment evidence is waiting for verification.",
      href: "/admin/payments",
      actionLabel: "Review payments",
      tone: metrics.payments.pendingVerification ? "action" : "normal"
    }
  ];

  const pending: CommandCentreAction[] = [
    ...(hiringVisible
      ? [
          {
            title: "New applications",
            value: newApplications,
            description:
              "Applications are ready for eligibility review and assignment.",
            href: "/admin/hiring/applications",
            actionLabel: "Review applications",
            tone: "normal" as const
          },
          {
            title: "Interview work",
            value: interviewQueue,
            description:
              "Scheduled interviews and completed scorecards need follow-through.",
            href: "/admin/hiring/interviews",
            actionLabel: "Open interviews",
            tone: "normal" as const
          }
        ]
      : []),
    {
      title: "Unassigned quote leads",
      value: metrics.actionQueue.unassignedLeads,
      description: "New enquiries need a responsible owner.",
      href: "/admin/manager-review",
      actionLabel: "Assign owners",
      tone: "normal"
    },
    {
      title: "Overdue follow-ups",
      value: metrics.actionQueue.overdueFollowUps,
      description: "Client follow-ups have passed their recorded due time.",
      href: "/admin/crm",
      actionLabel: "Open follow-ups",
      tone: metrics.actionQueue.overdueFollowUps ? "action" : "normal"
    },
    ...(client
      ? [
          {
            title: "Failed client sign-ins",
            value: client.failedLogins24h,
            description:
              "Review unusual activity without exposing invoice or mobile data.",
            href: "/admin/client-portal/sessions",
            actionLabel: "Review access",
            tone: client.failedLogins24h
              ? ("action" as const)
              : ("normal" as const)
          }
        ]
      : [])
  ];

  const healthBySystem = new Map(
    (trust?.externalHealth || []).map((entry) => [
      entry.system,
      { status: entry.status, checkedAt: entry.checkedAt }
    ])
  );
  const external = (
    name: string,
    key: string,
    href: string,
    configured: boolean
  ): CommandCentreSystem => {
    const health = healthBySystem.get(key);
    return {
      name,
      status: health?.status || (configured ? "configured" : "awaiting_connection"),
      detail: health
        ? "Latest sanitised provider check"
        : configured
          ? "Configured; no recent health record"
          : "Provider connection is not active",
      href,
      checkedAt: health?.checkedAt
        ? formatTimestamp(health.checkedAt)
        : undefined
    };
  };

  const systems: CommandCentreSystem[] = [
    {
      name: "Website",
      status: "live",
      detail: "WriteX Admin is serving this command centre.",
      href: "/api/health",
      checkedAt: "Current request"
    },
    {
      name: "Database",
      status: metrics.system.databaseConfigured ? "configured" : "failed",
      detail: metrics.system.databaseConfigured
        ? "Application database is configured."
        : "Database configuration requires review.",
      href: "/admin/system-health"
    },
    {
      name: "Private S3",
      status:
        metrics.system.s3Health?.state === "configured_healthy"
          ? "healthy"
          : metrics.system.s3Configured
            ? "review_required"
            : "awaiting_connection",
      detail: "Private evidence and file storage.",
      href: "/admin/storage",
      checkedAt: metrics.system.s3Health?.lastCheckedAt
        ? formatTimestamp(metrics.system.s3Health.lastCheckedAt)
        : undefined
    },
    {
      name: "Amazon SES",
      status: metrics.system.emailConfigured ? "configured" : "awaiting_connection",
      detail: "Operational and customer email delivery.",
      href: "/admin/email"
    },
    external(
      "LTS",
      "lts",
      "/admin/integration-logs",
      Boolean(process.env.LTS_API_BASE_URL)
    ),
    external(
      "PMT",
      "pmt",
      "/admin/integration-logs",
      Boolean(process.env.PMT_API_BASE_URL)
    ),
    {
      name: "HRMS",
      status: process.env.HIRING_HRMS_PROVIDER === "api"
        ? "configured"
        : "awaiting_connection",
      detail: "Employee creation remains gated by provider availability.",
      href: "/admin/hiring/hrms-sync"
    },
    {
      name: "Trust Publishing",
      status: process.env.HIRING_TRUST_PROVIDER === "api"
        ? "configured"
        : "awaiting_connection",
      detail: "Publication remains blocked until every eligibility gate passes.",
      href: "/admin/hiring/trust-publishing"
    }
  ];

  return {
    critical,
    actionRequired,
    pending,
    systems,
    metrics,
    hiring,
    trust,
    client,
    festival
  };
}

async function getFestivalOperationalStatus(): Promise<CommandCentreFestival> {
  if (!isDatabaseConfigured()) {
    return {
      active: false,
      festivalName: "Normal WriteX Theme",
      variantName: null,
      scheduledCount: 0
    };
  }
  try {
    const [active, scheduled] = await Promise.all([
      dbQuery<{ festival_name: string; variant_name: string | null }>(`
        select festival_name, variant_name
        from active_festival_snapshots
        where state = 'active'
        order by activated_at desc
        limit 1
      `),
      dbQuery<{ count: string }>(`
        select count(*)::text as count
        from festival_studio_configurations
        where activation_status = 'scheduled'
      `)
    ]);
    const current = active.rows[0];
    return {
      active: Boolean(current),
      festivalName: current?.festival_name || "Normal WriteX Theme",
      variantName: current?.variant_name || null,
      scheduledCount: Number(scheduled.rows[0]?.count || 0)
    };
  } catch {
    return {
      active: false,
      festivalName: "Status unavailable",
      variantName: null,
      scheduledCount: 0
    };
  }
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
