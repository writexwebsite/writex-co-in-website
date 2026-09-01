"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, RefreshCw, Upload, Video } from "lucide-react";
import type { SalesVideoPolicy } from "@/lib/hiring/video-policy";

export function VideoIntroductionField({ policy }: { policy: SalesVideoPolicy }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [status, setStatus] = useState<"idle"|"requesting"|"ready"|"recording"|"selected"|"denied"|"error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("Choose Record to request camera and microphone permission, or upload an existing introduction.");

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now()-startedAtRef.current)/1000)), 250);
    return () => window.clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (status === "recording" && seconds >= policy.targetMaxSeconds) stopRecording();
  }, [policy.targetMaxSeconds, seconds, status]);
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track)=>track.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function setFile(file: File, duration: number, source: "RECORDED"|"UPLOADED") {
    if (file.size > policy.maxBytes) { setStatus("error"); setMessage(`Video must be ${Math.round(policy.maxBytes / 1024 / 1024)} MB or smaller. Record at a lower quality or upload a smaller file.`); return; }
    if (duration < policy.targetMinSeconds || duration > policy.targetMaxSeconds) { setStatus("error"); setMessage(`Video must be between ${policy.targetMinSeconds} and ${policy.targetMaxSeconds} seconds. Current length: ${Math.round(duration)} seconds.`); return; }
    const transfer = new DataTransfer(); transfer.items.add(file);
    if (inputRef.current) inputRef.current.files = transfer.files;
    const durationField = document.querySelector<HTMLInputElement>('input[name="videoDurationSeconds"]');
    const sourceField = document.querySelector<HTMLInputElement>('input[name="videoCaptureSource"]');
    if (durationField) durationField.value=String(Math.round(duration));
    if (sourceField) sourceField.value=source;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file)); setSeconds(Math.round(duration)); setStatus("selected");
    setMessage(`${source === "RECORDED" ? "Recorded" : "Uploaded"} video is ready for private human review.`);
  }

  async function requestCamera() {
    setStatus("requesting"); setMessage("Waiting for camera and microphone permission...");
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280}},audio:true});
      streamRef.current=stream; if(liveRef.current){liveRef.current.srcObject=stream;await liveRef.current.play();}
      setStatus("ready"); setMessage("Camera and microphone are ready. Recording starts only when you press Start recording.");
    } catch (error) {
      const denied=error instanceof DOMException && (error.name==="NotAllowedError"||error.name==="SecurityError");
      setStatus(denied?"denied":"error");
      setMessage(denied?"Camera or microphone permission was denied. Allow access in browser settings, then retry, or use Upload video.":"Camera could not start. Check that it is not in use elsewhere, then retry or upload a video.");
    }
  }

  function startRecording() {
    const stream=streamRef.current; if(!stream)return;
    const mimeType=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
    const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:1_500_000}); chunksRef.current=[];
    recorder.ondataavailable=(event)=>{if(event.data.size)chunksRef.current.push(event.data);};
    recorder.onstop=()=>{const duration=(Date.now()-startedAtRef.current)/1000;const blob=new Blob(chunksRef.current,{type:"video/webm"});setFile(new File([blob],`sales-introduction-${Date.now()}.webm`,{type:"video/webm"}),duration,"RECORDED");stream.getTracks().forEach((track)=>track.stop());streamRef.current=null;};
    recorderRef.current=recorder; startedAtRef.current=Date.now(); setSeconds(0); recorder.start(1000); setStatus("recording"); setMessage(`Recording in progress. Aim for ${policy.targetMinSeconds}-${policy.targetMaxSeconds} seconds.`);
  }

  function stopRecording() { if(recorderRef.current?.state==="recording") recorderRef.current.stop(); }
  function reset() { if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl("");setSeconds(0);setStatus("idle");setMessage("Record again or upload a replacement.");if(inputRef.current)inputRef.current.value=""; }
  function onUpload(file?:File) {
    if(!file)return;
    if(!["video/webm","video/mp4","video/quicktime"].includes(file.type)){setStatus("error");setMessage("Upload a WebM, MP4 or MOV video.");return;}
    const url=URL.createObjectURL(file);const video=document.createElement("video");video.preload="metadata";video.src=url;
    video.onloadedmetadata=()=>{URL.revokeObjectURL(url);setFile(file,video.duration,"UPLOADED");};
    video.onerror=()=>{URL.revokeObjectURL(url);setStatus("error");setMessage("The selected video could not be read. Choose a valid WebM, MP4 or MOV file.");};
  }

  return <fieldset className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 sm:col-span-2">
    <legend className="px-1 text-sm font-semibold text-wxIndigo900">Sales video introduction <span className="text-red-600">*</span></legend>
    <p className="mt-1 text-sm leading-6 text-wxIndigo500">{policy.targetMinSeconds}-{policy.targetMaxSeconds} seconds. {policy.prompt} Human reviewers assess only job-relevant communication evidence; no body-language or appearance inference is used.</p>
    <p className="mt-2 text-xs leading-5 text-wxIndigo500">Your video is stored privately, is visible only to authorised Hiring reviewers, and is scheduled for retention review after {policy.retentionDays} days.</p>
    <div className="mt-4 inline-flex rounded-md border border-wxBorder bg-wxSurface p-1" role="group" aria-label="Video introduction method">
      <button type="button" onClick={()=>setMode("record")} aria-pressed={mode==="record"} className={`inline-flex min-h-10 items-center gap-2 rounded px-3 text-sm font-semibold ${mode==="record"?"bg-wxViolet700 text-white":"text-wxIndigo700"}`}><Camera className="h-4 w-4"/>Record</button>
      <button type="button" onClick={()=>setMode("upload")} aria-pressed={mode==="upload"} className={`inline-flex min-h-10 items-center gap-2 rounded px-3 text-sm font-semibold ${mode==="upload"?"bg-wxViolet700 text-white":"text-wxIndigo700"}`}><Upload className="h-4 w-4"/>Upload</button>
    </div>
    <input ref={inputRef} name="videoIntroduction" type="file" required accept="video/webm,video/mp4,video/quicktime" className="sr-only" onChange={(event)=>onUpload(event.target.files?.[0])}/>
    <input name="videoDurationSeconds" type="hidden"/><input name="videoCaptureSource" type="hidden"/>
    {mode==="record"&&!previewUrl?<div className="mt-4 grid gap-3"><video ref={liveRef} muted playsInline className="aspect-video w-full max-w-2xl rounded-md bg-black object-cover"/><div className="flex flex-wrap gap-2">{status==="idle"||status==="denied"||status==="error"?<button type="button" onClick={requestCamera} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxViolet700"><Video className="h-4 w-4"/>Enable camera & microphone</button>:null}{status==="ready"?<button type="button" onClick={startRecording} className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"><Camera className="h-4 w-4"/>Start recording</button>:null}{status==="recording"?<button type="button" onClick={stopRecording} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white"><CircleStop className="h-4 w-4"/>Stop ({seconds}s)</button>:null}</div></div>:null}
    {mode==="upload"&&!previewUrl?<label className="mt-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-wxBorder bg-wxSurface px-4 text-center"><Upload className="h-5 w-5 text-wxViolet700"/><span className="mt-2 text-sm font-semibold text-wxIndigo900">Choose a private video</span><span className="text-xs text-wxIndigo500">WebM, MP4 or MOV; up to {Math.round(policy.maxBytes / 1024 / 1024)} MB</span><input type="file" accept="video/webm,video/mp4,video/quicktime" className="sr-only" onChange={(event)=>onUpload(event.target.files?.[0])}/></label>:null}
    {previewUrl?<div className="mt-4"><video controls playsInline src={previewUrl} className="aspect-video w-full max-w-2xl rounded-md bg-black"/><button type="button" onClick={reset} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxViolet700"><RefreshCw className="h-4 w-4"/>Re-record or replace</button></div>:null}
    <p role="status" className={`mt-3 text-sm ${status==="error"||status==="denied"?"text-red-700":"text-wxIndigo500"}`}>{message}</p>
  </fieldset>;
}
