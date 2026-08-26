import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { DesignerHeroPackManager } from "@/components/admin/DesignerHeroPackManager";
import { canManageWebsiteExperience } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Add New Event Pack | WriteX Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DesignerHeroPacksPage() {
  const session = await requireAdminSession();
  if (!canManageWebsiteExperience(session)) notFound();
  return <AdminShell session={session} eyebrow="Advanced Festival Management" title="Add New Event Pack" description="Create future festival login variants from one clean 8K designer Hero without changing existing canonical packs."><DesignerHeroPackManager/></AdminShell>;
}
