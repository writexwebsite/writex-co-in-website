"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, LockKeyhole } from "lucide-react";
import { phoneCountryOptions } from "@/lib/tools/phone";
import type { TemplateId, ToolType } from "@/lib/tools/config";
import { quoteTrackingEvents, trackQuoteEvent } from "@/lib/tracking";
import { getWhatsAppUrl } from "@/lib/site";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export type ToolDocument = {
  title: string;
  subtitle?: string;
  sections?: Array<{ heading: string; lines: string[] }>;
  templateId?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  toolType: ToolType;
  templateId?: TemplateId;
  document: ToolDocument;
  programmeOrRole?: string;
  deadline?: string;
  completionPercent: number;
  previewGenerated: boolean;
};

export function LeadDownloadGate(props: Props) {
  const { open, onClose } = props;
  const [status, setStatus] = useState<"idle" | "submitting" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);
  const whatsappMessage = props.toolType === "cv_builder"
    ? "Hi WriteX, I used the CV Builder and would like a human review."
    : props.toolType === "sop_builder"
      ? "Hi WriteX, I created an SOP framework and would like support refining it."
      : props.templateId === "dissertation-proposal-outline"
        ? "Hi WriteX, I downloaded the dissertation proposal template and need guidance with my requirement."
        : "Hi WriteX, I downloaded a planning template and would like relevant academic support guidance.";

  if (!open) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage("");
    trackQuoteEvent(quoteTrackingEvents.leadCaptureStarted, { tool_type: props.toolType });
    try {
      const response = await fetch("/api/tools/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anonymousSessionId: props.sessionId,
          toolType: props.toolType,
          templateId: props.templateId,
          name: form.get("name"),
          phone: form.get("phone"),
          phoneCountry: form.get("phoneCountry"),
          email: form.get("email"),
          country: form.get("country"),
          programmeOrRole: form.get("programmeOrRole") || props.programmeOrRole,
          deadline: form.get("deadline") || props.deadline,
          mainSupportNeed: form.get("mainSupportNeed"),
          completionPercent: props.completionPercent,
          previewGenerated: props.previewGenerated,
          completed: props.completionPercent === 100,
          consent: form.get("consent") === "on",
          website: form.get("website"),
          document: props.document
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.data?.accepted) throw new Error(payload.data?.message || payload.error?.message || "The download could not be prepared.");
      setDownloadUrl(payload.data.downloadUrl);
      setStatus("ready");
      trackQuoteEvent(quoteTrackingEvents.leadCaptureCompleted, { tool_type: props.toolType });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The download could not be prepared.");
      trackQuoteEvent(quoteTrackingEvents.leadCaptureFailed, { tool_type: props.toolType });
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-wxIndigo950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="download-gate-title">
      <div className="mx-auto my-6 w-full max-w-xl rounded-xl border border-wxViolet700/15 bg-wxSurface p-6 shadow-lift sm:p-8">
        {status === "ready" ? (
          <div className="text-center" aria-live="polite">
            <CheckCircle2 className="mx-auto h-11 w-11 text-wxGreen500" aria-hidden />
            <h2 id="download-gate-title" className="mt-4 text-2xl font-semibold text-wxIndigo900">Your file is ready</h2>
            <p className="mt-2 text-sm leading-6 text-wxIndigo500">Your contact details have been securely recorded so the relevant WriteX team can offer support if needed.</p>
            <a href={downloadUrl} onClick={() => trackQuoteEvent(quoteTrackingEvents.downloadCompleted, { tool_type: props.toolType })} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-spectrum px-5 font-semibold text-white shadow-spectrum">
              <Download className="h-5 w-5" aria-hidden /> Download file
            </a>
            <a href={getWhatsAppUrl(whatsappMessage)} target="_blank" rel="noreferrer" onClick={() => trackQuoteEvent(quoteTrackingEvents.whatsappUpsellClicked, { tool_type: props.toolType, template_id: props.templateId })} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-wxViolet700/25 bg-wxSurface px-5 font-semibold text-wxViolet700"><WhatsAppIcon className="h-5 w-5" /> Ask for a human review</a>
            <button type="button" onClick={props.onClose} className="mt-3 min-h-11 text-sm font-semibold text-wxViolet700">Return to preview</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-wxViolet700"><LockKeyhole className="h-4 w-4" aria-hidden /> Secure download</span>
                <h2 id="download-gate-title" className="mt-3 text-2xl font-semibold text-wxIndigo900">Unlock your download</h2>
                <p className="mt-2 text-sm leading-6 text-wxIndigo500">Enter your WhatsApp number to download your file and receive relevant support information.</p>
              </div>
              <button type="button" onClick={props.onClose} className="h-11 w-11 shrink-0 rounded-lg border border-wxBorder text-xl text-wxIndigo500" aria-label="Close download form">&times;</button>
            </div>
            <form className="mt-6 grid gap-4" onSubmit={submit}>
              <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Name<input ref={firstInputRef} name="name" required autoComplete="name" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700" /></label>
              <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Country code<select name="phoneCountry" defaultValue="IN" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-3 font-normal focus:border-wxViolet700">{phoneCountryOptions.map(([code, name, dial]) => <option key={code} value={code}>{name} {dial}</option>)}</select></label>
                <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">WhatsApp number<input name="phone" required inputMode="tel" autoComplete="tel" placeholder="81009 77068" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Email <span className="font-normal text-wxIndigo400">(optional)</span><input name="email" type="email" autoComplete="email" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700" /></label>
                <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Country <span className="font-normal text-wxIndigo400">(optional)</span><input name="country" autoComplete="country-name" className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700" /></label>
              </div>
              <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Course, programme, or target role <span className="font-normal text-wxIndigo400">(optional)</span><input name="programmeOrRole" defaultValue={props.programmeOrRole} className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700" /></label>
              <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">Deadline <span className="font-normal text-wxIndigo400">(optional)</span><input name="deadline" type="date" defaultValue={props.deadline} min={new Date().toISOString().slice(0, 10)} className="min-h-12 rounded-lg border border-wxBorder bg-wxSurface px-4 font-normal outline-none focus:border-wxViolet700" /></label>
              <label className="sr-only" aria-hidden>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              <label className="flex items-start gap-3 rounded-lg bg-wxSurfaceSoft p-4 text-xs leading-5 text-wxIndigo600"><input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-wxViolet700" /><span>I understand that WriteX provides learning-focused academic support and that I remain responsible for following my institution&apos;s academic integrity policies.</span></label>
              {status === "error" ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p> : null}
              <button type="submit" disabled={status === "submitting"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-spectrum px-5 font-semibold text-white shadow-spectrum disabled:opacity-60">{status === "submitting" ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Preparing download</> : <><Download className="h-5 w-5" /> Download file</>}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
