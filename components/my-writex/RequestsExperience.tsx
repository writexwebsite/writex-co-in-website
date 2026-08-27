"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileQuestion, FolderKanban, Plus, RotateCcw } from "lucide-react";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";
import type { MyWritexRequestStatus, MyWritexRequestView } from "@/lib/my-writex/request-types";

type Tab = "Active" | "Waiting for Me" | "Resolved" | "All";
const tabs: Tab[] = ["Active", "Waiting for Me", "Resolved", "All"];

function belongs(tab: Tab, status: MyWritexRequestStatus) {
  if (tab === "All") return true;
  if (tab === "Waiting for Me") return status === "More Information Needed";
  if (tab === "Resolved") return ["Closed", "Cancelled"].includes(status);
  return !["More Information Needed", "Closed", "Cancelled"].includes(status);
}

export function RequestStatusPill({ status }: { status: MyWritexRequestStatus }) {
  const waiting = status === "More Information Needed";
  const resolved = ["Closed", "Cancelled"].includes(status);
  return <span className={`mw-status-pill ${waiting ? "bg-[#fff3df] text-[#8a4b08]" : resolved ? "bg-[var(--mw-soft)] text-[var(--mw-muted)]" : "bg-[#eee9fb] text-[var(--mw-primary)]"}`}>{status}</span>;
}

export function RequestsExperience({ initialRequests, mode = "customer" }: { initialRequests: MyWritexRequestView[]; mode?: "customer" | "invoice" }) {
  const [tab, setTab] = useState<Tab>("Active");
  const requests = useMemo(() => initialRequests.filter((request) => belongs(tab, request.status)), [initialRequests, tab]);
  const title = mode === "customer" ? "My Requests" : "Requests from this invoice";
  return <div className="mw-page-stack">
    <ProductPageHeader eyebrow={mode === "customer" ? "Request pipeline" : "Quick Project Workspace"} title={title} copy={mode === "customer" ? "Track every requirement from draft through discussion, with a clear next action." : "Only requests created from this authorised invoice workspace appear here."} action={<Link href={mode === "customer" ? "/my-writex/new-requirement" : "/client/request"} className="mw-button-primary"><Plus className="h-[18px] w-[18px]" />Start New Requirement</Link>} />
    <div className="mw-segmented-nav border-y border-[var(--mw-line)] py-1" role="tablist" aria-label="Request filters">{tabs.map((candidate) => <button key={candidate} type="button" role="tab" aria-selected={tab === candidate} onClick={() => setTab(candidate)} className={`min-h-11 whitespace-nowrap rounded-[8px] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)] ${tab === candidate ? "bg-[var(--mw-soft)] text-[var(--mw-primary)]" : "text-[var(--mw-muted)]"}`}>{candidate}</button>)}</div>
    {requests.length ? <div className="mw-list-surface px-4">{requests.map((request) => <article key={request.id} className="mw-project-list-row"><span className="mw-icon-tile"><FolderKanban className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="mw-object-title">{request.fields.title || "Untitled requirement"}</h2><RequestStatusPill status={request.status} /></div><p className="mw-meta mt-1">{request.publicReference} · {sourceLabel(request)} · Updated {formatLocalDate(request.updatedAt)}</p><p className="mw-secondary mt-2 line-clamp-2">{nextAction(request)}</p></div>{mode === "customer" ? <Link href={`/my-writex/requests/${encodeURIComponent(request.publicReference)}`} className="mw-button-secondary shrink-0">Open <ArrowRight className="h-[18px] w-[18px]" /></Link> : <span className="mw-meta shrink-0">Aman</span>}</article>)}</div> : <div className="mw-card mw-card-mobile-pad p-8 text-center"><FileQuestion className="mx-auto h-7 w-7 text-[var(--mw-primary)]" /><h2 className="mw-section-title mt-4">No {tab.toLowerCase()} requests</h2><p className="mw-secondary mt-2">The list will update as your local request moves forward.</p></div>}
    {mode === "invoice" ? <p className="mw-meta">This is an invoice-scoped view. It cannot access customer-wide requests, projects, plans or profile data.</p> : null}
  </div>;
}

export function requestNextActionIcon(status: MyWritexRequestStatus) { return status === "More Information Needed" ? FileQuestion : status === "Draft" ? RotateCcw : status === "Closed" ? CheckCircle2 : status === "Cancelled" ? Clock3 : CalendarDays; }

export function nextAction(request: MyWritexRequestView) {
  if (request.status === "Draft") return "Continue and send this draft when the brief is ready.";
  if (request.status === "More Information Needed") return "Aman needs a little more information from you.";
  if (request.status === "Ready for Discussion") return "Your requirement is ready to discuss with Aman.";
  if (["Closed", "Cancelled"].includes(request.status)) return "No further action is required.";
  return "Aman is reviewing the requirement and its supporting context.";
}

export function sourceLabel(request: MyWritexRequestView) {
  if (request.source === "similar_project") return "Similar work";
  if (request.source === "upcoming_work") return "Upcoming work";
  if (request.source === "invoice_workspace") return `Invoice ${request.sourceInvoiceReference}`;
  return "New requirement";
}

export function formatLocalDate(value: string) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
