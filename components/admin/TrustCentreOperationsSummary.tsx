import { AdminMetricCard } from "@/components/admin/AdminPrimitives";

type Summary = {
  providers: {
    representative: "live" | "unavailable";
    invoice: "unavailable";
    payment: "unavailable";
    enquiry: "unavailable";
  };
  reports: Record<string, number>;
  verifications30Days: Record<string, number>;
  externalHealth: Array<{
    system: string;
    endpoint: string;
    status: string;
    checkedAt: string;
  }>;
};

export function TrustCentreOperationsSummary({
  summary
}: {
  summary: Summary;
}) {
  const openReports =
    (summary.reports.received || 0) + (summary.reports.under_review || 0);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        label="Representative verification"
        value={summary.providers.representative === "live" ? "Live" : "Review"}
        href="/admin/representatives"
        actionLabel="Open directory"
        caption="LTS-backed public representative verification."
      />
      <AdminMetricCard
        label="Open suspicious reports"
        value={openReports}
        href="/admin/suspicious-reports"
        actionLabel="Review reports"
        priority={openReports ? "action" : "normal"}
        caption="Received and in-review customer safety cases."
      />
      <AdminMetricCard
        label="Verifications (30 days)"
        value={summary.verifications30Days.representative || 0}
        href="/admin/trust-centre"
        actionLabel="View operations"
        caption="Successful representative checks recorded for audit."
      />
      <AdminMetricCard
        label="External record checks"
        value="Awaiting APIs"
        href="/admin/invoice-verification"
        actionLabel="Review dependencies"
        priority="action"
        caption="Invoice, payment and enquiry providers remain truthfully unavailable."
      />
    </div>
  );
}
