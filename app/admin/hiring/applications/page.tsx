import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HiringOperationsConsole } from "@/components/admin/HiringOperationsConsole";
import {
  AdminButton,
  AdminEmptyState,
  AdminPanel
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  canManageSmartHiring,
  canUseHiringPermission
} from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";
import { hiringRoleLabel } from "@/lib/hiring/domain";

export const metadata: Metadata = {
  title: "Hiring Applications | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function HiringApplicationsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; stage?: string }>;
}) {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const { search = "", stage } = await searchParams;
  const data = await getHiringAdminSnapshot();
  const canExport = canUseHiringPermission(
    session,
    "hiring.applications.export"
  );
  const canManage = canUseHiringPermission(
    session,
    "hiring.applications.manage"
  );
  const unassigned = data.applications.filter((item) => !item.assigned).length;

  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="Applications"
      description="Review privacy-safe applications, assign a human reviewer and move candidates only through approved hiring stages."
      actions={
        <>
          {canExport ? (
            <AdminButton href="/api/admin/hiring/applications/export.csv">
              Export permitted data
            </AdminButton>
          ) : null}
          <AdminButton href="#application-operations" tone="primary">
            Review application
          </AdminButton>
        </>
      }
      nextAction={
        unassigned
          ? {
              label: "Assign a reviewer",
              reason: `${unassigned} application${unassigned === 1 ? " is" : "s are"} currently unassigned.`,
              href: "#application-queue"
            }
          : undefined
      }
    >
      <AdminPanel
        title="Application queue"
        description="Search, filter and sort the server-provided queue. Contact details remain encrypted and absent from this list."
      >
        <div id="application-queue">
          {data.applications.length ? (
            <AdminDataTable
              caption="Hiring applications"
              rows={data.applications.map((item) => ({
                id: item.reference,
                reference: item.reference,
                role: hiringRoleLabel(item.role),
                stage: item.stage,
                assigned: item.assigned,
                reviewer: item.reviewer,
                source: item.source,
                qualification: item.qualification,
                experience: item.experience,
                assessmentStatus: item.assessmentStatus,
                verificationStatus: item.verificationStatus,
                notificationStatus: item.notificationStatus,
                risk: item.risk,
                submittedAt: item.submittedAt
              }))}
              columns={[
                {
                  key: "reference",
                  label: "Reference",
                  primary: true
                },
                { key: "role", label: "Role" },
                { key: "stage", label: "Stage", type: "status" },
                {
                  key: "assigned",
                  label: "Reviewer assigned",
                  type: "boolean"
                },
                {
                  key: "reviewer",
                  label: "Reviewer",
                  defaultVisible: false
                },
                { key: "source", label: "Source", defaultVisible: false },
                {
                  key: "qualification",
                  label: "Qualification",
                  defaultVisible: false
                },
                {
                  key: "experience",
                  label: "Experience",
                  defaultVisible: false
                },
                {
                  key: "assessmentStatus",
                  label: "Assessment",
                  type: "status",
                  defaultVisible: false
                },
                {
                  key: "verificationStatus",
                  label: "Verification",
                  type: "status",
                  defaultVisible: false
                },
                {
                  key: "notificationStatus",
                  label: "Internal alert",
                  type: "status",
                  defaultVisible: false
                },
                {
                  key: "risk",
                  label: "Risk",
                  type: "status",
                  defaultVisible: false
                },
                { key: "submittedAt", label: "Submitted", type: "date" }
              ]}
              detailHrefPrefix="/admin/hiring/applications"
              detailLabel="Review"
              canExport={canExport}
              filters={[
                { key: "role", label: "role" },
                { key: "stage", label: "stage" },
                { key: "source", label: "source" },
                {
                  key: "assigned",
                  label: "reviewer assignment",
                  options: [
                    { value: "true", label: "Assigned" },
                    { value: "false", label: "Unassigned" }
                  ]
                },
                { key: "reviewer", label: "reviewer" },
                { key: "experience", label: "experience" },
                { key: "qualification", label: "qualification" },
                { key: "assessmentStatus", label: "assessment status" },
                { key: "verificationStatus", label: "verification status" },
                { key: "notificationStatus", label: "notification status" },
                { key: "risk", label: "risk" },
                {
                  key: "submittedAt",
                  label: "submitted date",
                  type: "date-range"
                }
              ]}
              searchPlaceholder="Search reference, role or stage"
              initialQuery={search}
              initialFilters={stage ? { stage } : {}}
            />
          ) : (
            <AdminEmptyState
              title="No applications"
              description="The queue will populate after real candidates submit through the enabled Careers Hub."
            />
          )}
        </div>
      </AdminPanel>

      {canManage ? (
        <div className="mt-6" id="application-operations">
          <HiringOperationsConsole view="applications" />
        </div>
      ) : null}
    </AdminShell>
  );
}
