import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminEmptyState,
  AdminPanel,
  AdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageSmartHiring } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";

export const metadata: Metadata = {
  title: "Trust Publishing | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function TrustPublishingPage() {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const data = await getHiringAdminSnapshot();
  const blocked = data.trustPublishing.filter(
    (item) => item.status !== "published"
  ).length;
  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="Trust publishing"
      description="Only joined, approved representatives with an active employee ID and official mobile can enter the public verification directory."
      nextAction={
        blocked
          ? {
              label: "Review publish blockers",
              reason: `${blocked} record${blocked === 1 ? "" : "s"} do not currently pass every publication gate.`,
              href: "#publishing-queue"
            }
          : undefined
      }
    >
      <AdminPanel
        title="Eligibility gates"
        description="Publication is never automatic. Block reasons remain visible before any approval or revocation."
        action={
          <Link
            href="/admin/audit-logs"
            className="inline-flex min-h-11 items-center rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxViolet700"
          >
            View audit
          </Link>
        }
      >
        <div id="publishing-queue">
          {data.trustPublishing.length ? (
            <div className="grid gap-3">
              {data.trustPublishing.map((item) => (
                <article
                  key={item.applicationReference}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <strong className="font-semibold text-wxIndigo900">
                      {item.applicationReference}
                    </strong>
                    <AdminStatus status={item.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-wxIndigo500">
                    {item.blockedReasons.length
                      ? `Next recommended action: resolve ${item.blockedReasons.join(", ")}.`
                      : "Every recorded eligibility gate is currently clear."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="Nothing is eligible for publishing"
              description="No candidate has reached the joined and approved publication state."
            />
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
