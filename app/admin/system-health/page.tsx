import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminButton,
  AdminPanel,
  AdminStatus
} from "@/components/admin/AdminPrimitives";
import { IntegrationHealthTestButton } from "@/components/admin/IntegrationHealthTestButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/admin/session";
import { getProductionReadiness } from "@/lib/config/productionGuards";
import {
  getIntegrationHealth,
  integrationHealthLabels
} from "@/lib/integrations/health";

export const metadata: Metadata = {
  title: "System Health | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") notFound();
  const [systems, readiness] = await Promise.all([
    getIntegrationHealth(),
    Promise.resolve(getProductionReadiness())
  ]);
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="System health"
      description="Sanitised infrastructure and provider readiness. Credentials, bucket names, database URLs and raw external payloads are never rendered."
      actions={
        <>
          <AdminButton href="/admin/integration-logs">Integrations</AdminButton>
          <AdminButton href="/api/health" tone="primary">
            Public health
          </AdminButton>
        </>
      }
      nextAction={
        systems.some((system) =>
          ["configured_unreachable", "status_check_failed"].includes(
            system.status
          )
        )
          ? {
              label: "Review failed system",
              reason: "At least one required system check is failing.",
              href:
                systems.find((system) =>
                  ["configured_unreachable", "status_check_failed"].includes(
                    system.status
                  )
                )?.href || "/admin/system-health"
            }
          : undefined
      }
    >
      <AdminPanel
        title="Services and providers"
        description="Every card links to the operational destination for that system."
        action={<IntegrationHealthTestButton />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {systems.map((system) => (
            <a
              key={system.name}
              href={system.href}
              className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 transition hover:border-wxViolet700"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-wxIndigo900">{system.name}</h3>
                <AdminStatus status={integrationHealthLabels[system.status]} />
              </div>
              <p className="mt-3 text-sm leading-5 text-wxIndigo500">
                {system.detail}
              </p>
              {"messageIdStored" in system && system.messageIdStored ? (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  Latest test message ID stored privately
                </p>
              ) : null}
            </a>
          ))}
        </div>
      </AdminPanel>
      <div className="mt-6">
        <AdminPanel
          title="Production readiness"
          description="Application-level configuration checks only."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(readiness).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
              >
                <span className="text-sm font-medium text-wxIndigo700">
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
                </span>
                <AdminStatus
                  status={
                    value === true
                      ? "approved"
                      : value === false
                        ? "review_required"
                        : "unable_to_verify"
                  }
                />
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
