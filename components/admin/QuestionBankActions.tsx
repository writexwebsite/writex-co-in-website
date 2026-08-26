"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Archive, BarChart3, CheckCircle2, Copy, Edit3, Eye, History, MoveDown, MoveUp, Power, Upload } from "lucide-react";
import { humaniseAdminStatus } from "@/components/admin/AdminPrimitives";
import { QuestionBankManager, type QuestionEditorValue } from "@/components/admin/QuestionBankManager";

type Action="publish"|"set_active"|"duplicate"|"archive"|"reorder"|"edit"|"version";

export function QuestionBankActions({question}:{question:QuestionEditorValue&{stableQuestionId:string;version:number;prompt:string;section:string;difficulty:string;active:boolean;protectedQuestion:boolean;usage:number;lifecycleStatus:string;contentHash:string}}){
  const router=useRouter();const[operation,setOperation]=useState<Action|null>(null);const[reorderDelta,setReorderDelta]=useState(10);const[state,setState]=useState<"idle"|"busy"|"success"|"error">("idle");const[message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!operation||operation==="edit"||operation==="version")return;const form=new FormData(event.currentTarget);const reason=String(form.get("reason")||"").trim();if(!reason){setState("error");setMessage("A review reason is required for the audit record.");return;}setState("busy");setMessage("");let body:Record<string,unknown>={operation,reason};if(operation==="set_active")body={operation,active:!question.active,reason};if(operation==="reorder")body={operation,displayOrder:Number(form.get("displayOrder")),reason};try{const response=await fetch(`/api/admin/hiring/questions/${encodeURIComponent(question.stableQuestionId)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(payload?.error?.message||"The question could not be changed.");setState("success");setMessage("Question lifecycle updated and audited.");setOperation(null);router.refresh();}catch(error){setState("error");setMessage(error instanceof Error?error.message:"The question could not be changed.");}}
  return <div className="grid gap-3">
    <details className="rounded-md border border-wxBorder bg-wxSurfaceSoft"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold text-wxIndigo700"><Eye className="h-4 w-4"/>Preview exact version</summary><div className="border-t border-wxBorder px-3 py-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-wxIndigo400">{humaniseAdminStatus(question.section)} / {humaniseAdminStatus(question.difficulty)}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-wxIndigo700">{question.prompt}</p><p className="mt-3 break-all font-mono text-[11px] text-wxIndigo400">SHA-256 {question.contentHash}</p></div></details>
    <div className="flex flex-wrap gap-2">
      {question.lifecycleStatus==="draft"&&!question.protectedQuestion?<ActionButton icon={Edit3} label="Edit draft" onClick={()=>setOperation("edit")}/>:null}
      {!question.protectedQuestion?<ActionButton icon={Upload} label="Create next version" onClick={()=>setOperation("version")}/>:null}
      <ActionButton icon={Copy} label="Duplicate" onClick={()=>setOperation("duplicate")}/>
      {question.lifecycleStatus==="draft"||!question.active?<ActionButton icon={Upload} label="Publish version" onClick={()=>setOperation("publish")}/>:null}
      <ActionButton icon={Power} label={question.active?"Disable":"Enable"} onClick={()=>setOperation("set_active")}/>
      <ActionButton icon={MoveUp} label="Move earlier" onClick={()=>{setReorderDelta(-10);setOperation("reorder");}}/>
      <ActionButton icon={MoveDown} label="Move later" onClick={()=>{setReorderDelta(10);setOperation("reorder");}}/>
      <Link href={`/admin/audit-logs?record=${encodeURIComponent(question.stableQuestionId)}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700"><History className="h-4 w-4"/>History</Link>
      <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo600"><BarChart3 className="h-4 w-4"/>{question.usage} use{question.usage===1?"":"s"}</span>
      {!question.protectedQuestion?<ActionButton icon={Archive} label="Archive" danger onClick={()=>setOperation("archive")}/>:null}
    </div>
    {operation==="edit"||operation==="version"?<div className="mt-2"><QuestionBankManager stableQuestionId={question.stableQuestionId} operation={operation==="edit"?"update_draft":"create_version"} initial={question} onDone={()=>setOperation(null)}/></div>:null}
    {operation&&!['edit','version'].includes(operation)?<form onSubmit={submit} className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"><p className="text-sm font-semibold text-wxIndigo900">{humaniseAdminStatus(operation)} {question.stableQuestionId} v{question.version}</p>{operation==="reorder"?<label className="mt-3 block text-xs font-semibold text-wxIndigo700">New display order<input name="displayOrder" type="number" min="0" defaultValue={Math.max(0,question.displayOrder+reorderDelta)} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"/></label>:null}<label className="mt-3 block text-xs font-semibold text-wxIndigo700">Decision reason<textarea name="reason" required rows={2} className="mt-2 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm"/></label><div className="mt-3 flex gap-2"><button disabled={state==="busy"} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand-spectrum px-4 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4"/>{state==="busy"?"Saving...":"Confirm and record"}</button><button type="button" onClick={()=>setOperation(null)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold">Cancel</button></div></form>:null}
    {message?<p role={state==="error"?"alert":"status"} className={state==="error"?"text-sm font-medium text-red-700":"text-sm font-medium text-emerald-700"}>{message}</p>:null}
  </div>;
}

function ActionButton({icon:Icon,label,onClick,danger=false}:{icon:typeof Power;label:string;onClick:()=>void;danger?:boolean}){return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${danger?"border-red-200 bg-red-50 text-red-700":"border-wxBorder text-wxViolet700"}`}><Icon className="h-4 w-4"/>{label}</button>}
