import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CandidateDocumentActions } from "@/components/admin/CandidateDocumentActions";
import { HiringOperationsConsole } from "@/components/admin/HiringOperationsConsole";
import { AdminActivityTimeline, AdminEmptyState, AdminPanel, AdminStatus } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageSmartHiring, canUseHiringPermission } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringVerificationCaseDetail } from "@/lib/hiring/admin";

export const metadata: Metadata = { title: "Verification Case | WriteX Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerificationCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session) || !canUseHiringPermission(session, "hiring.verification.review")) notFound();
  const { caseId } = await params;
  const detail = await getHiringVerificationCaseDetail(caseId);
  if (!detail) notFound();
  return <AdminShell session={session} eyebrow="Smart Hiring / Verification" title={`${detail.type.replace(/_/g, " ")} review`} description="Consent, private evidence, discrepancies, human decisions and audit history. Scans are never presented as electronic verification without an approved provider.">
    <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
      <AdminPanel title="Case summary">
        <dl className="grid gap-3 text-sm">
          <Row label="Application" value={detail.applicationReference} />
          <Row label="Method" value={detail.method || "Not recorded"} />
          <Row label="Consent" value={detail.consentRecordedAt ? new Date(detail.consentRecordedAt).toLocaleString("en-IN") : "Not recorded"} />
          <Row label="Discrepancies" value={String(detail.discrepancyCount)} />
          <div className="flex items-center justify-between gap-3"><dt className="text-wxIndigo500">Status</dt><dd><AdminStatus status={detail.status} /></dd></div>
        </dl>
      </AdminPanel>
      <AdminPanel title="Completion checklist" description="A high-impact decision must cite evidence and explicitly confirm human review.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Check label="Consent recorded" complete={Boolean(detail.consentRecordedAt)} />
          <Check label="Evidence uploaded" complete={detail.documents.length > 0} />
          <Check label="Review method recorded" complete={Boolean(detail.method)} />
          <Check label="Discrepancies displayed" complete />
          <Check label="Candidate clarification reviewed" complete={detail.decisions.some((decision) => decision.decision === "candidate_clarification")} />
          <Check label="Reviewer recommendation available" complete={detail.decisions.length > 0} />
        </div>
      </AdminPanel>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <AdminPanel title="Private documents" description="Files use short-lived signed access. Every view, revoke and delete is audited.">
        {detail.documents.length ? <div className="grid gap-3">{detail.documents.map((document) => <article key={document.id} className="rounded-md border border-wxBorder p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{document.kind.replace(/_/g, " ")}</p><p className="mt-1 break-all text-xs text-wxIndigo500">{document.fileName}</p></div><AdminStatus status={document.malwareStatus} /></div><p className="mt-3 text-xs text-wxIndigo500">Masking: {document.maskingStatus.replace(/_/g, " ")} / Visual review: {document.visualReviewStatus.replace(/_/g, " ")}</p><CandidateDocumentActions fileId={document.fileId} fileName={document.fileName} mimeType={document.mimeType} /></article>)}</div> : <AdminEmptyState title="No documents" description="Upload only consented evidence that is required for this verification case." />}
      </AdminPanel>
      <AdminPanel title="Decision history" description="Reasons, evidence categories and conditions are retained.">
        {detail.decisions.length ? <div className="grid gap-3">{detail.decisions.map((decision) => <article key={decision.id} className="rounded-md border border-wxBorder p-4"><div className="flex flex-wrap items-center justify-between gap-2"><AdminStatus status={decision.decision} /><time className="text-xs text-wxIndigo500">{new Date(decision.decided_at).toLocaleString("en-IN")}</time></div><p className="mt-3 text-sm font-bold">{decision.reason}</p><p className="mt-2 text-sm leading-6 text-wxIndigo500">{decision.notes}</p>{decision.evidence_reviewed?.length ? <p className="mt-2 text-xs text-wxIndigo500">Evidence: {decision.evidence_reviewed.join(", ")}</p> : null}</article>)}</div> : <AdminEmptyState title="No decision recorded" description="Complete the evidence review before recording a human decision." />}
      </AdminPanel>
    </div>
    <div className="mt-6"><AdminPanel title="Case audit"><AdminActivityTimeline events={detail.audit.map((event) => ({ id: event.id, title: event.action.replace(/_/g, " "), detail: "Verification operation", timestamp: event.createdAt }))} /></AdminPanel></div>
    <div className="mt-6"><HiringOperationsConsole view="verification" applicationReference={detail.applicationReference} verificationType={detail.type} /></div>
  </AdminShell>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><dt className="text-wxIndigo500">{label}</dt><dd className="text-right font-semibold capitalize">{value}</dd></div>;
}

function Check({ label, complete }: { label: string; complete: boolean }) {
  return <div className={`rounded-md border px-3 py-3 text-sm font-semibold ${complete ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>{complete ? "Complete" : "Action required"}: {label}</div>;
}
