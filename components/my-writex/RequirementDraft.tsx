"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, Save, Send, Trash2, UploadCloud } from "lucide-react";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";
import {
  emptyRequirementFields,
  type MyWritexRequestFile,
  type MyWritexRequestView,
  type MyWritexRequestSource,
  type MyWritexRequirementFields,
} from "@/lib/my-writex/request-types";
import { MY_WRITEX_ALLOWED_FILE_TYPES, MY_WRITEX_MAX_FILE_BYTES, MY_WRITEX_MAX_FILES, normalizeRequirementTitle, safeRequestFileName, validateRequestStep } from "@/lib/my-writex/request-validation";

type MyWritexRequestRecord = MyWritexRequestView;

type Props = {
  mode: "customer" | "invoice";
  apiEndpoint: "/api/my-writex/requests" | "/api/client/requests";
  source: MyWritexRequestSource;
  sourceKey: string;
  sourceLabel?: string;
  sourceProjectId?: string;
  sourceUpcomingId?: string;
  sourceInvoiceReference?: string;
  initialFields?: Partial<MyWritexRequirementFields>;
  initialDraft?: MyWritexRequestView | null;
};

const steps = ["What you need", "Scope & deadline", "Brief & files", "Review"];
const serviceOptions = ["Assignment Support", "Dissertation Support", "Research Proposal Support", "Presentation Support", "Academic Editing", "Career Support"];
const categoryOptions = ["Essay", "Report", "Dissertation", "Presentation", "Proposal", "Editing", "Career document", "Other"];

