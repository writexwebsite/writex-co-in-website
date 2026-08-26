import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HiringOperationsConsole } from "@/components/admin/HiringOperationsConsole";
import {
  AdminMetricCard,
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
  title: "Hiring Assessments | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const data = await getHiringAdminSnapshot();
  const canReview = canUseHiringPermission(
    session,
    "hiring.assessments.review"
  );
  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="Assessments"
      description="Invite candidates, review exact delivered versions, inspect advisory integrity signals and record human scores."
      nextAction={
        data.integrityReviewCount
          ? {
              label: "Review integrity events",
              reason: `${data.integrityReviewCount} advisory event${data.integrityReviewCount === 1 ? "" : "s"} need an assessor.`,
              href: "#assessment-queue"
            }
          : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminMetricCard label="Assessment sessions" value={data.assessments.length} />
        <AdminMetricCard
          label="Integrity review"
          value={data.integrityReviewCount}
          priority={data.integrityReviewCount ? "action" : "normal"}
          caption="Advisory only; never an automatic rejection."
        />
      </div>

      <div className="mt-6" id="assessment-queue">
        <AdminPanel
          title="Assessment review queue"
          description="Question versions and session state remain retained for audit."
        >
          <AdminDataTable
            caption="Assessment review queue"
            rows={data.assessments.map((item) => ({
              id: item.reference,
              reference: item.reference,
              application: item.applicationReference,
              role: hiringRoleLabel(item.role),
              status: item.state,
              assessor: item.assessor,
              integrityLevel: item.integrityLevel,
              vivaStatus: item.vivaStatus,
              submittedAt: item.submittedAt,
              createdAt: item.createdAt
            }))}
            columns={[
              { key: "reference", label: "Session", primary: true },
              { key: "application", label: "Application" },
              { key: "role", label: "Role" },
              { key: "status", label: "Status", type: "status" },
              {
                key: "assessor",
                label: "Assessor",
                defaultVisible: false
              },
              {
                key: "integrityLevel",
                label: "Integrity",
                type: "status",
                defaultVisible: false
              },
              {
                key: "vivaStatus",
                label: "Viva",
                type: "status",
                defaultVisible: false
              },
              {
                key: "submittedAt",
                label: "Submitted",
                type: "date",
                defaultVisible: false
              },
              { key: "createdAt", label: "Created", type: "date" }
            ]}
            detailHrefPrefix="/admin/hiring/assessments"
            detailLabel="Review responses"
            filters={[
              { key: "role", label: "role" },
              { key: "status", label: "status" },
              { key: "assessor", label: "assessor" },
              { key: "integrityLevel", label: "integrity level" },
              { key: "vivaStatus", label: "viva status" },
              {
                key: "submittedAt",
                label: "submitted date",
                type: "date-range"
              }
            ]}
            searchPlaceholder="Search session, application or role"
          />
        </AdminPanel>
      </div>

      {canReview ? (
        <div className="mt-6">
          <HiringOperationsConsole view="assessments" />
        </div>
      ) : null}
    </AdminShell>
  );
}
