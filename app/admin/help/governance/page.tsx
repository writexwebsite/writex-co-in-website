import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTutorialGovernance } from "@/components/admin/AdminTutorialGovernance";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Tutorial Governance | WriteX Admin",
  robots: { index: false, follow: false }
};

export default async function AdminTutorialGovernancePage() {
  const session = await requireAdminSession();
  if (session.role !== "super_admin") redirect("/admin/help");
  return (
    <AdminShell
      session={session}
      eyebrow="Super Admin"
      title="Tutorial Governance"
      description="Manage optional help content, preserve protected safety guidance and review onboarding completion."
    >
      <AdminTutorialGovernance />
    </AdminShell>
  );
}
