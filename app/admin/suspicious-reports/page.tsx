import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { SuspiciousReportQueue } from "@/components/admin/SuspiciousReportQueue";
import { canManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { listSuspiciousReportsForAdmin } from "@/lib/trust/admin-operations";

export const metadata: Metadata = {
  title: "Suspicious Reports | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function SuspiciousReportsPage() {
  const session = await requireAdminSession();
  if (!canManageRepresentativeDirectory(session)) notFound();
  const reports = await listSuspiciousReportsForAdmin();
  const open = reports.filter((report) =>
    ["received", "under_review"].includes(report.status)
  ).length;
  return (
    <AdminShell
      session={session}
      eyebrow="Trust & Verification"
      title="Suspicious reports"
      description="Review customer safety reports, inspect private evidence through authorised access, and retain every case decision in the audit trail."
      actions={
        <>
          <AdminButton href="/trust-centre/report" tone="secondary">
            Open public report form
          </AdminButton>
          <AdminButton href="/admin/audit-logs">View audit</AdminButton>
        </>
      }
      nextAction={
        open
          ? {
              label: "Review uploaded evidence",
              reason: `${open} open report${open === 1 ? "" : "s"} need a recorded human decision.`,
              href: "#report-queue"
            }
          : undefined
      }
    >
      <div id="report-queue">
        <SuspiciousReportQueue initialReports={reports} />
      </div>
    </AdminShell>
  );
}
