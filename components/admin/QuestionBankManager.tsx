"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Plus, Save } from "lucide-react";
import { hiringRoleLabel } from "@/lib/hiring/domain";

export type QuestionEditorValue = {
  role:string;title:string;category:string;section:string;difficulty:string;prompt:string;
  instructions:string;sourceMaterial:string;answerType:string;expectedTimeMinutes:number;
  maximumScore:number;required:boolean;randomizationEligible:boolean;backNavigationRule:string;
  variants:string[];scoringRubric:Record<string,unknown>;autoScoringRule:Record<string,unknown>;expectedCompetencies:string[];humanReviewRequired:boolean;
  antiCheatSensitivity:string;vivaFollowUpRequired:boolean;displayOrder:number;active:boolean;
};

export function QuestionBankManager({
  stableQuestionId,
  operation,
  initial,
  onDone
}: {
  stableQuestionId?: string;
  operation?: "update_draft" | "create_version";
  initial?: QuestionEditorValue;
  onDone?: () => void;
} = {}) {
  const router=useRouter();
  const[state,setState]=useState<"idle"|"busy"|"success"|"error">("idle");
  const[message,setMessage]=useState("");
  const editing=Boolean(stableQuestionId&&operation);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setState("busy");setMessage("");
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const payload={
      role:form.get("role"),title:form.get("title"),category:form.get("category"),section:form.get("section"),
      difficulty:form.get("difficulty"),prompt:form.get("prompt"),instructions:form.get("instructions"),
      sourceMaterial:form.get("sourceMaterial"),answerType:form.get("answerType"),
      expectedTimeMinutes:Number(form.get("expectedTimeMinutes")),maximumScore:Number(form.get("maximumScore")),
      required:form.get("required")==="on",randomizationEligible:form.get("randomizationEligible")==="on",
      backNavigationRule:form.get("backNavigationRule"),
      variants:String(form.get("variants")||"").split("\n").map(v=>v.trim()).filter(Boolean),
      scoringRubric:{criteria:String(form.get("rubric")||"")},autoScoringRule:{rule:String(form.get("autoScoringRule")||"")},
      expectedCompetencies:String(form.get("competencies")||"").split(",").map(v=>v.trim()).filter(Boolean),
      humanReviewRequired:form.get("humanReviewRequired")==="on",antiCheatSensitivity:form.get("antiCheatSensitivity"),
      vivaFollowUpRequired:form.get("vivaFollowUpRequired")==="on",displayOrder:Number(form.get("displayOrder")),
      active:false,changeReason:form.get("changeReason")
    };
    try{
      const response=await fetch(editing?`/api/admin/hiring/questions/${encodeURIComponent(stableQuestionId!)}`:"/api/admin/hiring/questions",{
        method:editing?"PATCH":"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify(editing?{operation,input:payload}:payload)
      });
      const json=await response.json();
      if(!response.ok)throw new Error(json?.error?.message||"Question could not be saved.");
      setState("success");setMessage(editing?`Saved ${json.data.stableQuestionId} version ${json.data.version}.`:`Draft ${json.data.stableQuestionId} created.`);
      if(!editing)formElement.reset();
      router.refresh();onDone?.();
    }catch(error){setState("error");setMessage(error instanceof Error?error.message:"Question could not be saved.");}
  }

  const value=initial;
  return <form onSubmit={submit} className="grid gap-5 rounded-md border border-wxBorder bg-wxSurface p-5 shadow-soft">
    <div><h2 className="text-lg font-bold text-wxIndigo900">{editing?(operation==="update_draft"?"Edit draft":"Create next version"):"Add assessment question"}</h2><p className="mt-1 text-sm text-wxIndigo500">New and revised questions remain Draft until an authorised reviewer publishes the exact version.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <Select name="role" label="Role" values={["academic_writer","sales_executive"]} initial={value?.role}/>
      <Field name="title" label="Question title" required initial={value?.title}/>
      <Field name="category" label="Category" required initial={value?.category}/>
      <Field name="section" label="Assessment section" required initial={value?.section}/>
      <Select name="difficulty" label="Difficulty" values={["foundation","intermediate","advanced"]} initial={value?.difficulty}/>
      <Select name="answerType" label="Answer type" values={["long_text","short_text","structured_response","editing_task","source_based_response","voice_response","scenario_response","file_interaction"]} initial={value?.answerType||"long_text"}/>
      <Field name="expectedTimeMinutes" label="Expected time (minutes)" type="number" required initial={String(value?.expectedTimeMinutes??15)}/>
      <Field name="maximumScore" label="Maximum score" type="number" required initial={String(value?.maximumScore??100)}/>
      <Field name="displayOrder" label="Display order" type="number" required initial={String(value?.displayOrder??100)}/>
      <Select name="backNavigationRule" label="Back navigation" values={["session_default","allowed","locked_after_next"]} initial={value?.backNavigationRule||"session_default"}/>
      <Select name="antiCheatSensitivity" label="Integrity sensitivity" values={["low","standard","high"]} initial={value?.antiCheatSensitivity||"standard"}/>
      <Field name="competencies" label="Competencies (comma separated)" required initial={value?.expectedCompetencies.join(", ")}/>
    </div>
    <Field name="prompt" label="Question prompt" required textarea initial={value?.prompt}/>
    <Field name="instructions" label="Candidate instructions" textarea initial={value?.instructions}/>
    <Field name="sourceMaterial" label="Source material" textarea rows={6} initial={value?.sourceMaterial}/>
    <div className="grid gap-4 md:grid-cols-2"><Field name="variants" label="Candidate-safe variants (one per line)" textarea initial={value?.variants.join("\n")}/><Field name="rubric" label="Scoring rubric" required textarea initial={String(value?.scoringRubric?.criteria||"")}/></div>
    <Field name="autoScoringRule" label="Automatic scoring rule (optional plain-language rule)" textarea initial={String(value?.autoScoringRule?.rule||"")}/>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Check name="required" label="Required" initial={value?.required??true}/>
      <Check name="randomizationEligible" label="May be randomised" initial={value?.randomizationEligible??true}/>
      <Check name="humanReviewRequired" label="Human review required" initial={value?.humanReviewRequired??true}/>
      <Check name="vivaFollowUpRequired" label="Viva follow-up" initial={value?.vivaFollowUpRequired??false}/>
    </div>
    <Field name="changeReason" label="Required audit reason" required/>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-xs leading-5 text-wxIndigo500">Publishing creates no candidate release by itself. Assessment delivery selects only active versions and records the exact version and checksum.</p><button disabled={state==="busy"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-spectrum px-5 font-bold text-white disabled:opacity-60">{editing?<Save className="h-4 w-4"/>:<Plus className="h-4 w-4"/>}{state==="busy"?"Saving...":editing?"Save question version":"Create draft"}</button></div>
    {message?<p role={state==="error"?"alert":"status"} className={`flex gap-2 rounded-md border p-3 text-sm ${state==="error"?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state==="error"?<AlertCircle className="h-5 w-5"/>:<CheckCircle2 className="h-5 w-5"/>}{message}</p>:null}
  </form>;
}

function Field({name,label,required=false,textarea=false,rows=4,type="text",initial=""}:{name:string;label:string;required?:boolean;textarea?:boolean;rows?:number;type?:string;initial?:string}){const classes="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/20";return <label className="text-sm font-bold text-wxIndigo900">{label}{textarea?<textarea name={name} required={required} rows={rows} defaultValue={initial} className={classes}/>:<input name={name} required={required} type={type} min={type==="number"?0:undefined} defaultValue={initial} className={classes}/>}</label>}
function Select({name,label,values,initial}:{name:string;label:string;values:string[];initial?:string}){return <label className="text-sm font-bold text-wxIndigo900">{label}<select name={name} defaultValue={initial} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm text-wxIndigo900">{values.map(value=><option key={value} value={value}>{name==="role"?hiringRoleLabel(value):value.replace(/_/g," ")}</option>)}</select></label>}
function Check({name,label,initial}:{name:string;label:string;initial:boolean}){return <label className="flex min-h-11 items-center gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-bold text-wxIndigo800"><input name={name} type="checkbox" defaultChecked={initial} className="h-4 w-4"/>{label}</label>}
