import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminButton,
  AdminMetricCard,
  AdminPanel,
  AdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageClientPortal } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getClientPortalOperationsSummary } from "@/lib/client/admin-operations";

export const metadata: Metadata = {
  title: "Client Sessions | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientSessionsPage() {
  const session = await requireAdminSession();
  if (!canManageClientPortal(session)) notFound();
  const summary = await getClientPortalOperationsSummary();
  return (
    <AdminShell
      session={session}
      eyebrow="Client Operations"
      title="Sessions and access"
      description="Monitor safe aggregate access activity. Search a specific approved invoice from Client Portal Operations before revoking a session."
      actions={
        <AdminButton href="/admin/client-portal" tone="primary">
          Search client access
        </AdminButton>
      }
      nextAction={
        summary.failedLogins24h
          ? {
              label: "Review failed sign-ins",
              reason: `${summary.failedLogins24h} failed attempt${summary.failedLogins24h === 1 ? "" : "s"} were recorded in the last 24 hours.`,
              href: "/admin/client-portal"
            }
          : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Active sessions" value={summary.activeSessions} />
        <AdminMetricCard
          label="Failed sign-ins (24h)"
          value={summary.failedLogins24h}
          priority={summary.failedLogins24h ? "action" : "normal"}
        />
        <AdminMetricCard
          label="Rate-limit events (24h)"
          value={summary.rateLimitEvents24h}
        />
        <AdminMetricCard
          label="Disabled clients"
          value={summary.disabledClients}
        />
      </div>
      <div className="mt-6">
        <AdminPanel
          title="Provider health"
          description="Provider state is sanitised; no invoice, mobile, session token or provider payload is displayed."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.providers.map((provider) => (
              <div
                key={provider.provider}
                className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
              >
                <div>
                  <p className="font-semibold text-wxIndigo900">
                    {provider.provider}
                  </p>
                  <p className="mt-1 text-xs text-wxIndigo500">
                    {provider.lastSuccessAt
                      ? `Last success ${new Date(provider.lastSuccessAt).toLocaleString("en-IN")}`
                      : "No successful check recorded"}
                  </p>
                </div>
                <AdminStatus status={provider.status || provider.mode} />
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
