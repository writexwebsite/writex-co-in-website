import type { Metadata } from "next";
import { AdminHelpCentre } from "@/components/admin/AdminHelpCentre";
import { AdminShell } from "@/components/admin/AdminShell";
import { getGovernedHelpArticles } from "@/lib/admin/guidance-store";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Help & Tutorials | WriteX Admin",
  robots: { index: false, follow: false }
};

export default async function AdminHelpPage() {
  const session = await requireAdminSession();
  const articles = (await getGovernedHelpArticles()).filter(
    (article) =>
      article.active &&
      article.roles.includes(
        session.role as (typeof article.roles)[number]
      )
  );
  return (
    <AdminShell
      session={session}
      eyebrow="Admin learning"
      title="Help & Tutorials"
      description="Role-aware guidance, end-to-end process maps, sanitized demonstrations and a searchable operational glossary."
    >
      <AdminHelpCentre role={session.role} initialArticles={articles} />
    </AdminShell>
  );
}
