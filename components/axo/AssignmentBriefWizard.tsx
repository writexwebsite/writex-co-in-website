"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { AXO_ACADEMIC_LEVELS, AXO_REFERENCING_STYLES, AXO_TIMEZONES, getAxoService } from "@/lib/axo/config";
import { trackAxoEvent } from "@/lib/axo/analytics";
import { axoContactSchema, buildRequirementSummary } from "@/lib/axo/rules";
import type { AxoBrief, AxoServiceId } from "@/lib/axo/types";
import { getWhatsAppUrl } from "@/lib/site";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { RequirementSummary } from "./RequirementSummary";
import { ServiceSelector } from "./ServiceSelector";
import { FileUploader } from "./FileUploader";

const SESSION_KEY = "writex_axo_brief_v1";
const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200";

function Field({ label, name, value, onChange, type = "text", placeholder, required = false }: { label: string; name: keyof AxoBrief; value?: string; onChange: (name: keyof AxoBrief, value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{required ? <span className="ml-1 text-orange-600">*</span> : null}<input name={`axo-${name}`} type={type} value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} required={required} className={inputClass} /></label>;
}

function SelectField({ label, name, value, onChange, options, required = false }: { label: string; name: keyof AxoBrief; value?: string; onChange: (name: keyof AxoBrief, value: string) => void; options: string[]; required?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{required ? <span className="ml-1 text-orange-600">*</span> : null}<select name={`axo-${name}`} value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} required={required} className={inputClass}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function DetailsFields({ brief, update }: { brief: AxoBrief; update: (name: keyof AxoBrief, value: string) => void }) {
  if (brief.serviceId === "dissertation") return <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Degree level" name="degreeLevel" value={brief.degreeLevel} onChange={update} options={AXO_ACADEMIC_LEVELS} required /><Field label="Topic or working title" name="title" value={brief.title} onChange={update} required /><Field label="Chapter requirement" name="chapterRequirement" value={brief.chapterRequirement} onChange={update} placeholder="Proposal, literature review, methodology..." /><Field label="Word count" name="wordCount" value={brief.wordCount} onChange={update} type="number" /><Field label="Methodology" name="methodology" value={brief.methodology} onChange={update} placeholder="Qualitative, quantitative, mixed..." /><Field label="Proposal status" name="proposalStatus" value={brief.proposalStatus} onChange={update} /><Field label="Supervisor feedback" name="supervisorFeedback" value={brief.supervisorFeedback} onChange={update} /><Field label="Data availability" name="dataAvailability" value={brief.dataAvailability} onChange={update} /></div>;
  if (brief.serviceId === "sop") return <div className="grid gap-3 sm:grid-cols-2"><Field label="Purpose" name="sopPurpose" value={brief.sopPurpose} onChange={update} placeholder="Admission, visa, scholarship..." required /><Field label="Target university / programme" name="targetProgramme" value={brief.targetProgramme} onChange={update} required /><Field label="Target country" name="countrySystem" value={brief.countrySystem} onChange={update} /><Field label="Academic background" name="academicBackground" value={brief.academicBackground} onChange={update} /><Field label="Work experience" name="workExperience" value={brief.workExperience} onChange={update} /><Field label="Career objective" name="careerObjective" value={brief.careerObjective} onChange={update} /><SelectField label="Draft availability" name="draftAvailability" value={brief.draftAvailability} onChange={update} options={["Complete draft", "Partial draft", "Profile notes only", "No draft yet"]} /></div>;
  if (["editing", "formatting", "originality"].includes(brief.serviceId ?? "")) return <div className="grid gap-3 sm:grid-cols-2"><Field label="Document type" name="documentType" value={brief.documentType} onChange={update} required /><SelectField label="Academic level" name="academicLevel" value={brief.academicLevel} onChange={update} options={AXO_ACADEMIC_LEVELS} /><Field label="Word count" name="wordCount" value={brief.wordCount} onChange={update} type="number" required /><SelectField label="Review depth" name="editingLevel" value={brief.editingLevel} onChange={update} options={["Essential proofread", "Clarity and academic tone", "Structure and language review", "Not sure"]} /><SelectField label="Referencing style" name="referencingStyle" value={brief.referencingStyle} onChange={update} options={AXO_REFERENCING_STYLES} /></div>;
  return <div className="grid gap-3 sm:grid-cols-2"><Field label="Subject or module" name="subject" value={brief.subject} onChange={update} required /><Field label="Brief title or topic" name="title" value={brief.title} onChange={update} required /><SelectField label="Academic level" name="academicLevel" value={brief.academicLevel} onChange={update} options={AXO_ACADEMIC_LEVELS} required /><Field label="Country / university system" name="countrySystem" value={brief.countrySystem} onChange={update} /><Field label="Word count" name="wordCount" value={brief.wordCount} onChange={update} type="number" required /><SelectField label="Referencing style" name="referencingStyle" value={brief.referencingStyle} onChange={update} options={AXO_REFERENCING_STYLES} /><Field label="Required sources" name="requiredSources" value={brief.requiredSources} onChange={update} placeholder="Number or type, if specified" /></div>;
}

export function AssignmentBriefWizard({ initialService, onClose }: { initialService?: AxoServiceId; onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<AxoBrief>(() => {
    const base: AxoBrief = { serviceId: initialService, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, files: [] };
    if (typeof window === "undefined") return base;
    const stored = window.sessionStorage.getItem(SESSION_KEY) || window.localStorage.getItem(SESSION_KEY);
    if (!stored) return base;
    try { return { ...base, ...JSON.parse(stored), files: [] }; } catch { return base; }
  });
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const progress = (step + 1) * 25;
  const service = getAxoService(brief.serviceId);

  useEffect(() => { if (window.sessionStorage.getItem(SESSION_KEY) || window.localStorage.getItem(SESSION_KEY)) trackAxoEvent("session_resumed", { source_page: window.location.pathname, deterministic_mode: true }); }, []);
  useEffect(() => {
    const safeBrief = { ...brief, files: brief.files?.map(({ name, size, type, assetId }) => ({ name, size, type, assetId })) };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeBrief));
    if (remember) window.localStorage.setItem(SESSION_KEY, JSON.stringify(safeBrief));
  }, [brief, remember]);

  const update = (name: keyof AxoBrief, value: string | boolean) => setBrief((current) => ({ ...current, [name]: value }));
  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(brief.serviceId);
    if (step === 1) return Boolean((brief.title || brief.documentType || brief.sopPurpose) && (brief.wordCount || brief.serviceId === "sop"));
    if (step === 2) return Boolean(brief.deadline && brief.timezone && (brief.instructions?.trim().length ?? 0) >= 10);
    return axoContactSchema.safeParse(brief).success;
  }, [brief, step]);

  const next = () => { if (!canContinue) { setError("Complete the required details before continuing."); return; } setError(""); trackAxoEvent("brief_step_completed", { service_id: brief.serviceId, step_id: String(step + 1), completion_percent: progress, deterministic_mode: true }); setStep((value) => Math.min(3, value + 1)); };
  const submit = async () => {
    const contact = axoContactSchema.safeParse(brief);
    if (!contact.success) { setError(contact.error.issues[0]?.message ?? "Check your contact details."); return; }
    setStatus("submitting"); setError("");
    const summary = buildRequirementSummary(brief);
    trackAxoEvent("enquiry_reviewed", { service_id: brief.serviceId, has_files: Boolean(brief.files?.length), file_count: brief.files?.length ?? 0, deterministic_mode: true });
    try {
      const uploadedFile = brief.files?.find((file) => file.assetId);
      const response = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: brief.name, email: brief.email, whatsapp: brief.whatsapp || brief.email, country: brief.countrySystem, service: service?.label, level: brief.academicLevel || brief.degreeLevel, subject: brief.subject || brief.targetProgramme, wordCount: brief.wordCount, deadline: brief.deadline, instructions: summary, consent: true, uploadedFileAssetId: uploadedFile?.assetId, fileName: uploadedFile?.name, fileSize: uploadedFile?.size, fileType: uploadedFile?.type, source: "axo_student_companion", page_path: window.location.pathname, device_type: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop" }) });
      if (!response.ok) throw new Error("submission_failed");
      setStatus("success"); window.sessionStorage.removeItem(SESSION_KEY); if (remember) window.localStorage.removeItem(SESSION_KEY);
      trackAxoEvent("enquiry_submitted", { service_id: brief.serviceId, has_files: Boolean(brief.files?.length), file_count: brief.files?.length ?? 0, deterministic_mode: true });
    } catch { setStatus("error"); setError("The secure form could not be submitted. Your details are still here; use the WhatsApp handoff below."); }
  };

  if (status === "success") return <div className="p-5 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><h2 className="mt-3 text-lg font-bold text-indigo-950">Your requirement has been received</h2><p className="mt-2 text-sm leading-6 text-slate-600">The WriteX team will review the scope, files, price, and delivery feasibility before confirming the next step.</p><button type="button" onClick={onClose} className="mt-5 min-h-11 rounded-lg bg-indigo-950 px-5 text-sm font-semibold text-white">Close</button></div>;

  return <div className="flex min-h-0 flex-1 flex-col"><div className="border-b border-slate-200 px-4 py-3"><div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Brief builder · Step {step + 1} of 4</span><span>{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      {step === 0 ? <><h2 className="text-lg font-bold text-indigo-950">What support do you need?</h2><p className="mb-4 mt-1 text-sm text-slate-600">Choose the closest service. The team will confirm the final scope.</p><ServiceSelector value={brief.serviceId} onChange={(serviceId) => { setBrief((current) => ({ ...current, serviceId })); trackAxoEvent("service_selected", { service_id: serviceId, source_page: window.location.pathname, deterministic_mode: true }); }} /></> : null}
      {step === 1 ? <><h2 className="text-lg font-bold text-indigo-950">Tell me about the requirement</h2><p className="mb-4 mt-1 text-sm text-slate-600">I will only ask what is relevant to {service?.label ?? "this service"}.</p><DetailsFields brief={brief} update={update} /></> : null}
      {step === 2 ? <><h2 className="text-lg font-bold text-indigo-950">Deadline, files, and instructions</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Deadline" name="deadline" value={brief.deadline} onChange={update} type="date" required /><Field label="Time" name="deadlineTime" value={brief.deadlineTime} onChange={update} type="time" /><SelectField label="Deadline timezone" name="timezone" value={brief.timezone} onChange={update} options={AXO_TIMEZONES} required /></div><label className="mt-3 block text-sm font-medium text-slate-700">Additional instructions <span className="text-orange-600">*</span><textarea name="axo-instructions" value={brief.instructions ?? ""} onChange={(event) => update("instructions", event.target.value)} rows={4} className={`${inputClass} py-3`} placeholder="Paste the brief, marking criteria, supervisor comments, or anything the team should check." /></label><FileUploader serviceId={brief.serviceId} files={brief.files ?? []} onUploaded={(file) => setBrief((current) => ({ ...current, files: [...(current.files ?? []), file] }))} /></> : null}
      {step === 3 ? <><h2 className="text-lg font-bold text-indigo-950">Review and choose contact</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Name" name="name" value={brief.name} onChange={update} required /><Field label="Email" name="email" value={brief.email} onChange={update} type="email" /><Field label="Phone / WhatsApp" name="whatsapp" value={brief.whatsapp} onChange={update} type="tel" /><SelectField label="Preferred contact" name="preferredContact" value={brief.preferredContact} onChange={update} options={["email", "whatsapp", "phone"]} required /></div><label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={brief.consent ?? false} onChange={(event) => update("consent", event.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" />I consent to WriteX reviewing these details to respond to my enquiry. I understand AXO is an AI-powered support assistant and final scope, price, and feasibility require human review.</label><label className="mt-2 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-violet-600" />Remember this incomplete brief on this device</label><div className="mt-4"><RequirementSummary brief={brief} /></div><p className="mt-3 rounded-lg bg-orange-50 p-3 text-xs leading-5 text-orange-900">Your requirement is ready for manual review. The WriteX team will confirm the price and delivery feasibility.</p></> : null}
      {error ? <p role="alert" className="mt-3 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
      {status === "error" ? <a href={getWhatsAppUrl(`Hi WriteX, I prepared this requirement with AXO:\n\n${buildRequirementSummary(brief)}`)} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"><WhatsAppIcon className="h-4 w-4" />Send summary on WhatsApp</a> : null}
    </div>
    <div className="flex gap-2 border-t border-slate-200 bg-white p-3"><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || status === "submitting"} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />Back</button>{step < 3 ? <button type="button" onClick={next} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-lg bg-indigo-950 px-5 text-sm font-semibold text-white">Continue<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={submit} disabled={status === "submitting"} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-sm font-semibold text-white disabled:opacity-60">{status === "submitting" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{status === "submitting" ? "Sending..." : "Confirm and request review"}</button>}</div>
  </div>;
}
