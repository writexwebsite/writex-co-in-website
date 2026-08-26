import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { RepresentativeDirectoryControl } from "@/components/admin/RepresentativeDirectoryControl";
import { SuspiciousReportQueue } from "@/components/admin/SuspiciousReportQueue";
import { TrustCentreOperationsSummary } from "@/components/admin/TrustCentreOperationsSummary";
import { canManageRepresentativeDirectory } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import {
  getTrustOperationsSummary,
  listSuspiciousReportsForAdmin
} from "@/lib/trust/admin-operations";
import { listRepresentativesForAdmin } from "@/lib/trust/representative-admin";
import { getRepresentativeSyncStatus } from "@/lib/trust/representative-sync-status";

export const metadata: Metadata = {
  title: "Trust Centre Operations | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function TrustCentreOperationsPage() {
  const session = await requireAdminSession();
  if (!canManageRepresentativeDirectory(session)) notFound();

  const [status, representatives, reports, summary] = await Promise.all([
    getRepresentativeSyncStatus(),
    listRepresentativesForAdmin(),
    listSuspiciousReportsForAdmin(),
    getTrustOperationsSummary()
  ]);

  return (
    <AdminShell
      session={session}
      eyebrow="Trust & Verification"
      title="Trust Centre operations"
      description="Monitor public verification, representative-directory health and suspicious customer reports from one controlled workspace."
      actions={
        <>
          <AdminButton href="/trust-centre">Open public Trust Centre</AdminButton>
          <AdminButton href="/admin/representatives" tone="primary">
            Sync representatives
          </AdminButton>
        </>
      }
      nextAction={
        reports.some((report) => ["received", "under_review"].includes(report.status))
          ? {
              label: "Review suspicious reports",
              reason: "One or more customer safety cases remain open.",
              href: "/admin/suspicious-reports"
            }
          : undefined
      }
    >
      <div className="grid gap-6">
        <TrustCentreOperationsSummary summary={summary} />
        <SuspiciousReportQueue initialReports={reports} />
        <RepresentativeDirectoryControl
          initialStatus={status}
          initialRepresentatives={representatives}
        />
      </div>
    </AdminShell>
  );
}
