"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

type View="applications"|"assessments"|"interviews"|"talent"|"referrals"|"verification"|"retention"|"providers";

const stages=["application_received","eligibility_review","assessment_invited","assessment_started","assessment_submitted","under_review","shortlisted","interview_scheduled","interview_completed","selected","offer_released","joined","talent_pool","rejected","withdrawn","expired"];

export function HiringOperationsConsole({view,applicationReference,verificationType}:{view:View;applicationReference?:string;verificationType?:string}){
  const router=useRouter();
  const [state,setState]=useState<"idle"|"busy"|"success"|"error">("idle");
  const [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setState("busy");setMessage("");const form=new FormData(event.currentTarget);const raw=Object.fromEntries(form.entries());const payload=buildPayload(view,raw);try{const response=await fetch("/api/admin/hiring/operations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const json=await response.json();if(!response.ok)throw new Error(json?.error?.message||"The operation could not be completed.");setState("success");setMessage(json?.data?.notificationSent===false?"Saved, but the candidate email was not delivered.":"Operation completed and audited.");router.refresh();}catch(error){setState("error");setMessage(error instanceof Error?error.message:"The operation could not be completed.");}}
  const primaryAction:Record<View,string>={applications:"Save application action",assessments:"Save assessment action",interviews:"Save interview action",talent:"Save talent-pool action",referrals:"Save referral action",verification:"Submit verification decision",retention:"Save retention action",providers:"Save provider action"};
  return <form onSubmit={submit} className="grid gap-5 rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6"><div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-wxViolet700">Operational action</p><h2 className="mt-2 text-lg font-semibold text-wxIndigo900">{humanise(view)} controls</h2><p className="mt-1 text-sm leading-6 text-wxIndigo500">Choose one structured action, provide the required reason and review the impact before submitting.</p></div><div className="grid gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 md:grid-cols-2"><Field name="applicationReference" label="Application reference" placeholder="WX-HR-..." defaultValue={applicationReference} required/>{fieldsFor(view,verificationType)}</div><Field name="reason" label="Required reason and confirmation" placeholder="Explain why this action is appropriate and what evidence was reviewed" required textarea/><div className="flex flex-col gap-3 border-t border-wxBorder pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex max-w-2xl gap-2 text-xs leading-5 text-wxIndigo500"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/>This action is permission-checked and added to the hiring audit. Advisory signals never make a final candidate decision.</p><button disabled={state==="busy"} className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-semibold text-white disabled:opacity-60">{state==="busy"?<Loader2 className="h-4 w-4 animate-spin"/>:null}{state==="busy"?"Saving...":primaryAction[view]}</button></div>{message?<p role={state==="error"?"alert":"status"} className={`flex gap-2 rounded-md border p-3 text-sm ${state==="error"?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state==="error"?<AlertCircle className="h-5 w-5 shrink-0"/>:<CheckCircle2 className="h-5 w-5 shrink-0"/>}{message}</p>:null}</form>;
}

function fieldsFor(view:View,verificationType?:string):ReactNode{
  if(view==="applications")return <><Select name="action" label="Application action" options={["set_stage","assign","add_note","mark_duplicate","retry_notification"]}/><Select name="stage" label="New stage" options={stages}/><Select name="notificationType" label="Notification to retry" options={["internal_hiring_alert","application_acknowledgement"]} optional/><Field name="assignedAdminUserId" label="Reviewer account ID (assignment only)"/><Field name="duplicateOfReference" label="Original application reference (duplicates only)"/><Field name="note" label="Private reviewer note" textarea wide/></>;
  if(view==="assessments")return <><Select name="action" label="Operation" options={["invite","resend","remind","revoke","score"]}/><Field name="expiresInHours" label="Invitation expiry hours" type="number" defaultValue="72"/><Field name="humanScore" label="Human score" type="number"/><Field name="vivaScore" label="Viva score (optional)" type="number"/><Select name="recommendation" label="Recommendation" options={["advance","review","talent_pool","not_selected"]} optional/><Field name="notes" label="Review notes" textarea wide/><AssessmentAccommodationFields/></>;
  if(view==="interviews")return <><Select name="action" label="Operation" options={["schedule","reschedule","complete","cancel","no_show"]}/><Field name="interviewId" label="Interview UUID (after scheduling)"/><Select name="interviewType" label="Interview type" options={["screening","role_interview","viva","management","final"]} optional/><Field name="interviewerAdminUserId" label="Interviewer admin UUID"/><Field name="scheduledAt" label="Schedule" type="datetime-local"/><Field name="durationMinutes" label="Duration minutes" type="number" defaultValue="30"/><Select name="recommendation" label="Recommendation" options={["advance","hold","talent_pool","not_selected"]} optional/><fieldset className="grid gap-4 rounded-md border border-wxBorder p-4 md:col-span-2 sm:grid-cols-2"><legend className="px-1 text-sm font-bold text-wxIndigo900">Structured interview scorecard</legend><Field name="scoreCommunication" label="Communication score" type="number"/><Field name="scoreRoleKnowledge" label="Role knowledge score" type="number"/><Field name="scoreProblemSolving" label="Problem-solving score" type="number"/><Field name="scoreIntegrity" label="Integrity and judgement score" type="number"/></fieldset><Field name="notes" label="Structured notes" textarea wide/></>;
  if(view==="talent")return <><Select name="action" label="Operation" options={["add","update","remove","convert"]}/><Select name="category" label="Category" options={["ready_now","interview_ready","trainable","freelance_pool","future_hire","hold","rejected"]} optional/><Field name="skillTags" label="Skill tags (comma separated)"/><Field name="roleTags" label="Role tags (comma separated)"/><Field name="availability" label="Availability"/><Field name="reviewAt" label="Next review" type="datetime-local"/><Field name="notes" label="Talent-pool notes" textarea wide/></>;
  if(view==="referrals")return <><Select name="action" label="Operation" options={["save","mark_joined","mark_conflict"]}/><Field name="referralSource" label="Referral source" required/><Field name="referrerCode" label="Employee/referrer code" required/><Select name="joinedStatus" label="Joined status" options={["not_joined","joined","left"]} optional/><Select name="payoutStatus" label="Payout placeholder" options={["not_applicable","pending","eligible","paid","blocked"]} optional/><Select name="conflictStatus" label="Conflict status" options={["clear","review","duplicate","resolved"]} optional/><Field name="notes" label="Safe notes" textarea wide/></>;
  if(view==="verification")return <><Select name="action" label="Operation" options={["open_case","decide","request_clarification"]}/><Select name="verificationType" label="Verification type" options={["identity","aadhaar","education","background","employment","reference"]} defaultValue={verificationType}/><Select name="decision" label="Human decision" options={["approved_for_hiring","approved_with_conditions","additional_verification","candidate_clarification","return_to_reviewer","unable_to_verify","not_approved_for_hiring","reopened"]} optional/><Field name="method" label="Evidence/review method"/><Field name="conditions" label="Conditions (one per line)" textarea/><Field name="notes" label="Decision notes" textarea wide required/><VerificationDecisionEvidence/></>;
  if(view==="retention")return <><input type="hidden" name="action" value="set_retention"/><Select name="retentionCategory" label="Retention category" options={["active_candidate","selected","joined","rejected","withdrawn","expired","talent_pool","legal_hold","deletion_requested"]}/><Field name="reviewDueAt" label="Review due" type="datetime-local" required/></>;
  return <><Select name="resource" label="Provider operation" options={["hrms","trust_publish"]}/><Select name="action" label="Action" options={["retry","evaluate","approve","revoke"]}/></>;
}

function buildPayload(view:View,raw:Record<string,FormDataEntryValue>){
  const clean:Record<string,unknown>=Object.fromEntries(Object.entries(raw).filter(([,value])=>String(value).trim()!=="").map(([key,value])=>[key,String(value).trim()]));
  const numberFields=["expiresInHours","humanScore","vivaScore","durationMinutes","scoreCommunication","scoreRoleKnowledge","scoreProblemSolving","scoreIntegrity"];
  for(const key of numberFields)if(clean[key]!==undefined)clean[key]=Number(clean[key]);
  for(const key of ["scheduledAt","reviewAt","reviewDueAt"]){
    if(clean[key])clean[key]=new Date(String(clean[key])).toISOString();
  }
  if(clean.skillTags)clean.skillTags=String(clean.skillTags).split(",").map(v=>v.trim()).filter(Boolean);
  if(clean.roleTags)clean.roleTags=String(clean.roleTags).split(",").map(v=>v.trim()).filter(Boolean);
  if(clean.conditions)clean.conditions=String(clean.conditions).split("\n").map(v=>v.trim()).filter(Boolean);
  if(view==="assessments"){
    const accommodation={
      extraTimeMinutes:Number(raw.extraTimeMinutes||0),
      questionCopyAllowed:raw.questionCopyAllowed==="on",
      answerPasteAllowed:raw.answerPasteAllowed==="on",
      screenReaderMode:raw.screenReaderMode==="on",
      alternateAssessment:raw.alternateAssessment==="on",
      vivaHeavy:raw.vivaHeavy==="on",
      reason:String(raw.accommodationReason||"").trim()||undefined
    };
    clean.accommodation=accommodation;
    clean.backNavigationAllowed=raw.backNavigationAllowed==="on";
    delete clean.extraTimeMinutes;
    delete clean.questionCopyAllowed;
    delete clean.answerPasteAllowed;
    delete clean.screenReaderMode;
    delete clean.alternateAssessment;
    delete clean.vivaHeavy;
    delete clean.accommodationReason;
  }
  if(view==="interviews"){
    const scoreFields={
      communication:"scoreCommunication",
      role_knowledge:"scoreRoleKnowledge",
      problem_solving:"scoreProblemSolving",
      integrity_and_judgement:"scoreIntegrity"
    } as const;
    const scores=Object.fromEntries(Object.entries(scoreFields).flatMap(([competency,key])=>clean[key]===undefined?[]:[[competency,clean[key]]]));
    if(Object.keys(scores).length)clean.scores=scores;
    for(const key of Object.values(scoreFields))delete clean[key];
  }
  if(view==="verification"){
    const evidenceKeys=["consent","submitted_documents","verification_method","report_or_source","identity_match","candidate_clarification","discrepancies","reviewer_recommendation"];
    clean.evidenceReviewed=evidenceKeys.filter(key=>raw[`evidence_${key}`]==="on");
    clean.completionChecklist={
      consentRecorded:raw.check_consentRecorded==="on",
      identityReviewed:raw.check_identityReviewed==="on",
      educationReviewed:raw.check_educationReviewed==="on",
      backgroundMethodRecorded:raw.check_backgroundMethodRecorded==="on",
      reportOrSourceAvailable:raw.check_reportOrSourceAvailable==="on",
      identityMatchReviewed:raw.check_identityMatchReviewed==="on",
      clarificationReviewed:raw.check_clarificationReviewed==="on",
      discrepanciesDisplayed:raw.check_discrepanciesDisplayed==="on",
      reviewerRecommendationAvailable:raw.check_reviewerRecommendationAvailable==="on"
    };
    clean.explicitConfirmation=raw.explicitConfirmation==="on";
    for(const key of Object.keys(clean))if(key.startsWith("evidence_")||key.startsWith("check_"))delete clean[key];
  }
  if(view==="applications")clean.resource="application";
  else if(view==="assessments")clean.resource="assessment";
  else if(view==="interviews")clean.resource="interview";
  else if(view==="talent")clean.resource="talent_pool";
  else if(view==="referrals")clean.resource="referral";
  else if(view==="verification")clean.resource="verification";
  else if(view==="retention")clean.resource="application";
  return clean;
}

function Field({name,label,placeholder,type="text",required=false,textarea=false,wide=false,defaultValue}:{name:string;label:string;placeholder?:string;type?:string;required?:boolean;textarea?:boolean;wide?:boolean;defaultValue?:string}){const className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/20";return <label className={`text-sm font-semibold text-wxIndigo900 ${wide?"md:col-span-2":""}`}>{label}{textarea?<textarea name={name} required={required} placeholder={placeholder} rows={4} className={className}/>:<input name={name} required={required} placeholder={placeholder} type={type} defaultValue={defaultValue} className={className}/>}</label>}
function Select({name,label,options,optional=false,defaultValue}:{name:string;label:string;options:string[];optional?:boolean;defaultValue?:string}){return <label className="text-sm font-semibold text-wxIndigo900">{label}<select name={name} required={!optional} defaultValue={defaultValue} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/20">{optional?<option value="">Not set</option>:null}{options.map(option=><option key={option} value={option}>{humanise(option)}</option>)}</select></label>}

function humanise(value:string){return value.replace(/[_-]+/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());}

function VerificationDecisionEvidence(){
  const evidence=[["consent","Consent record"],["submitted_documents","Submitted documents"],["verification_method","Verification method"],["report_or_source","Report or source"],["identity_match","Identity match"],["candidate_clarification","Candidate clarification"],["discrepancies","Displayed discrepancies"],["reviewer_recommendation","Reviewer recommendation"]];
  const checklist=[["consentRecorded","Consent recorded"],["identityReviewed","Identity reviewed"],["educationReviewed","Education reviewed"],["backgroundMethodRecorded","Background method recorded"],["reportOrSourceAvailable","Report or source available"],["identityMatchReviewed","Identity match reviewed"],["clarificationReviewed","Clarification reviewed"],["discrepanciesDisplayed","Unresolved discrepancies displayed"],["reviewerRecommendationAvailable","Reviewer recommendation available"]];
  return <div className="grid gap-4 md:col-span-2"><fieldset className="rounded-md border border-wxBorder p-4"><legend className="px-1 text-sm font-bold text-wxIndigo900">Evidence reviewed</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{evidence.map(([key,label])=><label key={key} className="flex min-h-11 items-center gap-2 rounded-md bg-wxSurfaceSoft px-3 text-sm"><input type="checkbox" name={`evidence_${key}`}/>{label}</label>)}</div></fieldset><fieldset className="rounded-md border border-wxBorder p-4"><legend className="px-1 text-sm font-bold text-wxIndigo900">Decision completion checklist</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{checklist.map(([key,label])=><label key={key} className="flex min-h-11 items-center gap-2 rounded-md bg-wxSurfaceSoft px-3 text-sm"><input type="checkbox" name={`check_${key}`}/>{label}</label>)}</div></fieldset><label className="flex min-h-12 items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-950"><input type="checkbox" name="explicitConfirmation"/>I confirm this is a human decision based on the recorded evidence and displayed discrepancies.</label></div>;
}

function AssessmentAccommodationFields(){
  const options=[["questionCopyAllowed","Allow question copy"],["answerPasteAllowed","Allow answer paste"],["screenReaderMode","Screen-reader mode"],["alternateAssessment","Alternate assessment"],["vivaHeavy","Viva-heavy review"],["backNavigationAllowed","Allow back navigation"]];
  return <fieldset className="grid gap-3 rounded-md border border-wxBorder p-4 md:col-span-2"><legend className="px-1 text-sm font-bold text-wxIndigo900">Audited accessibility accommodation</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{options.map(([name,label])=><label key={name} className="flex min-h-11 items-center gap-2 rounded-md bg-wxSurfaceSoft px-3 text-sm"><input type="checkbox" name={name}/>{label}</label>)}</div><div className="grid gap-4 sm:grid-cols-[180px_1fr]"><Field name="extraTimeMinutes" label="Extra time minutes" type="number" defaultValue="0"/><Field name="accommodationReason" label="Accommodation reason"/></div></fieldset>;
}
