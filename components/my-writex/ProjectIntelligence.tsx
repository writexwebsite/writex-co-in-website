"use client";

import { useState } from "react";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  MessageSquareWarning,
  Mic2,
  ShieldCheck,
} from "lucide-react";
import type { MyWritexProject } from "@/lib/my-writex/types";
import { formatDate } from "@/components/my-writex/MyWritexPrimitives";

export function ProjectIntelligence({ project, mode }: { project: MyWritexProject; mode: "invoice" | "customer" }) {
  const [understanding, setUnderstanding] = useState(false);
  const [viva, setViva] = useState(false);
  const delivered = ["delivered", "completed"].includes(project.status);
  const stages = project.timeline.slice(0, 6);

  return (
    <section id="quality" className="scroll-mt-24" aria-labelledby="quality-title">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><p className="mw-eyebrow">Quality journey</p><h2 id="quality-title" className="mw-section-title mt-1">Verified progress</h2><p className="mw-secondary mt-1">Only stages already reached by this project are shown.</p></div>
        <span className="mw-status-pill self-start bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]">{project.progressLabel}</span>
      </div>

      <div className="mw-card mw-card-mobile-pad p-6">
        {stages.length ? (
          <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stages.map((stage, index) => (
              <li key={stage.key} className="relative flex min-h-[52px] gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium ${stage.state === "current" ? "border-[var(--mw-primary)] bg-[var(--mw-primary)] text-white" : "border-[var(--mw-line-strong)] bg-white text-[var(--mw-green)]"}`}>{stage.state === "current" ? index + 1 : <Check className="h-3.5 w-3.5" strokeWidth={1.75} />}</span>
                <div><p className="text-sm font-medium leading-5">{stage.label}</p><p className="mw-meta mt-1">{stage.date ? formatDate(stage.date) : "Date unavailable"}</p></div>
              </li>
            ))}
          </ol>
        ) : <p className="mw-secondary">Verified progress will appear here as the project moves forward.</p>}
      </div>

      <div className="mw-list-surface mt-4">
        <details className="group border-b border-[var(--mw-line)]">
          <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]">
            <ShieldCheck className="h-5 w-5 text-[var(--mw-green)]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1"><span className="mw-object-title block">Quality summary</span><span className="mw-meta mt-0.5 block">{project.qualitySummary?.headline || (delivered ? "Delivery review completed" : "Available after verified review")}</span></span>
            <ChevronDown className="h-4 w-4 text-[var(--mw-tertiary)] transition-transform duration-200 group-open:rotate-180" strokeWidth={1.75} />
          </summary>
          <div className="border-t border-[var(--mw-line)] px-4 py-4">
            {project.qualitySummary ? <div className="divide-y divide-[var(--mw-line)]">{project.qualitySummary.checks.map((item) => <div key={item.label} className="flex gap-3 py-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mw-green)]" strokeWidth={1.75} /><div><p className="text-sm font-medium">{item.label}</p><p className="mw-meta mt-1">{item.detail}</p></div></div>)}<p className="mw-meta pt-3">Reviewed {formatDate(project.qualitySummary.reviewedAt)} · local fixture evidence</p></div> : <p className="mw-secondary">No speculative score or future check is shown. A plain-language summary appears only after verified review.</p>}
          </div>
        </details>

        <details className="group border-b border-[var(--mw-line)]">
          <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]"><BookOpenCheck className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">Understand My Work</span><span className="mw-meta mt-0.5 block">A guided explanation scoped to this project</span></span><ChevronDown className="h-4 w-4 text-[var(--mw-tertiary)] transition-transform duration-200 group-open:rotate-180" strokeWidth={1.75} /></summary>
          <div className="border-t border-[var(--mw-line)] px-4 py-4"><p className="mw-secondary">Prepare a structured overview for {project.title}. It never invents content or reaches another project.</p><button type="button" onClick={() => setUnderstanding(true)} className="mw-button-secondary mt-4">{understanding ? "Preview prepared locally" : "Prepare overview"}</button></div>
        </details>

        <details className="group">
          <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]"><Mic2 className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">Viva Prep</span><span className="mw-meta mt-0.5 block">Project-specific question practice</span></span><ChevronDown className="h-4 w-4 text-[var(--mw-tertiary)] transition-transform duration-200 group-open:rotate-180" strokeWidth={1.75} /></summary>
          <div className="border-t border-[var(--mw-line)] px-4 py-4"><p className="mw-secondary">Questions use only the context visible in this {mode === "invoice" ? "invoice workspace" : "Project Room"}.</p><button type="button" onClick={() => setViva(true)} className="mw-button-secondary mt-4">{viva ? "Question set prepared locally" : "Prepare questions"}</button></div>
        </details>
      </div>
    </section>
  );
}

export function ProjectRecovery({ projectTitle }: { projectTitle: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [prepared, setPrepared] = useState(false);
  const concerns = ["The brief feels misunderstood", "Quality is not what I expected", "I need an urgent clarification", "Something else"];

  return (
    <div className="mt-4 border-t border-[var(--mw-line)] pt-4">
      <button type="button" onClick={() => { setOpen((value) => !value); setPrepared(false); }} className="flex min-h-11 w-full items-center gap-3 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]" aria-expanded={open}><MessageSquareWarning className="h-5 w-5 text-[var(--mw-orange)]" strokeWidth={1.75} /><span>Something does not feel right</span><ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={1.75} /></button>
      {open ? <div className="mt-4">{prepared ? <div role="status" className="rounded-[12px] bg-[#eaf6f0] p-4 text-[#155f43]"><p className="text-sm font-semibold">Recovery request prepared locally.</p><p className="mw-meta mt-1 text-[#155f43]">{projectTitle} and your concern are ready to carry into support. Nothing was sent.</p></div> : <><p className="mw-meta">Choose the closest description.</p><div className="mt-3 grid gap-2">{concerns.map((concern) => <button key={concern} type="button" onClick={() => setSelected(concern)} className={`min-h-11 rounded-[8px] border px-3 text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)] ${selected === concern ? "border-[var(--mw-primary)] bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]" : "border-[var(--mw-line)] text-[var(--mw-muted)]"}`}>{concern}</button>)}</div><button type="button" disabled={!selected} onClick={() => setPrepared(true)} className="mw-button-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40">Continue</button></>}</div> : null}
    </div>
  );
}
