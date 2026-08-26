import type { Metadata } from "next";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminSectionHub } from "@/components/admin/AdminSectionHub";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminMetrics } from "@/lib/admin/metrics";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "System | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const session = await requireAdminSession();
  const metrics = await getAdminMetrics({ includeStorageHealth: session.role === "super_admin" });
  const systemWarnings = [
    !metrics.system.databaseConfigured,
    session.role === "super_admin" && metrics.system.s3Health?.state !== "configured_healthy",
    session.role === "super_admin" && !metrics.system.emailConfigured
  ].filter(Boolean).length;
  const superAdmin = session.role === "super_admin";
  const festivalAdmin = ["super_admin", "website_experience_admin", "read_only_auditor"].includes(session.role);

  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="System workspace"
      description="Manage people, permissions, notifications and website status. Provider diagnostics and raw configuration remain under Advanced."
      actions={<AdminButton href="/admin/action-centre" tone="primary">View system alerts</AdminButton>}
      nextAction={
        systemWarnings
          ? {
              label: "Review system alerts",
              reason: `${systemWarnings} configuration or health warning${systemWarnings === 1 ? " is" : "s are"} visible to this role.`,
              href: "/admin/action-centre"
            }
          : undefined
      }
    >
      <AdminSectionHub
        tasks={[
          ...(superAdmin ? [
            { title: "Users", description: "Review Admin identities and access ownership.", href: "/admin/roles-permissions#users" },
            { title: "Roles", description: "Manage permission boundaries and role assignments.", href: "/admin/roles-permissions" },
            { title: "Notifications", description: "Review customer and operational email readiness.", href: "/admin/email", status: metrics.system.emailConfigured ? "Ready" : "Review" }
          ] : []),
          { title: "Website & Festival Status", description: "Open website health and the current Festival Studio status.", href: "#website-status", status: metrics.system.databaseConfigured ? "Online" : "Review" },
          { title: "Audit Activity", description: "Review recorded Admin and system actions.", href: "/admin/audit-logs" },
          { title: "Advanced Settings", description: "Open controlled Admin configuration.", href: "/admin/settings" }
        ]}
        advanced={[
          { title: "Integrations", description: "Provider callbacks and activity", href: "/admin/integration-logs" },
          ...(superAdmin ? [
            { title: "Storage", description: "Private file-provider health", href: "/admin/storage" },
            { title: "Sync Jobs", description: "Technical background work", href: "/admin/sync-jobs" },
            { title: "System Diagnostics", description: "Detailed health checks", href: "/admin/system-health" }
          ] : []),
          { title: "Help & Tutorials", description: "Admin guidance", href: "/admin/help" }
        ]}
      />
      <section id="website-status" className="mt-7 scroll-mt-28 rounded-md border border-wxBorder bg-wxSurface p-5">
        <h2 className="text-lg font-semibold text-wxIndigo900">Website and Festival status</h2>
        <p className="mt-1 text-sm text-wxIndigo500">Open the exact operational view without exposing raw environment values.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {superAdmin ? <AdminButton href="/admin/system-health">Website health</AdminButton> : null}
          {festivalAdmin ? <AdminButton href="/admin/website-experience/festival-studio?section=overview">Festival status</AdminButton> : null}
          {["super_admin", "website_experience_admin"].includes(session.role) ? <AdminButton href="/admin/website-experience/festival-studio?section=overview#restore-normal-website">Restore Normal Website</AdminButton> : null}
          {!superAdmin && !festivalAdmin ? <span className="text-sm text-wxIndigo500">Detailed status is restricted to authorised roles.</span> : null}
        </div>
      </section>
    </AdminShell>
  );
}
