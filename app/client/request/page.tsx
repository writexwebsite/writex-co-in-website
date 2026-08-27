import type { Metadata } from "next";
import { RequirementDraft } from "@/components/my-writex/RequirementDraft";
import { InvoiceWorkspaceShell } from "@/components/my-writex/MyWritexShell";
import { requireInvoiceClientSession } from "@/lib/client/session";
import { getInvoiceWorkspaceProject } from "@/lib/my-writex/data";
import { findActiveDraftForSource, requestOwnerFromSession, toRequestView } from "@/lib/my-writex/request-repository";

export const metadata: Metadata = { title: "Start Another Requirement | WriteX", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const session = await requireInvoiceClientSession();
  const project = await getInvoiceWorkspaceProject(session);
  const query = await searchParams;
  const similar = query.mode === "similar";
  const initialDraft = await findActiveDraftForSource(requestOwnerFromSession(session), "invoice_workspace", session.invoiceId);
  const sourceKey = initialDraft?.idempotencyKey || `stage3a:invoice_workspace:${session.invoiceId}:${crypto.randomUUID()}`;
  return <InvoiceWorkspaceShell invoiceReference={session.invoiceId} customerName={session.clientDisplayName}><RequirementDraft mode="invoice" apiEndpoint="/api/client/requests" source="invoice_workspace" sourceKey={sourceKey} sourceInvoiceReference={session.invoiceId} sourceLabel={similar ? project.title : undefined} initialFields={{ service: project.service, category: project.category, title: similar ? `New ${project.service}` : "", institution: "", course: "" }} initialDraft={initialDraft ? toRequestView(initialDraft) : null} /></InvoiceWorkspaceShell>;
}
