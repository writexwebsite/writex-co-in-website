import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiGovernanceControlPlane } from "@/components/admin/AiGovernanceControlPlane";
import { AdminShell } from "@/components/admin/AdminShell";
import { canManageAiGovernance } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getAiGovernanceSnapshot } from "@/lib/ai-governance/repository";

export const metadata: Metadata = { title: "AI Usage & Budgets | WriteX Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AiGovernancePage() {
  const session = await requireAdminSession();
  if (!canManageAiGovernance(session)) notFound();
  const snapshot = await getAiGovernanceSnapshot({ refresh: true });
  return <AdminShell session={session} eyebrow="System Control" title="AI Usage & Budgets" description="Govern provider projects, product budgets, usage evidence and Academy administrator access from one audited master control plane."><AiGovernanceControlPlane initial={snapshot} /></AdminShell>;
}