export function RequirementDraft(props: Props) {
  const restored = props.initialDraft;
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<MyWritexRequirementFields>({ ...emptyRequirementFields(), ...props.initialFields, ...restored?.fields });
  const [files, setFiles] = useState<MyWritexRequestFile[]>(restored?.files || []);
  const [requestId, setRequestId] = useState(restored?.id);
  const [draftReference, setDraftReference] = useState(restored?.publicReference);
  const [saveState, setSaveState] = useState(restored ? "Draft restored" : "Not saved yet");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<MyWritexRequestView | null>(null);
  const [fileError, setFileError] = useState("");
  const touched = useRef(Boolean(restored));
  const saveVersion = useRef(0);

  const payload = useMemo(() => ({
    requestId,
    idempotencyKey: props.sourceKey,
    source: props.source,
    sourceProjectId: props.sourceProjectId,
    sourceProjectTitle: props.sourceLabel,
    sourceUpcomingId: props.sourceUpcomingId,
    sourceUpcomingTitle: props.sourceLabel,
    sourceInvoiceReference: props.sourceInvoiceReference,
    fields,
    files,
  }), [fields, files, props.source, props.sourceKey, props.sourceProjectId, props.sourceUpcomingId, props.sourceInvoiceReference, props.sourceLabel, requestId]);

  useEffect(() => {
    if (!touched.current || success) return;
    const version = ++saveVersion.current;
    setSaveState("Saving…");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(props.apiEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, operation: "save_draft" }) });
        const result = await response.json() as { ok: boolean; data?: { request: MyWritexRequestView }; error?: { message: string } };
        if (!response.ok || !result.data?.request) throw new Error(result.error?.message || "Draft could not be saved.");
        if (version !== saveVersion.current) return;
        setRequestId(result.data.request.id);
        setDraftReference(result.data.request.publicReference);
        setSaveState("Saved locally");
      } catch (error) {
        if (version === saveVersion.current) setSaveState(error instanceof Error ? error.message : "Draft not saved");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [payload, props.apiEndpoint, success]);

  function update<K extends keyof MyWritexRequirementFields>(key: K, value: MyWritexRequirementFields[K]) {
    touched.current = true;
    setErrors([]);
    setFields((current) => ({ ...current, [key]: value }));
  }

  function next(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateRequestStep(step, fields);
    setErrors(nextErrors);
    if (!nextErrors.length) setStep((current) => Math.min(4, current + 1));
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>, purpose: "brief" | "supporting") {
    const selected = Array.from(event.target.files || []);
    setFileError("");
    if (files.length + selected.length > MY_WRITEX_MAX_FILES) {
      setFileError(`You can add up to ${MY_WRITEX_MAX_FILES} files.`);
      event.target.value = "";
      return;
    }
    const next: MyWritexRequestFile[] = [];
    for (const file of selected) {
      if (!MY_WRITEX_ALLOWED_FILE_TYPES.has(file.type) || file.size <= 0 || file.size > MY_WRITEX_MAX_FILE_BYTES) {
        setFileError(`${file.name} is not an approved type or is larger than 10 MB.`);
        event.target.value = "";
        return;
      }
      const name = safeRequestFileName(file.name);
      if (!name) {
        setFileError("Choose a file with a safe file name.");
        event.target.value = "";
        return;
      }
      next.push({ id: crypto.randomUUID(), name, size: file.size, mimeType: file.type, purpose, uploadState: "stored", addedAt: new Date().toISOString() });
    }
    touched.current = true;
    setFiles((current) => [...current, ...next]);
    event.target.value = "";
  }

  async function submit() {
    const allErrors = [1, 2, 3].flatMap((candidate) => validateRequestStep(candidate, fields));
    setErrors(allErrors);
    if (allErrors.length || submitting) return;
    setSubmitting(true);
    try {
      let stableId = requestId;
      if (!stableId) {
        const draftResponse = await fetch(props.apiEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, operation: "save_draft" }) });
        const draftResult = await draftResponse.json() as { data?: { request: MyWritexRequestView }; error?: { message: string } };
        if (!draftResponse.ok || !draftResult.data?.request) throw new Error(draftResult.error?.message || "Draft could not be saved.");
        stableId = draftResult.data.request.id;
        setRequestId(stableId);
      }
      const response = await fetch(props.apiEndpoint, { method: "POST", headers: { "content-type": "application/json", "x-idempotency-key": props.sourceKey }, body: JSON.stringify({ ...payload, requestId: stableId, operation: "submit" }) });
      const result = await response.json() as { data?: { request: MyWritexRequestView }; error?: { message: string } };
      if (!response.ok || !result.data?.request) throw new Error(result.error?.message || "The requirement could not be sent.");
      setSuccess(result.data.request);
      setSaveState("Submitted");
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "The requirement could not be sent."]);
    } finally { setSubmitting(false); }
  }

  async function discard() {
    if (!draftReference || !window.confirm("Discard this local draft? This cannot be undone.")) return;
    const response = await fetch(`${props.apiEndpoint}/${encodeURIComponent(draftReference)}`, { method: "DELETE" });
    if (!response.ok) { setErrors(["The draft could not be discarded."]); return; }
    touched.current = false;
    setFields({ ...emptyRequirementFields(), ...props.initialFields });
    setFiles([]);
    setRequestId(undefined);
    setDraftReference(undefined);
    setStep(1);
    setSaveState("Draft discarded");
  }

  if (success) return <RequirementSuccess request={success} mode={props.mode} />;

  const title = props.source === "similar_project" || (props.mode === "invoice" && props.sourceLabel) ? "Order Similar Work" : props.source === "upcoming_work" ? "Prepare Requirement" : "Start New Requirement";
  return (
    <div className="mw-page-stack" data-request-source={props.source}>
      <ProductPageHeader eyebrow={props.mode === "invoice" ? "Quick Project Workspace" : "Work with WriteX"} title={title} copy="Share a clear requirement in four calm steps. Your draft saves only to this isolated local UAT store." />
      {props.sourceLabel ? <div className="rounded-[12px] border border-[var(--mw-line)] bg-[var(--mw-soft)] px-4 py-3 text-sm"><span className="font-semibold">Based on:</span> {props.sourceLabel}<span className="mw-meta ml-2">Only safe context was carried forward.</span></div> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,760px)_260px]">
        <section className="mw-card mw-card-mobile-pad p-6">
          <ol className="mb-7 grid grid-cols-4 gap-2" aria-label="Requirement steps">
            {steps.map((label, index) => <li key={label} className="min-w-0"><button type="button" onClick={() => index + 1 < step && setStep(index + 1)} className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]" aria-current={step === index + 1 ? "step" : undefined}><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step > index + 1 ? "bg-[#eaf6f0] text-[#116747]" : step === index + 1 ? "bg-[var(--mw-primary)] text-white" : "bg-[var(--mw-soft)] text-[var(--mw-muted)]"}`}>{step > index + 1 ? <Check className="h-4 w-4" /> : index + 1}</span><span className="mt-2 hidden text-xs font-medium text-[var(--mw-muted)] sm:block">{label}</span></button></li>)}
          </ol>
          {errors.length ? <div role="alert" className="mb-5 rounded-[10px] border border-[#f0c7b6] bg-[#fff6f1] p-4 text-sm text-[#934122]"><p className="font-semibold">Check this step</p><ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
          <form onSubmit={next}>
            {step === 1 ? <StepOne fields={fields} update={update} /> : null}
            {step === 2 ? <StepTwo fields={fields} update={update} /> : null}
            {step === 3 ? <StepThree fields={fields} files={files} update={update} addFiles={addFiles} removeFile={(id) => { touched.current = true; setFiles((current) => current.filter((file) => file.id !== id)); }} fileError={fileError} /> : null}
            {step === 4 ? <Review fields={fields} files={files} edit={setStep} /> : null}
            <div className="mt-7 flex flex-wrap gap-3 border-t border-[var(--mw-line)] pt-5">
              {step > 1 ? <button type="button" onClick={() => { setErrors([]); setStep((current) => current - 1); }} className="mw-button-secondary"><ArrowLeft className="h-[18px] w-[18px]" />Back</button> : null}
              {step < 4 ? <button type="submit" className="mw-button-primary">Continue <ArrowRight className="h-[18px] w-[18px]" /></button> : <button type="button" disabled={submitting} onClick={submit} className="mw-button-primary disabled:cursor-wait disabled:opacity-70"><Send className="h-[18px] w-[18px]" />{submitting ? "Sending…" : "Send to My WriteX Manager"}</button>}
            </div>
          </form>
        </section>
        <aside className="grid content-start gap-4">
          <section className="mw-card mw-card-mobile-pad p-5"><Save className="h-5 w-5 text-[var(--mw-primary)]" /><h2 className="mw-object-title mt-3">Local draft</h2><p className="mw-secondary mt-2">{saveState}</p>{restored ? <p className="mw-meta mt-2">Restored from your last visit.</p> : null}{draftReference ? <button type="button" onClick={discard} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#934122] outline-none focus-visible:ring-2 focus-visible:ring-[#934122]"><Trash2 className="h-4 w-4" />Discard Draft</button> : null}</section>
          <section className="mw-card mw-card-mobile-pad p-5"><CheckCircle2 className="h-5 w-5 text-[#116747]" /><h2 className="mw-object-title mt-3">Aman will review it</h2><p className="mw-secondary mt-2">Your My WriteX Manager receives this in the local request queue. No email, WhatsApp, payment or production lead is created.</p></section>
        </aside>
      </div>
    </div>
  );
}

type StepProps = { fields: MyWritexRequirementFields; update: <K extends keyof MyWritexRequirementFields>(key: K, value: MyWritexRequirementFields[K]) => void };
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`block ${className}`}><span className="text-sm font-medium">{label}</span>{children}</label>; }

