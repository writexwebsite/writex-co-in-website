import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssessmentReviewWorkspace } from "@/components/admin/AssessmentReviewWorkspace";
import { HiringOperationsConsole } from "@/components/admin/HiringOperationsConsole";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageSmartHiring, canUseHiringPermission } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAssessmentDetail } from "@/lib/hiring/admin";

export const metadata: Metadata = { title: "Assessment Review | WriteX Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AssessmentReviewPage({ params }: { params: Promise<{ reference: string }> }) {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session) || !canUseHiringPermission(session, "hiring.assessments.review")) notFound();
  const { reference } = await params;
  const detail = await getHiringAssessmentDetail(reference);
  if (!detail) notFound();
  return <AdminShell session={session} eyebrow="Smart Hiring / Assessment" title={detail.reference} description="Exact responses, advisory integrity signals, human scoring, viva evidence, session history and audit in one review workspace.">
    <AssessmentReviewWorkspace detail={detail} />
    <div className="mt-6"><HiringOperationsConsole view="assessments" applicationReference={detail.applicationReference} /></div>
  </AdminShell>;
}
