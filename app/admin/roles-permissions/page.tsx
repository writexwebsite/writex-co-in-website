import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPanel, AdminStatus } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Roles & Permissions | WriteX Admin",
  robots: { index: false, follow: false }
};

const roles = [
  {
    role: "Super Admin",
    trust: "Full",
    clients: "Full",
    hiring: "Full",
    system: "Full"
  },
  {
    role: "HR Admin",
    trust: "Restricted",
    clients: "Restricted",
    hiring: "Manage",
    system: "Audit only"
  },
  {
    role: "Hiring Manager",
    trust: "Restricted",
    clients: "Restricted",
    hiring: "Manage",
    system: "Audit only"
  },
  {
    role: "Assessor / Interviewer",
    trust: "Restricted",
    clients: "Restricted",
    hiring: "Assigned work",
    system: "Restricted"
  },
  {
    role: "Read-only Auditor",
    trust: "Restricted",
    clients: "Restricted",
    hiring: "Read only",
    system: "Audit only"
  }
];

export default async function RolesPermissionsPage() {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") notFound();
  return (
    <AdminShell
      session={session}
      eyebrow="System"
      title="Roles & permissions"
      description="A readable summary of effective Admin access. Permission enforcement remains in server-side guards and is not changed from this view."
    >
      <AdminPanel
        title="Effective access matrix"
        description="Restricted areas remain hidden and server-protected for unauthorised roles."
      >
        <div className="grid gap-3">
          {roles.map((item) => (
            <article
              key={item.role}
              className="grid gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 lg:grid-cols-[1.2fr_repeat(4,1fr)] lg:items-center"
            >
              <strong className="font-semibold text-wxIndigo900">
                {item.role}
              </strong>
              {[
                ["Trust", item.trust],
                ["Clients", item.clients],
                ["Hiring", item.hiring],
                ["System", item.system]
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-wxIndigo400">
                    {label}
                  </p>
                  <div className="mt-1">
                    <AdminStatus status={value} />
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
