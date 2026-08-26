import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HiringOperationsConsole } from "@/components/admin/HiringOperationsConsole";
import { VerificationDocumentUpload } from "@/components/admin/VerificationDocumentUpload";
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

export const metadata: Metadata = {
  title: "Verification Centre | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function VerificationCentrePage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const { status } = await searchParams;
  const data = await getHiringAdminSnapshot();
  const count = (type: string) =>
    data.verificationCases.filter((item) => item.type === type).length;
  const canReview = canUseHiringPermission(
    session,
    "hiring.verification.review"
  );
  const discrepancies = data.verificationCases.reduce(
    (sum, item) => sum + item.discrepancies,
    0
  );
  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring"
      title="Verification Centre"
      description="Consent-led identity, education and background review. Uploaded scans support human review and never become electronic-verification claims."
      nextAction={
        discrepancies
          ? {
              label: "Review verification evidence",
              reason: `${discrepancies} recorded discrepanc${discrepancies === 1 ? "y" : "ies"} need a human decision.`,
              href: "#verification-queue"
            }
          : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="Identity" value={count("identity")} />
        <AdminMetricCard label="Education" value={count("education")} />
        <AdminMetricCard label="Background" value={count("background")} />
        <AdminMetricCard
          label="Discrepancies"
          value={discrepancies}
          priority={discrepancies ? "action" : "normal"}
        />
      </div>
      <div className="mt-6" id="verification-queue">
        <AdminPanel
          title="Verification queue"
          description="Final offer gates require authorised human decisions."
        >
          <AdminDataTable
            caption="Candidate verification cases"
            rows={data.verificationCases.map((item) => ({
              id: item.id,
              application: item.applicationReference,
              type: item.type,
              status: item.status,
              discrepancies: item.discrepancies,
              reviewer: item.reviewer,
              offerBlocked: item.offerBlocked,
              updatedAt: item.updatedAt
            }))}
            columns={[
              { key: "application", label: "Application", primary: true },
              { key: "type", label: "Verification" },
              { key: "status", label: "Status", type: "status" },
              { key: "discrepancies", label: "Discrepancies" },
              {
                key: "reviewer",
                label: "Reviewer",
                defaultVisible: false
              },
              {
                key: "offerBlocked",
                label: "Offer blocked",
                type: "boolean",
                defaultVisible: false
              },
              { key: "updatedAt", label: "Updated", type: "date" }
            ]}
            detailHrefPrefix="/admin/hiring/verification-centre"
            detailLabel="Review evidence"
            filters={[
              { key: "type", label: "verification type" },
              { key: "status", label: "status" },
              { key: "reviewer", label: "reviewer" },
              {
                key: "offerBlocked",
                label: "offer blocked",
                options: [
                  { value: "true", label: "Blocked" },
                  { value: "false", label: "Not blocked" }
                ]
              },
              {
                key: "updatedAt",
                label: "updated date",
                type: "date-range"
              }
            ]}
            searchPlaceholder="Search application, verification type or status"
            initialFilters={status ? { status } : {}}
          />
        </AdminPanel>
      </div>
      {canReview ? (
        <>
          <div className="mt-6">
            <HiringOperationsConsole view="verification" />
          </div>
          <div className="mt-6">
            <VerificationDocumentUpload />
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
