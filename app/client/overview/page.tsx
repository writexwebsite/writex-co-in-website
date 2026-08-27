import type { Metadata } from "next";
import { InvoiceWorkspaceShell } from "@/components/my-writex/MyWritexShell";
import { ProjectDetail } from "@/components/my-writex/ProjectDetail";
import { requireInvoiceClientSession } from "@/lib/client/session";
import { getInvoiceWorkspaceProject } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "Quick Project Workspace | WriteX", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ClientOverviewPage() {
  const session = await requireInvoiceClientSession();
  const project = await getInvoiceWorkspaceProject(session);
  return <InvoiceWorkspaceShell invoiceReference={session.invoiceId} customerName={session.clientDisplayName}><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6d28d9]">Your project, in one place</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Quick Project Workspace</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#686372]">A focused view of this project only — progress, approved files, payment position and support.</p></div><ProjectDetail project={project} mode="invoice" /></InvoiceWorkspaceShell>;
}
