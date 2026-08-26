import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  TriangleAlert
} from "lucide-react";
import { hiringRoleLabel } from "@/lib/hiring/domain";

export function AdminMetricCard({
  label,
  value,
  href,
  priority = "normal",
  caption,
  updatedAt,
  actionLabel = "Open queue"
}: {
  label: string;
  value: string | number;
  href?: string;
  priority?: "critical" | "action" | "normal";
  caption?: string;
  updatedAt?: string;
  actionLabel?: string;
}) {
  const tone =
    priority === "critical"
      ? "border-red-200 bg-red-50/80"
      : priority === "action"
        ? "border-wxOrange500/30 bg-wxSurfaceBlush"
        : "border-wxBorder bg-wxSurface";
  const icon =
    priority === "critical" ? (
      <AlertCircle className="h-4 w-4 text-red-600" />
    ) : priority === "action" ? (
      <TriangleAlert className="h-4 w-4 text-wxOrange500" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-wxGreen500" />
    );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wxIndigo500">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold leading-none text-wxIndigo900">
        {value}
      </p>
      {caption ? (
        <p className="mt-3 text-sm leading-5 text-wxIndigo500">{caption}</p>
      ) : null}
      <div className="mt-5 flex min-h-6 items-center justify-between gap-3 border-t border-wxBorder pt-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-wxIndigo400">
          <Clock3 className="h-3.5 w-3.5" />
          {updatedAt || "Current view"}
        </span>
        {href ? (
          <span className="inline-flex items-center gap-1 font-semibold text-wxViolet700">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
    </>
  );

  const classes = `rounded-lg border p-5 shadow-soft transition ${tone}`;
  return href ? (
    <Link
      href={href}
      className={`${classes} wx-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700`}
    >
      {body}
    </Link>
  ) : (
    <article className={classes}>{body}</article>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className = ""
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-wxIndigo900">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-wxIndigo500">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AdminButton({
  href,
  children,
  tone = "secondary",
  icon,
  className = ""
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  className?: string;
}) {
  const styles = {
    primary: "wx-gradient-action border-transparent text-white",
    secondary:
      "border-wxBorder bg-wxSurface text-wxIndigo700 hover:border-wxViolet700 hover:text-wxViolet700",
    danger: "border-red-200 bg-red-50 text-red-700 hover:border-red-400"
  };
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 ${styles[tone]} ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}

export function AdminStatusBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
}) {
  const tones = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    neutral: "bg-wxSurfaceSoft text-wxIndigo600 border-wxBorder",
    info: "bg-violet-50 text-wxViolet700 border-violet-200"
  };
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function humaniseAdminStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "academic_writer" || normalized === "sales_executive") {
    return hiringRoleLabel(normalized);
  }
  const labels: Record<string, string> = {
    provider_unavailable: "Awaiting Connection",
    unavailable: "Awaiting Connection",
    not_configured: "Awaiting Connection",
    sync_failed: "Failed",
    manual_review_required: "Action Required",
    pending_review: "In Review",
    under_review: "In Review",
    review_required: "Action Required",
    needs_review: "Action Required",
    approved_with_conditions: "Approved with Conditions",
    unable_to_verify: "Unable to Verify",
    not_approved: "Unable to Verify",
    application_received: "Application Received",
    eligibility_review: "Eligibility Review",
    assessment_submitted: "Assessment Submitted",
    interview_scheduled: "Interview Scheduled",
    interview_completed: "Interview Completed",
    awaiting_connection: "Awaiting Connection",
    in_progress: "In Progress",
    no_show: "No-show",
    partially_paid: "Partially Paid",
    fully_paid: "Fully Paid"
  };
  if (labels[normalized]) return labels[normalized];
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(
  status: string
): "success" | "warning" | "danger" | "neutral" | "info" {
  const value = status.toLowerCase();
  if (
    ["approved", "active", "completed", "live", "joined", "submitted", "synced", "published", "healthy", "sent"].some(
      (token) => value.includes(token)
    )
  )
    return "success";
  if (
    ["blocked", "failed", "rejected", "revoked", "expired", "not_approved", "error"].some(
      (token) => value.includes(token)
    )
  )
    return "danger";
  if (
    ["pending", "review", "required", "clarification", "unable", "unavailable", "not_configured"].some(
      (token) => value.includes(token)
    )
  )
    return "warning";
  if (
    ["started", "scheduled", "invited", "eligible", "selected", "progress"].some(
      (token) => value.includes(token)
    )
  )
    return "info";
  return "neutral";
}

export function AdminStatus({ status }: { status: string }) {
  return (
    <AdminStatusBadge tone={statusTone(status)}>
      {humaniseAdminStatus(status)}
    </AdminStatusBadge>
  );
}

export function AdminActionCard({
  title,
  value,
  description,
  href,
  actionLabel,
  tone = "normal",
  updatedAt
}: {
  title: string;
  value: string | number;
  description: string;
  href: string;
  actionLabel: string;
  tone?: "critical" | "action" | "normal";
  updatedAt?: string;
}) {
  return (
    <AdminMetricCard
      label={title}
      value={value}
      caption={description}
      href={href}
      priority={tone}
      actionLabel={actionLabel}
      updatedAt={updatedAt}
    />
  );
}

export function AdminEmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-wxBorder bg-wxSurfaceSoft px-5 py-10 text-center">
      <Inbox className="mx-auto h-6 w-6 text-wxIndigo400" aria-hidden />
      <h3 className="mt-3 font-semibold text-wxIndigo900">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-wxIndigo500">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminErrorState({
  title,
  description,
  referenceId,
  retry
}: {
  title: string;
  description: string;
  referenceId?: string;
  retry?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-5 py-6 text-red-900"
    >
      <AlertCircle className="h-6 w-6" aria-hidden />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6">{description}</p>
      {referenceId ? (
        <p className="mt-2 font-mono text-xs">Reference: {referenceId}</p>
      ) : null}
      {retry ? <div className="mt-4">{retry}</div> : null}
    </div>
  );
}

export function AdminLoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-3">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="wx-skeleton h-16 rounded-md" />
      ))}
    </div>
  );
}

export function AdminActivityTimeline({
  events
}: {
  events: Array<{
    id: string;
    title: string;
    detail?: string;
    timestamp: string;
  }>;
}) {
  if (!events.length)
    return (
      <AdminEmptyState
        title="No activity yet"
        description="Audited actions and status changes will appear here."
      />
    );
  return (
    <ol className="grid gap-4">
      {events.map((event) => (
        <li
          key={event.id}
          className="relative border-l-2 border-wxViolet700 pl-4"
        >
          <span
            className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-wxViolet700"
            aria-hidden
          />
          <p className="font-semibold text-wxIndigo900">{event.title}</p>
          {event.detail ? (
            <p className="mt-1 text-sm leading-6 text-wxIndigo500">
              {event.detail}
            </p>
          ) : null}
          <time
            className="mt-1 block text-xs text-wxIndigo400"
            dateTime={event.timestamp}
          >
            {new Date(event.timestamp).toLocaleString("en-IN")}
          </time>
        </li>
      ))}
    </ol>
  );
}

export function AdminResponsiveTable({
  headings,
  children,
  caption
}: {
  headings: string[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-wxBorder">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-wxSurfaceSoft">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
