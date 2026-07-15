import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminMetrics } from "@/lib/admin/metrics";
import { getToolSalesMetrics } from "@/lib/admin/toolSales";
import { requireAdminSession } from "@/lib/admin/session";
import { canUseToolPermission } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Admin Dashboard | WriteX",
  robots: { index: false, follow: false }
};

function statusLabel(status: string) {
  return status.replace("_", " ");
}

function formatDate(value: string | Date | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: value instanceof Date ? "short" : undefined
  }).format(new Date(value));
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const [metrics, toolMetrics] = await Promise.all([getAdminMetrics(), getToolSalesMetrics()]);

  return (
    <AdminShell
      session={session}
      eyebrow="Quote lead control"
      title="Admin dashboard"
    >
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="New leads today" value={metrics.leads.today} href="/admin/leads" tone="strong" />
        <MetricCard label="Unassigned leads" value={metrics.actionQueue.unassignedLeads} href="/admin/manager-review" tone="warning" />
        <MetricCard label="Overdue follow-ups" value={metrics.actionQueue.overdueFollowUps} href="/admin/crm" tone="warning" />
        <MetricCard label="Payment proofs pending" value={metrics.payments.pendingVerification} href="/admin/payments" />
        <MetricCard label="Revisions pending" value={metrics.revisions.submitted + metrics.revisions.underReview} href="/admin/revisions" />
        <MetricCard label="Open SLA alerts" value={metrics.actionQueue.openSlaAlerts} href="/admin/sla" tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <MetricCard label="Needs clarification" value={metrics.payments.needsClarification} href="/admin/payments" />
        <MetricCard label="Open lead total" value={metrics.leads.total} href="/admin/leads" />
        <MetricCard label="New leads in 7 days" value={metrics.leads.week} href="/admin/leads" />
        <MetricCard label="Founder report" value="View" href="/admin/founder-report" />
        <MetricCard label="S3 configured" value={metrics.system.s3Configured ? "Yes" : "No"} href="/admin/integration-logs" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Status breakdown</h2>
            <Link
              href="/admin/leads"
              className="text-sm font-bold text-mutedCopper hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {Object.entries(metrics.leads.byStatus).length ? (
              Object.entries(metrics.leads.byStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-md bg-paleSage px-4 py-3"
                >
                  <span className="text-sm font-semibold capitalize">
                    {statusLabel(status)}
                  </span>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slateText">
                No lead status data is available yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Latest quote leads</h2>
          <div className="mt-5 divide-y divide-sageBorder">
            {metrics.leads.latest.length ? (
              metrics.leads.latest.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="block py-4 transition hover:bg-paleSage/70"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold">{lead.name}</p>
                      <p className="text-sm text-slateText">
                        {lead.service_required} · {lead.subject || "No subject"}
                      </p>
                    </div>
                    <div className="text-sm text-slateText md:text-right">
                      <p className="font-semibold capitalize text-charcoalInk">
                        {lead.status}
                      </p>
                      <p>{formatDate(lead.created_at)}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slateText">No quote leads have arrived yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Service demand</h2>
          <div className="mt-4 space-y-3">
            {metrics.services.byService.map((item) => (
              <div key={item.label} className="flex justify-between rounded-md bg-paleSage px-4 py-3 text-sm">
                <span className="font-semibold">{item.label}</span>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">System health</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Line label="Database" value={metrics.system.databaseConfigured ? "Configured" : "Not configured"} />
            <Line label="S3" value={metrics.system.s3Configured ? "Configured" : "Not configured"} />
            <Line label="Email" value={metrics.system.emailConfigured ? "Configured" : "Not configured"} />
            <Line label="Integration mode" value={metrics.system.ltsMode} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/audit-logs" className="text-sm font-bold text-mutedCopper hover:underline">
              Audit logs
            </Link>
            <Link href="/admin/integration-logs" className="text-sm font-bold text-mutedCopper hover:underline">
              Integration logs
            </Link>
            <Link href="/admin/manager-review" className="text-sm font-bold text-mutedCopper hover:underline">
              Manager review
            </Link>
          </div>
        </section>
      </div>

      {canUseToolPermission(session, "tools.analytics.view") || canUseToolPermission(session, "tools.leads.view") ? (
        <section className="mt-6 rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-wxViolet700">Free Tools sales engine</p><h2 className="mt-2 text-xl font-bold">Lead and SLA control</h2></div>
            <Link href="/admin/leads?search=free_tools" className="text-sm font-bold text-wxViolet700 hover:underline">Open tool leads</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <ToolMetric label="Tool leads today" value={toolMetrics.toolLeadsToday} />
            <ToolMetric label="Hot uncontacted" value={toolMetrics.hotLeads} alert />
            <ToolMetric label="Completed builders" value={toolMetrics.completedBuilders} />
            <ToolMetric label="Abandoned builders" value={toolMetrics.abandonedBuilders} />
            <ToolMetric label="Template downloads" value={toolMetrics.templateDownloads} />
            <ToolMetric label="Term Plan interest" value={toolMetrics.termPlanInterest} />
            <ToolMetric label="SLA breaches" value={toolMetrics.slaBreaches} alert />
            <ToolMetric label="Unassigned" value={toolMetrics.unassignedLeads} alert />
            <ToolMetric label="Follow-ups due" value={toolMetrics.followUpsDue} alert />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <ToolBreakdown title="Revenue by tool" rows={toolMetrics.revenueByTool} valueLabel="Revenue" />
            <ToolBreakdown title="Conversion by tool" rows={toolMetrics.conversionByTool} valueLabel="Conversion %" />
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}

function ToolMetric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <div className={`rounded-md border p-4 ${alert && value ? "border-wxOrange500/35 bg-wxOrange500/5" : "border-wxBorder bg-wxSurfaceSoft"}`}><p className="text-xs font-semibold text-wxIndigo500">{label}</p><p className="mt-2 text-2xl font-bold text-wxIndigo900">{value}</p></div>;
}

function ToolBreakdown({ title, rows, valueLabel }: { title: string; rows: Array<{ label: string; count: number; value?: number }>; valueLabel: string }) {
  return <div className="rounded-md border border-wxBorder p-4"><h3 className="font-bold text-wxIndigo900">{title}</h3><div className="mt-3 grid gap-2">{rows.length ? rows.map((row) => <div key={row.label} className="flex items-center justify-between gap-3 rounded-md bg-wxSurfaceSoft px-3 py-2 text-sm"><span className="font-semibold capitalize">{row.label.replace(/_/g, " ")}</span><span className="text-wxIndigo500">{row.count} leads · {valueLabel}: {row.value ?? 0}</span></div>) : <p className="text-sm text-wxIndigo500">No tool attribution data yet.</p>}</div></div>;
}

function MetricCard({
  label,
  value,
  href,
  tone = "default"
}: {
  label: string;
  value: string | number;
  href: string;
  tone?: "default" | "strong" | "warning";
}) {
  return (
    <Link
      href={href}
      className={`wx-admin-enter wx-row-hover rounded-lg border p-4 shadow-soft ${
        tone === "strong"
          ? "border-academicEmerald bg-academicEmerald text-white"
          : tone === "warning"
            ? "border-mutedCopper/40 bg-mutedCopper/10 text-charcoalInk"
            : "border-sageBorder bg-white text-charcoalInk hover:bg-paleSage/60"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.14em] ${
          tone === "strong" ? "text-white/70" : "text-slateText"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Link>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-md bg-paleSage px-4 py-3">
      <span className="font-semibold text-slateText">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
