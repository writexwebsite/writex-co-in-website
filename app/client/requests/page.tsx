import type { Metadata } from "next";
import { RequestsExperience } from "@/components/my-writex/RequestsExperience";
import { InvoiceWorkspaceShell } from "@/components/my-writex/MyWritexShell";
import { requireInvoiceClientSession } from "@/lib/client/session";
import { listRequests, requestOwnerFromSession, toRequestView } from "@/lib/my-writex/request-repository";

export const metadata: Metadata = { title: "Invoice Requests | WriteX", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() { const session = await requireInvoiceClientSession(); return <InvoiceWorkspaceShell invoiceReference={session.invoiceId} customerName={session.clientDisplayName}><RequestsExperience initialRequests={(await listRequests(requestOwnerFromSession(session))).map(toRequestView)} mode="invoice" /></InvoiceWorkspaceShell>; }
