"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { trackAxoEvent } from "@/lib/axo/analytics";
import { getWhatsAppUrl, siteConfig } from "@/lib/site";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200";

export function ExistingOrderSupport({ revision = false, onBack }: { revision?: boolean; onBack: () => void }) {
  const [values, setValues] = useState({ orderId: "", email: "", type: revision ? "Revision request" : "Status request", message: "", deadline: "" });
  const summary = `${values.type}\nOrder ID: ${values.orderId}\nRegistered email: ${values.email}\n${values.deadline ? `Requested deadline: ${values.deadline}\n` : ""}Details: ${values.message}`;
  const ready = values.orderId.trim().length >= 3 && values.email.includes("@") && values.message.trim().length >= 10;
  return (
    <div className="p-4 sm:p-5">
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-violet-700"><ArrowLeft className="h-4 w-4" />Back</button>
      <h2 className="text-lg font-bold text-indigo-950">{revision ? "Prepare a revision request" : "Existing order support"}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">For your privacy, AXO does not display order details. Sign in to the client portal or prepare a secure support handoff.</p>
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium">Order ID<input value={values.orderId} onChange={(event) => setValues({ ...values, orderId: event.target.value })} className={inputClass} autoComplete="off" /></label>
        <label className="text-sm font-medium">Registered email<input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} className={inputClass} autoComplete="email" /></label>
        <label className="text-sm font-medium">Request type<select value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })} className={inputClass}>{["Status request", "Additional instructions", "Upload another file", "Clarify deadline", "Request callback", "Revision request", "Payment concern"].map((option) => <option key={option}>{option}</option>)}</select></label>
        {revision ? <label className="text-sm font-medium">Requested deadline<input type="date" value={values.deadline} onChange={(event) => setValues({ ...values, deadline: event.target.value })} className={inputClass} /></label> : null}
        <label className="text-sm font-medium">Details<textarea value={values.message} onChange={(event) => setValues({ ...values, message: event.target.value })} className={`${inputClass} py-3`} rows={4} placeholder={revision ? "Reason, instructor feedback, and requested changes" : "What would you like the support team to check?"} /></label>
      </div>
      {revision ? <p className="mt-3 rounded-lg bg-orange-50 p-3 text-xs leading-5 text-orange-900">The support team will review the request against the original instructions and revision policy.</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link href="/client-login" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-950 px-4 text-sm font-semibold text-white">Open client login</Link>
        <a href={ready ? getWhatsAppUrl(`Hi WriteX, I need existing order support.\n\n${summary}`) : undefined} aria-disabled={!ready} onClick={() => { if (ready) trackAxoEvent(revision ? "revision_request_started" : "existing_order_support_started", { reason_code: values.type.toLowerCase().replaceAll(" ", "_") }); }} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${ready ? "bg-emerald-600 text-white" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}><WhatsAppIcon className="h-4 w-4" />Prepare WhatsApp handoff</a>
      </div>
    </div>
  );
}

export function HumanHandoff({ onBack, summary = "" }: { onBack: () => void; summary?: string }) {
  return (
    <div className="p-4 sm:p-5">
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-violet-700"><ArrowLeft className="h-4 w-4" />Back</button>
      <h2 className="text-lg font-bold text-indigo-950">Talk to the WriteX team</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Choose an existing WriteX channel. AXO will not invent availability or a response time.</p>
      <div className="mt-5 space-y-2">
        <a href={getWhatsAppUrl(summary ? `Hi WriteX, I need support.\n\n${summary}` : undefined)} target="_blank" rel="noreferrer" onClick={() => trackAxoEvent("human_handoff_requested", { reason_code: "whatsapp" })} className="flex min-h-14 items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><WhatsAppIcon className="h-5 w-5" />WhatsApp Business</a>
        <a href={`mailto:${siteConfig.supportEmail}`} onClick={() => trackAxoEvent("human_handoff_requested", { reason_code: "email" })} className="flex min-h-14 items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm font-semibold text-violet-900"><Mail className="h-5 w-5" />{siteConfig.supportEmail}</a>
        <Link href="/contact" className="flex min-h-14 items-center rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-indigo-950">Open the contact form</Link>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">Support hours: {siteConfig.supportHours}</p>
    </div>
  );
}
