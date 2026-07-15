"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, FileSearch, FileUp, HelpCircle, MessageCircle, PenLine, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { trackAxoEvent } from "@/lib/axo/analytics";
import type { AxoServiceId } from "@/lib/axo/types";
import { AssignmentBriefWizard } from "./AssignmentBriefWizard";
import { AxoConsentControls } from "./AxoConsentControls";
import { AxoMascot } from "./AxoMascot";
import { ApprovedFaqSearch } from "./ApprovedFaqSearch";
import { ExistingOrderSupport, HumanHandoff } from "./SupportFlows";

type View = "home" | "brief" | "faq" | "order" | "revision" | "handoff";

const actions = [
  { id: "brief", label: "Start a New Requirement", note: "Build a clear academic support brief", icon: PenLine },
  { id: "brief", label: "Get a Quote", note: "Prepare details for manual scope review", icon: FileSearch },
  { id: "brief", label: "Upload Assignment Brief", note: "Add files inside the guided builder", icon: FileUp },
  { id: "faq", label: "Find the Right Service", note: "Use approved WriteX guidance", icon: Search },
  { id: "order", label: "Existing Order Support", note: "Continue safely without exposing order data", icon: RotateCcw },
  { id: "revision", label: "Request a Revision", note: "Prepare feedback and requested changes", icon: Sparkles },
  { id: "handoff", label: "Talk to the Team", note: "Use an existing WriteX contact channel", icon: MessageCircle }
] as const;

export function AxoConcierge({ open, onClose, onHide, initialService }: { open: boolean; onClose: () => void; onHide: () => void; initialService?: AxoServiceId }) {
  const [view, setView] = useState<View>("home");
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => { if (open) window.setTimeout(() => closeRef.current?.focus(), 40); }, [open]);
  const closePanel = () => { setView("home"); onClose(); };
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setView("home"); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = closeRef.current?.closest("[role='dialog']")?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
  const forget = () => { window.sessionStorage.removeItem("writex_axo_brief_v1"); window.localStorage.removeItem("writex_axo_brief_v1"); setView("home"); };

  return <AnimatePresence>{open ? <motion.section role="dialog" aria-modal="true" aria-labelledby="axo-title" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[min(86dvh,760px)] min-h-[440px] flex-col overflow-hidden overscroll-contain rounded-t-2xl border border-violet-200 bg-white shadow-[0_-24px_80px_rgba(49,46,129,0.25)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(760px,calc(100dvh-3rem))] sm:w-[440px] sm:rounded-2xl">
    <header className="flex items-center gap-3 border-b border-slate-200 bg-[linear-gradient(120deg,#faf7ff,#fff7f2)] px-4 py-3"><AxoMascot state={view === "home" ? "attentive" : "guiding"} compact /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">AI-powered support assistant</p><h2 id="axo-title" className="truncate text-base font-bold text-indigo-950">AXO Student Support</h2></div>{view !== "home" ? <button type="button" onClick={() => setView("home")} aria-label="Back to AXO menu" className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-white"><ArrowLeft className="h-5 w-5" /></button> : null}<button ref={closeRef} type="button" onClick={closePanel} aria-label="Close AXO support" className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><X className="h-5 w-5" /></button></header>
    {view === "home" ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"><div className="relative overflow-hidden rounded-xl border border-violet-200/70 bg-[linear-gradient(120deg,#f3ebfd_0%,#ffffff_52%,#fff0f6_100%)] p-4 pt-5 text-[#172260] shadow-[0_14px_34px_rgba(118,39,218,0.12)]"><span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-spectrum" /><div className="flex gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/80 text-[#5516f2] ring-1 ring-violet-200"><HelpCircle className="h-5 w-5" /></span><div><h2 className="font-semibold">How can I help?</h2><p className="mt-1 text-sm leading-5 text-[#4d5688]">I can organise your requirement, explain approved services, or prepare a human handoff. Final scope and pricing are reviewed by the WriteX team.</p></div></div></div><div className="mt-3 grid gap-2">{actions.map(({ id, label, note, icon: Icon }, index) => <button key={`${id}-${index}`} type="button" onClick={() => { const next = id as View; setView(next); if (next === "brief") trackAxoEvent("new_assignment_started", { source_page: window.location.pathname, deterministic_mode: true }); if (next === "order") trackAxoEvent("existing_order_support_started"); if (next === "revision") trackAxoEvent("revision_request_started"); }} className="group flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700"><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-semibold text-indigo-950">{label}</span><span className="block text-xs leading-4 text-slate-500">{note}</span></span></button>)}</div></div> : null}
    {view === "brief" ? <AssignmentBriefWizard initialService={initialService} onClose={closePanel} /> : null}
    {view === "faq" ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"><ApprovedFaqSearch /><button type="button" onClick={() => setView("handoff")} className="mt-4 min-h-11 w-full rounded-lg bg-indigo-950 px-4 text-sm font-semibold text-white">Ask the support team</button></div> : null}
    {view === "order" ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><ExistingOrderSupport onBack={() => setView("home")} /></div> : null}
    {view === "revision" ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><ExistingOrderSupport revision onBack={() => setView("home")} /></div> : null}
    {view === "handoff" ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><HumanHandoff onBack={() => setView("home")} /></div> : null}
    {view === "home" ? <AxoConsentControls onForget={forget} onHide={onHide} /> : null}
  </motion.section> : null}</AnimatePresence>;
}
