import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { SlaAlertActions } from "@/components/admin/SlaAlertActions";
import { getSlaAlerts } from "@/lib/admin/sla";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "SLA Alerts | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | Date | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function entityHref(entityType: string, entityId: string) {
  if (entityType === "quote_lead") return `/admin/leads/${entityId}`;
  if (entityType === "payment_event") return `/admin/payments/${entityId}`;
  if (entityType === "revision_request") return `/admin/revisions/${entityId}`;
  return "/admin/dashboard";
}

export default async function AdminSlaPage() {
  const session = await requireAdminSession();
  const alerts = await getSlaAlerts();

  return (
    <AdminShell session={session} eyebrow="Operating control" title="SLA alerts">
      <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-slateText">
            Run <code className="rounded bg-paleSage px-1">POST /api/jobs/sla-check</code> with
            the job secret to refresh alerts server-side.
          </p>
          <Link href="/admin/manager-review" className="text-sm font-bold text-mutedCopper hover:underline">
            Open manager review
          </Link>
        </div>
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border border-sageBorder bg-white shadow-soft">
        {alerts.length ? (
          <div className="divide-y divide-sageBorder">
            {alerts.map((alert) => (
              <article
                key={alert.id}
                className="wx-row-hover grid gap-3 p-5 text-sm hover:bg-paleSage/70 lg:grid-cols-[0.6fr_1fr_1fr_0.8fr]"
              >
                <div>
                  <span
                    className={`rounded-full bg-academicEmerald px-3 py-1 text-xs font-bold uppercase text-white ${
                      alert.severity === "critical" ? "wx-critical-pulse" : ""
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <p className="mt-3 font-semibold capitalize">{alert.status}</p>
                </div>
                <div>
                  <p className="font-bold">{alert.alert_type.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-slateText">{alert.message}</p>
                  <Link href={entityHref(alert.entity_type, alert.entity_id)} className="mt-2 inline-flex font-bold text-mutedCopper hover:underline">
                    View entity
                  </Link>
                </div>
                <div>
                  <p className="font-semibold">Recommended action</p>
                  <p className="mt-1 text-slateText">
                    {alert.recommended_action || "Review in admin."}
                  </p>
                  <p className="mt-2 text-xs text-slateText">
                    Deadline: {formatDate(alert.sla_deadline)}
                  </p>
                </div>
                <SlaAlertActions alertId={alert.id} />
              </article>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-slateText">
            No SLA alerts are open. New deadline or follow-up risks will appear
            here after the SLA check runs.
          </p>
        )}
      </section>
    </AdminShell>
  );
}
