import type { Metadata } from "next";
import { InvoiceWorkspaceShell } from "@/components/my-writex/MyWritexShell";
import { ProjectDetail } from "@/components/my-writex/ProjectDetail";
import { requireInvoiceClientSession } from "@/lib/client/session";
import { getInvoiceWorkspaceProject } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "Project Detail | WriteX", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ClientProjectPage() {
  const session = await requireInvoiceClientSession();
  const project = await getInvoiceWorkspaceProject(session);
  return <InvoiceWorkspaceShell invoiceReference={session.invoiceId} customerName={session.clientDisplayName}><ProjectDetail project={project} mode="invoice" /></InvoiceWorkspaceShell>;
}
