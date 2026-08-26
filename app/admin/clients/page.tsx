import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminSectionHub } from "@/components/admin/AdminSectionHub";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageClientPortal } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getClientPortalOperationsSummary } from "@/lib/client/admin-operations";

export const metadata: Metadata = {
  title: "Clients | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await requireAdminSession();
  if (!canManageClientPortal(session)) notFound();
  const summary = await getClientPortalOperationsSummary();

  return (
    <AdminShell
      session={session}
      eyebrow="Clients"
      title="Client workspace"
      description="Find a client first, then open requests, documents, communication or access history without moving through technical portal controls."
      actions={<AdminButton href="/admin/client-portal" tone="primary">Find Client</AdminButton>}
      nextAction={
        summary.failedLogins24h
          ? {
              label: "Review client access history",
              reason: `${summary.failedLogins24h} failed sign-in attempt${summary.failedLogins24h === 1 ? "" : "s"} require attention.`,
              href: "/admin/client-portal/sessions"
            }
          : undefined
      }
    >
      <AdminSectionHub
        tasks={[
          { title: "Search & Profile", description: "Find approved client access by invoice reference and open the profile.", href: "/admin/client-portal", status: summary.databaseReady ? "Ready" : "Unavailable" },
          { title: "Requests", description: "Open the client support and clarification destination.", href: "/admin/client-portal/support-requests", status: "Provider pending" },
          { title: "Documents", description: "Find private deliverables and approved file references.", href: "/admin/client-portal/files" },
          { title: "Communication", description: "Open recorded CRM follow-ups and client communication.", href: "/admin/crm" },
          { title: "History", description: "Review access sessions and recent client portal activity.", href: "/admin/client-portal/sessions", status: `${summary.activeSessions} active` }
        ]}
        advanced={[
          { title: "Temporary Testing", description: "Controlled test access", href: "/admin/client-portal/temporary-testing" }
        ]}
      />
    </AdminShell>
  );
}
