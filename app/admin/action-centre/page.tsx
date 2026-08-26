import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminActionCard,
  AdminEmptyState,
  AdminPanel
} from "@/components/admin/AdminPrimitives";
import { getAdminCommandCentre } from "@/lib/admin/command-centre";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Action Centre | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminActionCentrePage() {
  const session = await requireAdminSession();
  const command = await getAdminCommandCentre(session);
  const queues = [
    ...command.critical,
    ...command.actionRequired,
    ...command.pending
  ].filter((item) => Number(item.value) > 0 || item.value === "Review");

  return (
    <AdminShell
      session={session}
      eyebrow="Overview"
      title="Action Centre"
      description="Prioritised operational queues for this administrator. Sensitive actions remain inside the destination workflow and retain their existing permission checks."
      nextAction={
        queues[0]
          ? {
              label: queues[0].actionLabel,
              reason: queues[0].description,
              href: queues[0].href
            }
          : undefined
      }
    >
      <AdminPanel
        title="Prioritised queues"
        description="Critical failures appear first, followed by human approvals and pending operational work."
      >
        {queues.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {queues.map((item, index) => (
              <AdminActionCard key={`${item.title}-${index}`} {...item} />
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No elevated action"
            description="There is no non-zero operational queue visible to this role right now."
          />
        )}
      </AdminPanel>
    </AdminShell>
  );
}
