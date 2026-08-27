"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CalendarDays, FileText, MessageSquareText, Send, Trash2, UserRound } from "lucide-react";
import { RequestStatusPill, formatLocalDate, nextAction, sourceLabel } from "@/components/my-writex/RequestsExperience";
import type { MyWritexRequestView } from "@/lib/my-writex/request-types";

export function RequestDetailExperience({ initialRequest }: { initialRequest: MyWritexRequestView }) {
  const [request, setRequest] = useState(initialRequest);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function sendResponse(event: FormEvent) {
    event.preventDefault();
    if (busy || response.trim().length < 4) return;
    setBusy(true);
    const result = await mutate(`/api/my-writex/requests/${encodeURIComponent(request.publicReference)}/respond`, { response: response.trim() });
    if (result) { setRequest(result); setResponse(""); setMessage("Your response was added. Aman can continue reviewing it."); }
    else setMessage("Your response could not be added.");
    setBusy(false);
  }
  async function cancel() {
    if (busy || !window.confirm("Cancel this request? Its history will remain visible.")) return;
    setBusy(true);
    const result = await mutate(`/api/my-writex/requests/${encodeURIComponent(request.publicReference)}`, { operation: "cancel" }, "PATCH");
    if (result) { setRequest(result); setMessage("This request has been cancelled."); }
    setBusy(false);
  }
  const visibleNotes = request.notes.filter((note) => note.visibility === "customer");
  return <div className="mw-page-stack">
    <header><Link href="/my-writex/requests" className="mw-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--mw-primary)]"><ArrowLeft className="h-4 w-4" />Back to My Requests</Link><p className="mw-eyebrow mt-3">{request.publicReference} · {sourceLabel(request)}</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="mw-page-title">{request.fields.title}</h1><RequestStatusPill status={request.status} /></div><p className="mw-secondary mt-3 max-w-[760px]">{nextAction(request)}</p></header>
    {message ? <div role="status" className="rounded-[10px] border border-[#b8e2d0] bg-[#eaf6f0] p-4 text-sm font-medium text-[#116747]">{message}</div> : null}
    {request.status === "More Information Needed" ? <section className="mw-card mw-card-mobile-pad p-6"><div className="flex items-start gap-3"><MessageSquareText className="mt-0.5 h-5 w-5 text-[#8a4b08]" /><div><p className="mw-eyebrow">Waiting for you</p><h2 className="mw-section-title mt-1">Add the information Aman requested</h2></div></div>{visibleNotes.filter((note) => note.author === "Aman").slice(-1).map((note) => <blockquote key={note.id} className="mt-4 rounded-[10px] bg-[#fff3df] p-4 text-sm">“{note.body}”</blockquote>)}<form onSubmit={sendResponse} className="mt-5"><label className="block"><span className="text-sm font-medium">Your response</span><textarea required minLength={4} rows={4} value={response} onChange={(event) => setResponse(event.target.value)} className="mw-control mt-[7px] h-auto w-full py-3" /></label><button disabled={busy} className="mw-button-primary mt-4"><Send className="h-[18px] w-[18px]" />{busy ? "Sending…" : "Send Response"}</button></form></section> : null}
    <div className="mw-project-layout"><div className="grid gap-6"><section className="mw-card mw-card-mobile-pad p-6"><p className="mw-eyebrow">Overview</p><h2 className="mw-section-title mt-1">Requirement summary</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Item label="Service" value={request.fields.service} /><Item label="Category" value={request.fields.category} /><Item label="Scope" value={request.fields.scope} /><Item label="Deadline" value={`${request.fields.deadlineDate}${request.fields.deadlineTime ? ` at ${request.fields.deadlineTime}` : ""}`} /><Item label="Expected deliverable" value={request.fields.expectedDeliverable} /><Item label="Manager" value="Aman · My WriteX Manager" /><Item className="sm:col-span-2" label="Detailed brief" value={request.fields.detailedBrief} /></dl></section><section><p className="mw-eyebrow">Timeline</p><h2 className="mw-section-title mt-1">Request history</h2><div className="mw-list-surface mt-4 px-4">{[...request.history].reverse().map((entry) => <div key={entry.id} className="mw-timeline-row"><div><p className="mw-meta">{formatLocalDate(entry.at)}</p></div><div><h3 className="mw-object-title">{entry.title}</h3><p className="mw-secondary mt-1">{entry.detail}</p><p className="mw-meta mt-2">{entry.actor}</p></div></div>)}</div></section></div><aside className="grid content-start gap-4"><section className="mw-card mw-card-mobile-pad p-5"><CalendarDays className="h-5 w-5 text-[var(--mw-primary)]" /><p className="mw-meta mt-4">Next action</p><p className="mw-object-title mt-1">{nextAction(request)}</p></section><section className="mw-card mw-card-mobile-pad p-5"><UserRound className="h-5 w-5 text-[var(--mw-primary)]" /><p className="mw-meta mt-4">Assigned manager</p><p className="mw-object-title mt-1">Aman</p><p className="mw-secondary mt-1">My WriteX Manager</p><Link href="/my-writex/manager" className="mw-button-secondary mt-4 w-full">View Manager</Link></section><section className="mw-card mw-card-mobile-pad p-5"><FileText className="h-5 w-5 text-[var(--mw-primary)]" /><p className="mw-meta mt-4">Files</p><p className="mw-object-title mt-1">{request.files.length} locally stored</p>{request.files.map((file) => <p key={file.id} className="mw-meta mt-2 truncate">{file.name}</p>)}</section>{!["Cancelled", "Closed", "Accepted"].includes(request.status) ? <button type="button" disabled={busy} onClick={cancel} className="mw-button-secondary border-[#f0c7b6] text-[#934122]"><Trash2 className="h-[18px] w-[18px]" />Cancel Request</button> : null}</aside></div>
  </div>;
}

function Item({ label, value, className = "" }: { label: string; value: string; className?: string }) { return <div className={className}><dt className="mw-meta">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6">{value || "Not provided"}</dd></div>; }
async function mutate(url: string, body: object, method = "POST") { try { const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json() as { data?: { request: MyWritexRequestView } }; return response.ok ? result.data?.request || null : null; } catch { return null; } }
