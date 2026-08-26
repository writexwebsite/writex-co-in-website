import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FestivalStudio } from "@/components/admin/FestivalStudio";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  canActivateWebsiteExperience,
  canManageWebsiteExperience,
  canViewWebsiteExperience
} from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getFestivalStudioSnapshot } from "@/lib/holiday/festival-studio-repository";

export const metadata: Metadata = {
  title: "Festival Studio | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

const sections = ["overview", "configure", "preview", "schedule", "history"] as const;
const tools = ["none", "import", "asset-library"] as const;

export default async function FestivalStudioPage({
  searchParams
}: {
  searchParams: Promise<{ section?: string; tool?: string; festival?: string }>;
}) {
  const session = await requireAdminSession();
  if (!canViewWebsiteExperience(session)) notFound();
  const params = await searchParams;
  const initialSection = sections.includes(params.section as (typeof sections)[number])
    ? (params.section as (typeof sections)[number])
    : "overview";
  const initialTool = tools.includes(params.tool as (typeof tools)[number])
    ? (params.tool as (typeof tools)[number])
    : "none";
  const canEdit = canManageWebsiteExperience(session);
  const snapshot = await getFestivalStudioSnapshot({
    canEdit,
    canActivate: canActivateWebsiteExperience(session),
    readOnly: !canEdit,
    adminUserId: session.adminUserId
  });

  return (
    <AdminShell
      session={session}
      eyebrow="Website Experience"
      title="Festival Studio"
      description="Choose one festival, assign every approved asset, preview the real pages and activate or schedule from one controlled workflow."
      actions={
        <>
          <AdminButton href="/" tone="secondary">Open Website</AdminButton>
          <AdminButton href="/admin/website-experience/festival-studio?section=configure" tone="primary">Configure Festival</AdminButton>
        </>
      }
    >
      <FestivalStudio
        initialSnapshot={snapshot}
        initialSection={initialSection}
        initialTool={initialTool}
        initialFestivalSlug={params.festival}
      />
    </AdminShell>
  );
}