function StepOne({ fields, update }: StepProps) { const services = fields.service && !serviceOptions.includes(fields.service) ? [fields.service, ...serviceOptions] : serviceOptions; const categories = fields.category && !categoryOptions.includes(fields.category) ? [fields.category, ...categoryOptions] : categoryOptions; return <div><p className="mw-eyebrow">Step 1 of 4</p><h2 className="mw-section-title mt-1">What do you need?</h2><div className="mt-6 grid gap-[18px] sm:grid-cols-2"><Field label="Service"><select required value={fields.service} onChange={(e) => update("service", e.target.value)} className="mw-control mt-[7px] w-full"><option value="">Choose a service</option>{services.map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="Category"><select required value={fields.category} onChange={(e) => update("category", e.target.value)} className="mw-control mt-[7px] w-full"><option value="">Choose a category</option>{categories.map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="Requirement title" className="sm:col-span-2"><input required autoCapitalize="words" value={fields.title} onChange={(e) => update("title", normalizeRequirementTitle(e.target.value))} placeholder="e.g. Strategic Management Report" className="mw-control mt-[7px] w-full" /><span className="mw-meta mt-1.5 block">Each word starts with a capital letter.</span></Field><Field label="Subject"><input value={fields.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Optional subject" className="mw-control mt-[7px] w-full" /></Field><Field label="Module"><input value={fields.module} onChange={(e) => update("module", e.target.value)} placeholder="Optional module" className="mw-control mt-[7px] w-full" /></Field><Field label="Institution"><input value={fields.institution} onChange={(e) => update("institution", e.target.value)} className="mw-control mt-[7px] w-full" /></Field><Field label="Course / programme"><input value={fields.course} onChange={(e) => update("course", e.target.value)} className="mw-control mt-[7px] w-full" /></Field></div></div>; }

function StepTwo({ fields, update }: StepProps) { return <div><p className="mw-eyebrow">Step 2 of 4</p><h2 className="mw-section-title mt-1">Scope & deadline</h2><div className="mt-6 grid gap-[18px] sm:grid-cols-2"><Field label="Scope"><input required value={fields.scope} onChange={(e) => update("scope", e.target.value)} placeholder="e.g. 12-slide presentation" className="mw-control mt-[7px] w-full" /></Field><Field label="Word count"><input value={fields.wordCount} onChange={(e) => update("wordCount", e.target.value)} inputMode="numeric" placeholder="Optional — confirm for similar work" className="mw-control mt-[7px] w-full" /></Field><Field label="Deadline date"><input required type="text" inputMode="numeric" pattern="\d{4}-\d{2}-\d{2}" placeholder="YYYY-MM-DD" value={fields.deadlineDate} onChange={(e) => update("deadlineDate", e.target.value)} className="mw-control mt-[7px] w-full" /></Field><Field label="Deadline time"><input type="text" inputMode="numeric" pattern="([01]\d|2[0-3]):[0-5]\d" placeholder="HH:MM" value={fields.deadlineTime} onChange={(e) => update("deadlineTime", e.target.value)} className="mw-control mt-[7px] w-full" /></Field><Field label="Timezone"><select value={fields.timezone} onChange={(e) => update("timezone", e.target.value)} className="mw-control mt-[7px] w-full"><option>Asia/Calcutta</option><option>Europe/London</option><option>America/New_York</option><option>Australia/Sydney</option></select></Field><Field label="Urgency"><select value={fields.urgency} onChange={(e) => update("urgency", e.target.value)} className="mw-control mt-[7px] w-full"><option>Standard</option><option>Time-sensitive</option><option>Planning ahead</option></select></Field><Field label="Expected deliverable" className="sm:col-span-2"><input required value={fields.expectedDeliverable} onChange={(e) => update("expectedDeliverable", e.target.value)} placeholder="What should the completed work include?" className="mw-control mt-[7px] w-full" /></Field><Field label="Context or urgency note" className="sm:col-span-2"><textarea rows={3} value={fields.context} onChange={(e) => update("context", e.target.value)} className="mw-control mt-[7px] h-auto w-full py-3" /></Field></div></div>; }

function StepThree({ fields, files, update, addFiles, removeFile, fileError }: StepProps & { files: MyWritexRequestFile[]; addFiles: (event: ChangeEvent<HTMLInputElement>, purpose: "brief" | "supporting") => void; removeFile: (id: string) => void; fileError: string }) { return <div><p className="mw-eyebrow">Step 3 of 4</p><h2 className="mw-section-title mt-1">Brief, files & instructions</h2><div className="mt-6 grid gap-[18px]"><Field label="Detailed brief"><textarea required rows={7} value={fields.detailedBrief} onChange={(e) => update("detailedBrief", e.target.value)} placeholder="Explain the question, goals, structure, constraints and anything Aman should know." className="mw-control mt-[7px] h-auto w-full py-3" /></Field><div className="grid gap-3 sm:grid-cols-2"><UploadButton label="Upload brief" purpose="brief" onChange={addFiles} /><UploadButton label="Add supporting files" purpose="supporting" onChange={addFiles} /></div>{fileError ? <p role="alert" className="text-sm text-[#934122]">{fileError}</p> : null}{files.length ? <div className="mw-list-surface px-4">{files.map((file) => <div key={file.id} className="mw-file-row"><FileText className="h-5 w-5 text-[var(--mw-primary)]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="mw-meta mt-1">{file.purpose === "brief" ? "Brief" : "Supporting"} · {(file.size / 1024).toFixed(0)} KB · Stored locally</p></div><button type="button" onClick={() => removeFile(file.id)} aria-label={`Remove ${file.name}`} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[#934122] outline-none focus-visible:ring-2 focus-visible:ring-[#934122]"><Trash2 className="h-4 w-4" /></button></div>)}</div> : null}<Field label="File note / special instructions"><textarea rows={3} value={fields.fileNote} onChange={(e) => update("fileNote", e.target.value)} className="mw-control mt-[7px] h-auto w-full py-3" /></Field></div></div>; }

function UploadButton({ label, purpose, onChange }: { label: string; purpose: "brief" | "supporting"; onChange: (event: ChangeEvent<HTMLInputElement>, purpose: "brief" | "supporting") => void }) { return <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--mw-line-strong)] bg-[var(--mw-soft)] p-4 text-center outline-none focus-within:ring-2 focus-within:ring-[var(--mw-primary)]"><UploadCloud className="h-5 w-5 text-[var(--mw-primary)]" /><span className="mt-2 text-sm font-semibold">{label}</span><span className="mw-meta mt-1">PDF, Office, PNG, JPG or TXT · max 10 MB</span><input type="file" className="sr-only" multiple onChange={(event) => onChange(event, purpose)} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" /></label>; }

function Review({ fields, files, edit }: { fields: MyWritexRequirementFields; files: MyWritexRequestFile[]; edit: (step: number) => void }) { const sections = [{ step: 1, title: "What you need", rows: [["Service", fields.service], ["Category", fields.category], ["Title", fields.title], ["Subject / module", [fields.subject, fields.module].filter(Boolean).join(" · ") || "Not provided"], ["Institution / course", [fields.institution, fields.course].filter(Boolean).join(" · ") || "Not provided"]] }, { step: 2, title: "Scope & deadline", rows: [["Scope", fields.scope], ["Word count", fields.wordCount || "To confirm"], ["Deadline", `${fields.deadlineDate}${fields.deadlineTime ? ` at ${fields.deadlineTime}` : ""} · ${fields.timezone}`], ["Deliverable", fields.expectedDeliverable], ["Urgency", fields.urgency]] }, { step: 3, title: "Brief & files", rows: [["Brief", fields.detailedBrief], ["Files", files.length ? `${files.length} safely stored file${files.length === 1 ? "" : "s"}` : "No files attached"], ["Instructions", fields.fileNote || "No extra file instructions"]] }]; return <div><p className="mw-eyebrow">Step 4 of 4</p><h2 className="mw-section-title mt-1">Review your requirement</h2><p className="mw-secondary mt-2">Check the human-readable summary before it enters Aman&apos;s local queue.</p><div className="mt-6 grid gap-4">{sections.map((section) => <section key={section.title} className="rounded-[12px] border border-[var(--mw-line)] p-4"><div className="flex items-center justify-between gap-4"><h3 className="mw-object-title">{section.title}</h3><button type="button" onClick={() => edit(section.step)} className="min-h-11 text-sm font-semibold text-[var(--mw-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]">Edit</button></div><dl className="mt-3 grid gap-3">{section.rows.map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[130px_1fr]"><dt className="mw-meta">{label}</dt><dd className="break-words text-sm">{value}</dd></div>)}</dl></section>)}</div></div>; }

function RequirementSuccess({ request, mode }: { request: MyWritexRequestRecord; mode: "customer" | "invoice" }) { return <div className="mx-auto max-w-[760px] py-4 sm:py-10"><section className="mw-card mw-card-mobile-pad p-7 text-center sm:p-10"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf6f0] text-[#116747]"><CheckCircle2 className="h-7 w-7" /></span><p className="mw-eyebrow mt-5">Requirement sent</p><h1 className="mw-page-title mt-2">Your requirement has been sent to Aman.</h1><p className="mt-4 text-lg font-semibold text-[var(--mw-primary)]">{request.publicReference}</p><dl className="mx-auto mt-6 grid max-w-[560px] gap-3 rounded-[12px] bg-[var(--mw-soft)] p-5 text-left sm:grid-cols-2"><div><dt className="mw-meta">Requirement</dt><dd className="mt-1 text-sm font-medium">{request.fields.title}</dd></div><div><dt className="mw-meta">Status</dt><dd className="mt-1 text-sm font-medium">{request.status}</dd></div><div><dt className="mw-meta">Manager</dt><dd className="mt-1 text-sm font-medium">Aman</dd></div><div><dt className="mw-meta">Deadline</dt><dd className="mt-1 text-sm font-medium">{request.fields.deadlineDate}</dd></div></dl><p className="mw-secondary mx-auto mt-5 max-w-lg">Aman can review it in the development inspector. No real message, quote, payment request or production record was created.</p><div className="mt-7 flex flex-wrap justify-center gap-3">{mode === "customer" ? <><Link href={`/my-writex/requests/${encodeURIComponent(request.publicReference)}`} className="mw-button-primary">View Request <ArrowRight className="h-[18px] w-[18px]" /></Link><Link href="/my-writex/requests" className="mw-button-secondary">My Requests</Link></> : <><Link href="/client/requests" className="mw-button-primary">View Invoice Requests</Link><Link href="/client/project" className="mw-button-secondary">Back to Project</Link></>}</div></section></div>; }
