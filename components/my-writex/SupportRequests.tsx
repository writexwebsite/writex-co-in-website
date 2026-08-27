"use client";

import { useState } from "react";
import { ClipboardPenLine, Headphones, MessageCircle, PhoneCall, PlusCircle, RefreshCcw, X, type LucideIcon } from "lucide-react";
import type { MyWritexRequest } from "@/lib/my-writex/types";
import { formatDate } from "@/components/my-writex/MyWritexPrimitives";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";

const requestTypes: Array<{ title: MyWritexRequest["type"]; copy: string; icon: LucideIcon }> = [
  { title: "New Requirement", copy: "Start with the next piece of work you need.", icon: PlusCircle },
  { title: "Revision", copy: "Keep a requested change connected to a project.", icon: RefreshCcw },
  { title: "Support", copy: "Ask a question about current or delivered work.", icon: Headphones },
  { title: "Callback", copy: "Prepare a request to speak with your WriteX team.", icon: PhoneCall },
  { title: "General Query", copy: "Use this when your question is not project-specific.", icon: MessageCircle },
];

const statusStyles: Record<MyWritexRequest["status"], string> = {
  Submitted: "bg-[var(--mw-primary-soft)] text-[#5423b6]", Reviewing: "bg-[#e8f6fb] text-[#176278]", "In Progress": "bg-[var(--mw-primary-soft)] text-[#5423b6]", "Waiting for Customer": "bg-[#fff3dd] text-[#8a4f00]", Resolved: "bg-[#eaf6f0] text-[#116747]",
};

export function SupportRequests({ requests, managerName, initialType }: { requests: MyWritexRequest[]; managerName: string; initialType?: string }) {
  const [selected, setSelected] = useState<(typeof requestTypes)[number] | null>(() => { const typeMap: Record<string, MyWritexRequest["type"]> = { question: "Support", revision: "Revision", callback: "Callback" }; const type = initialType ? typeMap[initialType] : undefined; return requestTypes.find((request) => request.title === type) || null; });
  return (
    <div className="mw-page-stack max-w-[820px]">
      <ProductPageHeader eyebrow="My Requests" title="Support & Requests" copy="Choose the kind of help you need and keep the eventual request connected to the right context." />
      <section aria-labelledby="request-type-title"><h2 id="request-type-title" className="mw-section-title mb-4">Create a Request</h2><div className="mw-list-surface">{requestTypes.map((request) => { const Icon = request.icon; return <button key={request.title} type="button" onClick={() => setSelected(request)} className="mw-list-row w-full text-left outline-none hover:bg-[rgba(17,24,39,0.025)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]"><Icon className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">{request.title}</span><span className="mw-meta mt-1 block">{request.copy}</span></span></button>; })}</div></section>
      {selected ? <section className="mw-card mw-card-mobile-pad p-6"><div className="flex items-start justify-between gap-4"><div><p className="mw-eyebrow">Local Placeholder</p><h2 className="mw-section-title mt-2">{selected.title}</h2><p className="mw-secondary mt-2 max-w-[640px]">{selected.copy} Nothing has been sent to {managerName}, LTS, or a support system.</p><button className="mw-button-primary mt-5">Prepare Request</button></div><button type="button" onClick={() => setSelected(null)} aria-label="Close request placeholder" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-[var(--mw-line)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]"><X className="h-5 w-5" strokeWidth={1.75} /></button></div></section> : null}
      <section aria-labelledby="request-history-title"><h2 id="request-history-title" className="mw-section-title mb-4">Your Requests</h2><div className="mw-list-surface">{requests.map((request) => <article key={request.id} className="mw-list-row"><ClipboardPenLine className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><div className="min-w-0 flex-1"><p className="mw-object-title">{request.title}</p><p className="mw-meta mt-1">{request.type} · {formatDate(request.createdAt)}</p></div><span className={`mw-status-pill ${statusStyles[request.status]}`}>{request.status}</span></article>)}</div></section>
    </div>
  );
}
