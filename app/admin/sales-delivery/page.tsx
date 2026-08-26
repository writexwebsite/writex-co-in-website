import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminSectionHub } from "@/components/admin/AdminSectionHub";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminMetrics } from "@/lib/admin/metrics";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Sales & Delivery | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function SalesDeliveryPage() {
  const session = await requireAdminSession();
  const metrics = await getAdminMetrics();
  const deliveryIssues =
    metrics.revisions.submitted +
    metrics.revisions.underReview +
    metrics.revisions.needsClarification;
  const paymentIssues =
    metrics.payments.pendingVerification + metrics.actionQueue.openSlaAlerts;

  return (
    <AdminShell
      session={session}
      eyebrow="Sales & Delivery"
      title="Sales and delivery workspace"
      description="Move a new enquiry through ownership, follow-up, delivery and payment attention from one task-first workspace."
      actions={
        <>
          <AdminButton href="/admin/leads">Open lead queue</AdminButton>
          <AdminButton href="/pricing#quote" tone="primary">Add Lead</AdminButton>
        </>
      }
      nextAction={
        metrics.actionQueue.unassignedLeads
          ? {
              label: "Assign new leads",
              reason: `${metrics.actionQueue.unassignedLeads} lead${metrics.actionQueue.unassignedLeads === 1 ? " needs" : "s need"} an owner.`,
              href: "/admin/manager-review"
            }
          : undefined
      }
    >
      <AdminSectionHub
        tasks={[
          { title: "New Leads", description: "Review incoming quote requests and assign the next action.", href: "/admin/leads", status: String(metrics.actionQueue.unassignedLeads) },
          { title: "Follow-ups Due", description: "Open overdue and scheduled CRM follow-ups.", href: "/admin/crm", status: String(metrics.actionQueue.overdueFollowUps) },
          { title: "Orders & Assignments", description: "Assign owners and review work waiting for management action.", href: "/admin/manager-review" },
          { title: "Deliveries & Revisions", description: "Handle delivery concerns, revisions and client clarification.", href: "/admin/revisions", status: String(deliveryIssues) },
          { title: "Payment & Issue Attention", description: "Review payment evidence and active service-level issues.", href: "#payment-issues", status: String(paymentIssues) },
          { title: "Reports", description: "Open the founder-ready operational report.", href: "/admin/founder-report" }
        ]}
        advanced={[
          { title: "Payment Proof Queue", description: "Exact verification records", href: "/admin/payments" },
          { title: "SLA Alerts", description: "Deadline and response alerts", href: "/admin/sla" }
        ]}
      />
      <section id="payment-issues" className="mt-7 scroll-mt-28 rounded-md border border-wxBorder bg-wxSurface p-5">
        <h2 className="text-lg font-semibold text-wxIndigo900">Payment and issue attention</h2>
        <p className="mt-1 text-sm text-wxIndigo500">Choose the queue that matches the issue. No record ownership or workflow has changed.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminButton href="/admin/payments">Payment proofs ({metrics.payments.pendingVerification})</AdminButton>
          <AdminButton href="/admin/sla">SLA alerts ({metrics.actionQueue.openSlaAlerts})</AdminButton>
          <AdminButton href="/admin/revisions">Revision issues ({deliveryIssues})</AdminButton>
        </div>
      </section>
    </AdminShell>
  );
}
