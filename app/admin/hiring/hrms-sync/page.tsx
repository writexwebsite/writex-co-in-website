import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminEmptyState,
  AdminPanel,
  AdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminProviderState } from "@/components/admin/AdminProviderState";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageSmartHiring } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";

export const metadata: Metadata = {
  title: "HRMS Sync | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function HiringHrmsSyncPage() {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const data = await getHiringAdminSnapshot();
  const providerStatus =
    process.env.HIRING_HRMS_PROVIDER === "api"
      ? "configured"
      : "awaiting_connection";
  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="HRMS integration"
      description="Selected candidates remain in a controlled joining queue until the approved HRMS contract is connected."
      nextAction={
        providerStatus === "awaiting_connection"
          ? {
              label: "View required API contract",
              reason: "Automatic employee creation is intentionally unavailable.",
              href: "/admin/help"
            }
          : undefined
      }
    >
      <AdminProviderState
        title="HRMS provider"
        status={providerStatus}
        description="No fake employee record or successful sync is created while this provider is unavailable."
        requirements={[
          "Approved HRMS employee-create and status endpoints",
          "WriteX server allowlist and credentials",
          "Joining, retry and idempotency test records",
          "Employee ID return mapping and rollback process"
        ]}
        actions={[
          { label: "View required API contract", href: "/admin/help" },
          { label: "View pending HRMS queue", href: "#hrms-queue" }
        ]}
      />
      <div className="mt-6" id="hrms-queue">
        <AdminPanel
          title="Pending HRMS queue"
          description="Safe application references and provider outcomes only."
        >
          {data.hrms.length ? (
            <div className="grid gap-3">
              {data.hrms.map((item) => (
                <article
                  key={item.applicationReference}
                  className="flex flex-col gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-wxIndigo900">
                      {item.applicationReference}
                    </p>
                    <p className="mt-1 text-sm text-wxIndigo500">
                      {item.failure ||
                        "No sanitised provider failure has been recorded."}
                    </p>
                  </div>
                  <AdminStatus status={item.status} />
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No HRMS sync records"
              description="The queue is empty. No fake joining record has been created."
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
