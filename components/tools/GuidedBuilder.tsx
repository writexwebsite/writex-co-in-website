"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Download, FileText, RotateCcw } from "lucide-react";
import { LeadDownloadGate, type ToolDocument } from "./LeadDownloadGate";
import type { ToolType } from "@/lib/tools/config";
import { createClientSessionId } from "@/lib/tools/clientSessionId";
import { trackQuoteEvent, type QuoteTrackingEvent } from "@/lib/tracking";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "date" | "textarea" | "select";
  options?: string[];
  required?: boolean;
};

type Step = { title: string; description: string; fields: Field[] };

type Props = {
  toolType: Exclude<ToolType, "template">;
  title: string;
  description: string;
  steps: Step[];
  initialValues: Record<string, string>;
  buildDocument: (values: Record<string, string>) => ToolDocument;
  startEvent: QuoteTrackingEvent;
  stepEvent: QuoteTrackingEvent;
  previewEvent: QuoteTrackingEvent;
  completedEvent: QuoteTrackingEvent;
  upsell: string;
};

function getSessionId(toolType: string) {
  const key = `writex:${toolType}:session`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const id = createClientSessionId();
  window.sessionStorage.setItem(key, id);
  return id;
}

export function GuidedBuilder(props: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(props.initialValues);
  const [sessionId] = useState(() => typeof window === "undefined" ? "" : getSessionId(props.toolType));
  const [gateOpen, setGateOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const storageKey = `writex:${props.toolType}:draft`;
  const finalStep = props.steps.length - 1;
  const progress = Math.round(((step + 1) / props.steps.length) * 100);
  const document = useMemo(() => props.buildDocument(values), [props, values]);

  useEffect(() => {
    trackQuoteEvent(props.startEvent, { tool_type: props.toolType });
    if (sessionId) void fetch("/api/tools/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anonymousSessionId: sessionId, toolType: props.toolType, completionPercent: 0 }) });
  }, [props.startEvent, props.toolType, sessionId]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return;
    const timer = window.setTimeout(() => {
      try { setValues({ ...props.initialValues, ...JSON.parse(saved) }); } catch { /* Ignore invalid session data. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [props.initialValues, storageKey]);

  useEffect(() => {
    if (sessionId) window.sessionStorage.setItem(storageKey, JSON.stringify(values));
  }, [sessionId, storageKey, values]);

  function update(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function validCurrentStep() {
    return props.steps[step].fields.every((field) => !field.required || values[field.name]?.trim());
  }

  async function goNext() {
    if (!validCurrentStep()) {
      headingRef.current?.focus();
      return;
    }
    const next = Math.min(finalStep, step + 1);
    const completion = Math.round((next / finalStep) * 100);
    setStep(next);
    headingRef.current?.focus();
    trackQuoteEvent(props.stepEvent, { tool_type: props.toolType, step: step + 1 });
    if (next === finalStep) trackQuoteEvent(props.previewEvent, { tool_type: props.toolType });
    await fetch("/api/tools/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anonymousSessionId: sessionId, toolType: props.toolType, completionPercent: completion, previewGenerated: next === finalStep, completed: next === finalStep, metadata: { lastStep: next } }) });
  }

  function reset() {
    setValues(props.initialValues);
    setStep(0);
    window.sessionStorage.removeItem(storageKey);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)]">
      <section className="rounded-xl border border-wxViolet700/12 bg-wxSurface p-5 shadow-soft sm:p-7" aria-labelledby="builder-step-title">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-wxViolet700">Step {step + 1} of {props.steps.length}</p><p className="mt-1 text-sm text-wxIndigo500">{progress}% complete</p></div>
          <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-wxBorder px-3 text-sm font-semibold text-wxIndigo600"><RotateCcw className="h-4 w-4" /> Reset</button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-wxSurfaceSoft" aria-hidden><div className="h-full rounded-full bg-brand-spectrum transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
        <h2 ref={headingRef} tabIndex={-1} id="builder-step-title" className="mt-6 text-2xl font-semibold text-wxIndigo900 outline-none">{props.steps[step].title}</h2>
        <p className="mt-2 text-sm leading-6 text-wxIndigo500">{props.steps[step].description}</p>

        {step < finalStep ? (
          <div className="mt-6 grid gap-4">
            {props.steps[step].fields.map((field) => (
              <label key={field.name} className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                {field.label}{field.required ? <span className="sr-only"> required</span> : null}
                {field.type === "textarea" ? (
                  <textarea value={values[field.name] || ""} onChange={(event) => update(field.name, event.target.value)} required={field.required} placeholder={field.placeholder} rows={4} className="rounded-lg border border-wxBorder bg-wxSurface px-4 py-3 font-normal leading-6 outline-none focus:border-wxViolet700" />
                ) : field.type === "select" ? (
                  <select value={values[field.name] || ""} onChange={(event) => update(field.name, event.target.value)} required={field.required} className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700"><option value="">Select an option</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                ) : (
                  <input type={field.type || "text"} value={values[field.name] || ""} onChange={(event) => update(field.name, event.target.value)} required={field.required} placeholder={field.placeholder} className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700" />
                )}
              </label>
            ))}
            {!validCurrentStep() ? <p className="text-xs text-wxOrange600" role="status">Complete the required fields before continuing.</p> : null}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-wxGreen500/25 bg-wxGreen500/5 p-5">
            <Check className="h-7 w-7 text-wxGreen500" aria-hidden />
            <h3 className="mt-3 text-lg font-semibold text-wxIndigo900">Preview ready</h3>
            <p className="mt-2 text-sm leading-6 text-wxIndigo500">Review the content alongside this panel. Your contact details are requested only when you choose to download.</p>
            <button type="button" onClick={() => { setGateOpen(true); trackQuoteEvent(props.completedEvent, { tool_type: props.toolType }); }} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-spectrum px-5 font-semibold text-white shadow-spectrum"><Download className="h-5 w-5" /> Download</button>
            <p className="mt-4 text-xs leading-5 text-wxIndigo500">{props.upsell}</p>
          </div>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" onClick={() => { setStep((value) => Math.max(0, value - 1)); headingRef.current?.focus(); }} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Back</button>
          {step < finalStep ? <button type="button" onClick={() => void goNext()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-wxViolet700 px-5 text-sm font-semibold text-white">Next <ArrowRight className="h-4 w-4" /></button> : null}
        </div>
      </section>

      <aside className="rounded-xl border border-wxViolet700/12 bg-wxSurfaceSoft/70 p-5 sm:p-7" aria-label="Live preview">
        <div className="flex items-center gap-3 border-b border-wxBorder pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-wxViolet700 text-white"><FileText className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-wxViolet700">Live preview</p><h2 className="font-semibold text-wxIndigo900">{document.title}</h2></div></div>
        {document.subtitle ? <p className="mt-4 text-sm leading-6 text-wxIndigo500">{document.subtitle}</p> : null}
        <div className="mt-5 grid gap-5">
          {document.sections?.map((section) => <section key={section.heading}><h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-wxIndigo800">{section.heading}</h3><ul className="mt-2 grid gap-1.5 text-sm leading-6 text-wxIndigo500">{section.lines.filter(Boolean).map((line, index) => <li key={`${section.heading}-${index}`} className="border-l-2 border-wxPink500/40 pl-3">{line}</li>)}</ul></section>)}
        </div>
      </aside>

      <LeadDownloadGate open={gateOpen} onClose={() => setGateOpen(false)} sessionId={sessionId} toolType={props.toolType} document={document} programmeOrRole={values.target || values.programme} deadline={values.deadline} completionPercent={100} previewGenerated />
    </div>
  );
}
