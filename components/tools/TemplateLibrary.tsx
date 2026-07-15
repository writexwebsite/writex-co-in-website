"use client";

import Link from "next/link";
import { Download, Eye, FileSpreadsheet, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { templateDefinitions, type TemplateId } from "@/lib/tools/config";
import { createClientSessionId } from "@/lib/tools/clientSessionId";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { LeadDownloadGate, type ToolDocument } from "./LeadDownloadGate";

const previewLines: Record<TemplateId, string[]> = {
  "academic-cv": ["Profile and research interests", "Education and research projects", "Academic skills and achievements"],
  "graduate-cv": ["Targeted profile", "Education and experience evidence", "Skills aligned to the opportunity"],
  "sop-planning-worksheet": ["Programme fit", "Academic evidence", "Motivation and career direction"],
  "dissertation-proposal-outline": ["Research context and rationale", "Aim, objectives, literature context", "Methodology and feasibility"],
  "literature-review-matrix": ["Source and method", "Findings and limitations", "Themes, tensions, and research gap"]
};

export function TemplateLibrary() {
  const [preview, setPreview] = useState<TemplateId | null>(null);
  const [download, setDownload] = useState<TemplateId | null>(null);
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return "";
    const key = "writex:templates:session";
    const id = sessionStorage.getItem(key) || createClientSessionId();
    sessionStorage.setItem(key, id);
    return id;
  });
  useEffect(() => {
    if (sessionId) void fetch("/api/tools/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anonymousSessionId: sessionId, toolType: "template", completionPercent: 10 }) });
  }, [sessionId]);
  const selected = templateDefinitions.find((template) => template.id === download);
  const document: ToolDocument = selected ? { title: selected.name, subtitle: `${selected.description} ${selected.usage}`, templateId: selected.id } : { title: "WriteX Template" };
  return <>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{templateDefinitions.map((template) => {
      const open = preview === template.id;
      const Icon = template.id === "literature-review-matrix" ? FileSpreadsheet : FileText;
      return <article key={template.id} className="flex flex-col rounded-xl border border-wxViolet700/12 bg-wxSurface p-6 shadow-soft">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-wxSurfaceSoft text-wxViolet700"><Icon className="h-5 w-5" /></span>
        <h2 className="mt-4 text-xl font-semibold text-wxIndigo900">{template.name}</h2>
        <p className="mt-3 text-sm leading-6 text-wxIndigo500"><strong className="text-wxIndigo700">What it helps with:</strong> {template.description}</p>
        <p className="mt-3 text-sm leading-6 text-wxIndigo500"><strong className="text-wxIndigo700">How to use it:</strong> {template.usage}</p>
        <button type="button" aria-expanded={open} onClick={() => { setPreview(open ? null : template.id); trackQuoteEvent(quoteTrackingEvents.templatePreviewed, { template_id: template.id }); }} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700"><Eye className="h-4 w-4" /> {open ? "Hide preview" : "Preview"}</button>
        {open ? <div className="mt-4 rounded-lg bg-wxSurfaceSoft p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">Demonstration structure</p><ul className="mt-3 grid gap-2 text-sm text-wxIndigo500">{previewLines[template.id].map((line) => <li key={line} className="border-l-2 border-wxPink500/40 pl-3">{line}</li>)}</ul></div> : null}
        <div className="mt-auto pt-5"><button type="button" onClick={() => { setPreview(template.id); setDownload(template.id); trackQuoteEvent(quoteTrackingEvents.templateDownloadRequested, { template_id: template.id }); }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-wxViolet700 px-4 text-sm font-semibold text-white"><Download className="h-4 w-4" /> Download</button><Link href={template.serviceHref} className="mt-3 block text-center text-xs font-semibold text-wxViolet700 hover:underline">{template.service}</Link></div>
      </article>;
    })}</div>
    {selected ? <LeadDownloadGate open={Boolean(download)} onClose={() => setDownload(null)} sessionId={sessionId} toolType="template" templateId={selected.id} document={document} completionPercent={100} previewGenerated /> : null}
  </>;
}
