"use client";

import { useState } from "react";
import { CalendarRange, CheckCircle2, LoaderCircle } from "lucide-react";
import { phoneCountryOptions } from "@/lib/tools/phone";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";

const areas = ["Academic editing", "Research guidance", "Dissertation support", "Formatting and referencing", "Originality review", "SOP/admissions support"];

export function TermPlanInterest() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.getAll("supportAreas").length === 0) {
      setStatus("error");
      setMessage("Select at least one main support area.");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/tools/term-plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        name: form.get("name"), phone: form.get("phone"), phoneCountry: form.get("phoneCountry"), country: form.get("country"), institution: form.get("institution"), expectedDeadlines: Number(form.get("expectedDeadlines")), termStart: form.get("termStart"), termEnd: form.get("termEnd"), supportAreas: form.getAll("supportAreas"), consent: form.get("consent") === "on", website: form.get("website")
      }) });
      const payload = await response.json();
      if (!response.ok || !payload.data?.accepted) throw new Error(payload.data?.message || payload.error?.message || "The request could not be submitted.");
      setStatus("success");
      trackQuoteEvent(quoteTrackingEvents.termPlanInterestSubmitted);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The request could not be submitted.");
    }
  }

  return <section className="bg-wxBg py-8 sm:py-10" aria-labelledby="term-plan-heading"><div className="premium-container"><div className="overflow-hidden rounded-xl border border-wxViolet700/15 bg-wxSurface shadow-soft"><div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-wxViolet700">Plan ahead</p><h2 id="term-plan-heading" className="mt-3 text-2xl font-semibold text-wxIndigo900 sm:text-3xl">Trimester Academic Support Plan</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-wxIndigo500">Plan multiple academic-support requirements for the term, receive priority coordination, and access bundle benefits.</p></div><button type="button" aria-expanded={open} onClick={() => { setOpen((value) => !value); trackQuoteEvent(quoteTrackingEvents.termPlanInterestStarted); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-wxViolet700 px-5 text-sm font-semibold text-wxViolet700"><CalendarRange className="h-5 w-5" /> Discuss a Term Support Plan</button></div>
    {open ? <div className="border-t border-wxBorder bg-wxSurfaceSoft/60 p-6 sm:p-8">{status === "success" ? <div className="text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-wxGreen500" /><h3 className="mt-3 text-xl font-semibold text-wxIndigo900">Interest received</h3><p className="mt-2 text-sm text-wxIndigo500">The term-planning team will review your dates and support areas before discussing options.</p></div> : <form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Name<input name="name" required autoComplete="name" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal" /></label><div className="grid grid-cols-[10rem_1fr] gap-2"><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Code<select name="phoneCountry" defaultValue="IN" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-2 font-normal">{phoneCountryOptions.map(([code,,dial]) => <option key={code} value={code}>{dial}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">WhatsApp<input name="phone" required inputMode="tel" autoComplete="tel" className="min-h-12 min-w-0 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal" /></label></div><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Country<input name="country" required autoComplete="country-name" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal" /></label><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Institution <span className="font-normal text-wxIndigo400">(optional)</span><input name="institution" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal" /></label><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Expected deadlines<input name="expectedDeadlines" type="number" min="1" max="50" required className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal" /></label><div className="grid grid-cols-2 gap-2"><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Term start<input name="termStart" type="date" min={new Date().toISOString().slice(0,10)} required className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-3 font-normal" /></label><label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Term end<input name="termEnd" type="date" min={new Date().toISOString().slice(0,10)} required className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-3 font-normal" /></label></div><fieldset className="md:col-span-2"><legend className="text-sm font-semibold text-wxIndigo700">Main support areas <span className="font-normal text-wxIndigo400">(select at least one)</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{areas.map((area) => <label key={area} className="flex min-h-11 items-center gap-2 rounded-lg border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo600"><input type="checkbox" name="supportAreas" value={area} /> {area}</label>)}</div></fieldset><label className="sr-only">Website<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="flex items-start gap-3 rounded-lg bg-wxSurface p-4 text-xs leading-5 text-wxIndigo500 md:col-span-2"><input name="consent" type="checkbox" required className="mt-1 accent-wxViolet700" /><span>I understand that WriteX provides learning-focused academic support and that I remain responsible for following my institution&apos;s academic integrity policies.</span></label>{status === "error" ? <p className="text-sm text-red-700 md:col-span-2" role="alert">{message}</p> : null}<button type="submit" disabled={status === "sending"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-spectrum px-5 font-semibold text-white md:col-span-2">{status === "sending" ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Submitting</> : "Discuss a Term Support Plan"}</button></form>}</div> : null}
  </div></div></section>;
}
