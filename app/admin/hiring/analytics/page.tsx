import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminMetricCard,
  AdminPanel,
  humaniseAdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageSmartHiring } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";

export const metadata: Metadata = {
  title: "Hiring Analytics | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function HiringAnalyticsPage() {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const data = await getHiringAdminSnapshot();
  const stageEntries = Object.entries(data.counts);
  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="Hiring analytics"
      description="Operational funnel counts from real records. These views support decisions but never score or reject a candidate automatically."
      actions={
        <a
          href="/api/admin/hiring/applications/export.csv"
          className="inline-flex min-h-11 items-center rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxViolet700"
        >
          Export permitted data
        </a>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Applications" value={data.applications.length} />
        <AdminMetricCard label="Assessments" value={data.assessments.length} />
        <AdminMetricCard label="Interviews" value={data.interviews.length} />
        <AdminMetricCard
          label="Verification cases"
          value={data.verificationCases.length}
        />
      </div>
      <div className="mt-6">
        <AdminPanel
          title="Current funnel"
          description="Counts reflect the current stage of each stored application."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stageEntries.map(([stage, count]) => (
              <div
                key={stage}
                className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                  {humaniseAdminStatus(stage)}
                </p>
                <p className="mt-3 text-2xl font-semibold text-wxIndigo900">
                  {count}
                </p>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
