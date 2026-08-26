import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminSectionHub } from "@/components/admin/AdminSectionHub";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageSmartHiring } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";

export const metadata: Metadata = {
  title: "Verification | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function VerificationPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireAdminSession();
  const { status } = await searchParams;
  const hiringVisible = canManageSmartHiring(session);
  const snapshot = hiringVisible ? await getHiringAdminSnapshot() : null;
  const cases = snapshot?.verificationCases || [];
  const count = (statuses: string[]) => cases.filter((item) => statuses.includes(item.status)).length;
  const queueHref = (value: string) =>
    hiringVisible ? `/admin/hiring/verification-centre?status=${value}` : "/admin/trust-centre";
  const requestedStatus = status?.replace(/_/g, " ");

  return (
    <AdminShell
      session={session}
      eyebrow="Verification"
      title="Verification workspace"
      description="Start with the decision state, then open the authorised evidence queue. Public and hiring verifications retain their existing controls."
      actions={<AdminButton href={queueHref("pending")} tone="primary">View Pending Verification</AdminButton>}
      nextAction={
        requestedStatus
          ? {
              label: `Review ${requestedStatus} cases`,
              reason: "The selected queue is ready below.",
              href: queueHref(status || "pending")
            }
          : undefined
      }
    >
      <AdminSectionHub
        tasks={[
          { title: "Pending", description: "Cases waiting for an authorised human decision.", href: queueHref("pending"), status: String(count(["pending", "submitted", "under_review"])) },
          { title: "Needs Information", description: "Cases paused until approved evidence or clarification is received.", href: queueHref("needs_information"), status: String(count(["needs_information", "needs_clarification"])) },
          { title: "Verified", description: "Cases completed or approved for the relevant workflow.", href: queueHref("approved_for_hiring"), status: String(count(["approved_for_hiring", "approved_with_conditions", "verified"])) },
          { title: "Rejected", description: "Cases closed after an authorised negative decision.", href: queueHref("rejected"), status: String(count(["rejected"])) }
        ]}
        advanced={[
          ...(hiringVisible ? [{ title: "Candidate Verification", description: "Hiring evidence and decisions", href: "/admin/hiring/verification-centre" }] : []),
          ...(session.role === "super_admin" ? [
            { title: "Invoice Verification", description: "Public invoice checks", href: "/admin/invoice-verification" },
            { title: "Payment Verification", description: "Public payment checks", href: "/admin/payment-verification" },
            { title: "Enquiry Verification", description: "Public enquiry checks", href: "/admin/enquiry-verification" },
            { title: "Trust Centre", description: "Representative and public trust controls", href: "/admin/trust-centre" },
            { title: "Suspicious Reports", description: "Trust and abuse reports", href: "/admin/suspicious-reports" }
          ] : [])
        ]}
      />
    </AdminShell>
  );
}
