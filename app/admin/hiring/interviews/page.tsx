import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HiringOperationsConsole } from "@/components/admin/HiringOperationsConsole";
import { AdminPanel } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  canManageSmartHiring,
  canUseHiringPermission
} from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";

export const metadata: Metadata = {
  title: "Hiring Interviews | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const data = await getHiringAdminSnapshot();
  const canManage = canUseHiringPermission(
    session,
    "hiring.interviews.manage"
  );
  const awaitingDecision = data.interviews.filter((item) =>
    ["completed", "scorecard_pending"].includes(item.status)
  ).length;
  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="Interviews"
      description="Schedule structured interviews, record scorecards, handle no-shows and retain the complete decision trail."
      nextAction={
        awaitingDecision
          ? {
              label: "Submit interview recommendation",
              reason: `${awaitingDecision} completed interview${awaitingDecision === 1 ? "" : "s"} need a recorded decision.`,
              href: "#interview-operations"
            }
          : undefined
      }
    >
      <AdminPanel
        title="Interview schedule"
        description="Private interview notes are not included in candidate notifications."
      >
        <AdminDataTable
          caption="Interview schedule"
          rows={data.interviews.map((item) => ({
            id: item.id,
            application: item.applicationReference,
            type: item.type,
            status: item.status,
            scheduledAt: item.scheduledAt,
            recommendation: item.recommendation
          }))}
          columns={[
            { key: "application", label: "Application", primary: true },
            { key: "type", label: "Interview" },
            { key: "status", label: "Status", type: "status" },
            { key: "scheduledAt", label: "Scheduled", type: "date" },
            { key: "recommendation", label: "Recommendation" }
          ]}
          filterKey="status"
          searchPlaceholder="Search application, type or status"
        />
      </AdminPanel>
      {canManage ? (
        <div className="mt-6" id="interview-operations">
          <HiringOperationsConsole view="interviews" />
        </div>
      ) : null}
    </AdminShell>
  );
}
