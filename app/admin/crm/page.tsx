import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCrmQueues } from "@/lib/admin/crm";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "CRM Queue | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | Date | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function Queue({
  title,
  leads
}: {
  title: string;
  leads: Awaited<ReturnType<typeof getCrmQueues>>["myLeads"];
}) {
  return (
    <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {leads.length ? (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}`}
              className="wx-row-hover block rounded-md bg-paleSage p-4 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{lead.name}</p>
                  <p className="mt-1 text-sm text-slateText">{lead.service_required}</p>
                </div>
                <span className="rounded-full bg-academicEmerald px-3 py-1 text-xs font-bold capitalize text-white">
                  {lead.status}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slateText">
                Owner: {lead.assigned_owner || "Unassigned"} | Priority: {lead.lead_priority} | Follow-up: {formatDate(lead.next_follow_up_at)}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-slateText">
            No leads in this queue. Relevant quote requests will appear here
            once they need action.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function AdminCrmPage() {
  const session = await requireAdminSession();
  const queues = await getCrmQueues(session.adminUserId);

  return (
    <AdminShell session={session} eyebrow="Sales operations" title="CRM follow-up queue">
      <div className="grid gap-6 lg:grid-cols-2">
        <Queue title="My leads" leads={queues.myLeads} />
        <Queue title="Unassigned leads" leads={queues.unassigned} />
        <Queue title="Due follow-ups" leads={queues.dueFollowUps} />
        <Queue title="Quoted not converted" leads={queues.quotedNotConverted} />
        <Queue title="High priority leads" leads={queues.highPriority} />
      </div>
    </AdminShell>
  );
}
