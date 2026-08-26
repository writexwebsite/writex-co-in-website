import type { Metadata } from "next";
import { AdminButton, AdminPanel } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Admin Settings | WriteX",
  robots: { index: false, follow: false }
};

export default async function AdminSettingsPage() {
  const session = await requireAdminSession();
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="Settings"
      description="Account, appearance, guidance and governance destinations. Secrets are never edited or displayed in the browser."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Account security"
          description="Manage the current administrator account through audited workflows."
        >
          <div className="flex flex-wrap gap-2">
            <AdminButton href="/admin/change-password" tone="primary">
              Change password
            </AdminButton>
            <AdminButton href="/admin/audit-logs">Open audit</AdminButton>
          </div>
        </AdminPanel>
        <AdminPanel
          title="Guidance and governance"
          description="Role help, process guides, tutorial content and onboarding remain integrated with the Admin shell."
        >
          <div className="flex flex-wrap gap-2">
            <AdminButton href="/admin/help" tone="primary">
              Help & Tutorials
            </AdminButton>
            {session.role === "super_admin" ? (
              <AdminButton href="/admin/help/governance">
                Tutorial governance
              </AdminButton>
            ) : null}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
