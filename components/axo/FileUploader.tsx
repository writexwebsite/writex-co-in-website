"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, LoaderCircle, RotateCcw } from "lucide-react";
import { AXO_ACCEPTED_FILES } from "@/lib/axo/config";
import { trackAxoEvent } from "@/lib/axo/analytics";
import { validateAxoFile } from "@/lib/axo/rules";
import type { AxoBrief } from "@/lib/axo/types";

export function FileUploader({ serviceId, files, onUploaded }: { serviceId?: string; files: NonNullable<AxoBrief["files"]>; onUploaded: (file: NonNullable<AxoBrief["files"]>[number]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState("");
  const upload = (file: File) => {
    const issue = validateAxoFile(file);
    if (issue) { setStatus("error"); setMessage(issue); trackAxoEvent("file_upload_failed", { service_id: serviceId, reason_code: "client_validation" }); return; }
    setStatus("uploading"); setProgress(2); setMessage(""); trackAxoEvent("file_upload_started", { service_id: serviceId, file_count: 1 });
    const body = new FormData(); body.append("file", file); body.append("assetType", "quote_brief"); body.append("uploadedBy", "client");
    const request = new XMLHttpRequest(); request.open("POST", "/api/upload-brief");
    request.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.min(95, Math.round(event.loaded / event.total * 100))); };
    request.onload = () => { try { const response = JSON.parse(request.responseText); if (request.status < 200 || request.status >= 300 || !response.fileAssetId) throw new Error(response.message || "Upload unavailable"); onUploaded({ name: response.fileName, size: response.fileSize, type: response.mimeType, assetId: response.fileAssetId }); setStatus("idle"); setProgress(100); trackAxoEvent("file_upload_completed", { service_id: serviceId, file_count: files.length + 1 }); } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Upload unavailable. You can continue without the file and send it on WhatsApp."); trackAxoEvent("file_upload_failed", { service_id: serviceId, reason_code: "server_rejected" }); } };
    request.onerror = () => { setStatus("error"); setMessage("Upload could not be completed. Retry or continue and send the file on WhatsApp."); trackAxoEvent("file_upload_failed", { service_id: serviceId, reason_code: "network" }); };
    request.send(body);
  };
  return <div className="mt-3"><label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-violet-300 bg-violet-50/60 p-4 text-center focus-within:ring-2 focus-within:ring-violet-500"><FileUp className="h-5 w-5 text-violet-600" /><span className="mt-1 text-sm font-semibold text-indigo-950">Securely upload brief, rubric, draft, or guide</span><span className="mt-1 text-xs text-slate-500">PDF, Office files, text, CSV, JPG, or PNG. Private storage when configured.</span><input ref={inputRef} type="file" accept={AXO_ACCEPTED_FILES} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} className="sr-only" disabled={status === "uploading"} /></label>{status === "uploading" ? <div className="mt-2" role="status"><div className="flex items-center justify-between text-xs text-slate-600"><span className="inline-flex items-center gap-1"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Uploading securely</span><span>{progress}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-violet-600 transition-[width]" style={{ width: `${progress}%` }} /></div></div> : null}{message ? <div role="alert" className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{message}</span><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-8 items-center gap-1 font-semibold"><RotateCcw className="h-3.5 w-3.5" />Retry</button></div> : null}{files.length ? <ul className="mt-2 space-y-1">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />{file.name}</li>)}</ul> : null}<p className="mt-2 text-[11px] leading-4 text-slate-500">Upload only files you are authorised to share. Files are retained according to WriteX privacy and operational policies.</p></div>;
}
