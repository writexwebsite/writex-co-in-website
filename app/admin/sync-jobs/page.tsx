import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminPanel,
  AdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/admin/session";
import { getRepresentativeSyncStatus } from "@/lib/trust/representative-sync-status";

export const metadata: Metadata = {
  title: "Sync Jobs | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function SyncJobsPage() {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") notFound();
  const representative = await getRepresentativeSyncStatus();
  const jobs = [
    {
      name: "Representative directory",
      status: representative.safeFailureReason
        ? "failed"
        : representative.lastSuccessfulAt
          ? "synced"
          : "pending",
      lastRun: representative.lastAttemptedAt,
      nextRun: representative.automaticSync.nextRunAt,
      href: "/admin/representatives"
    },
    {
      name: "PMT project data",
      status: "awaiting_connection",
      lastRun: null,
      nextRun: null,
      href: "/admin/integration-logs"
    },
    {
      name: "HRMS joining",
      status:
        process.env.HIRING_HRMS_PROVIDER === "api"
          ? "configured"
          : "awaiting_connection",
      lastRun: null,
      nextRun: null,
      href: "/admin/hiring/hrms-sync"
    }
  ];
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="Sync jobs"
      description="Current sync outcomes and destinations. Provider credentials and raw payloads remain private."
    >
      <AdminPanel
        title="Scheduled and provider syncs"
        description="Open the destination workflow to retry or inspect a failed job."
      >
        <div className="grid gap-3">
          {jobs.map((job) => (
            <a
              key={job.name}
              href={job.href}
              className="grid gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-semibold text-wxIndigo900">{job.name}</p>
                <p className="mt-1 text-xs text-wxIndigo500">
                  Last run:{" "}
                  {job.lastRun
                    ? new Date(job.lastRun).toLocaleString("en-IN")
                    : "Not recorded"}
                </p>
              </div>
              <p className="text-xs text-wxIndigo500">
                Next:{" "}
                {job.nextRun
                  ? new Date(job.nextRun).toLocaleString("en-IN")
                  : "Provider controlled"}
              </p>
              <AdminStatus status={job.status} />
            </a>
          ))}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
