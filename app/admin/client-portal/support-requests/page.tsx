import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProviderState } from "@/components/admin/AdminProviderState";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageClientPortal } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Client Support Requests | WriteX Admin",
  robots: { index: false, follow: false }
};

export default async function ClientSupportRequestsPage() {
  const session = await requireAdminSession();
  if (!canManageClientPortal(session)) notFound();
  return (
    <AdminShell
      session={session}
      eyebrow="Client Operations"
      title="Support requests"
      description="A focused destination for approved client clarification and support records."
    >
      <AdminProviderState
        title="Client support queue"
        status="awaiting_connection"
        description="No standalone support-request provider is active, so the Admin will not display invented tickets."
        requirements={[
          "Approved support-request source and ownership rules",
          "Safe client-session association",
          "Assignment, clarification and audit requirements",
          "Customer notification and closure workflow"
        ]}
        actions={[
          { label: "Open CRM follow-ups", href: "/admin/crm" },
          { label: "Open suspicious reports", href: "/admin/suspicious-reports" }
        ]}
      />
    </AdminShell>
  );
}
