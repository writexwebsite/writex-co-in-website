import "server-only";

import { dbQuery, withDbTransaction } from "@/lib/db";
import { ApiError } from "@/lib/api/response";
import { decryptHiringReviewValue, encryptHiringReviewValue, hashHiringSignal } from "@/lib/hiring/candidate-disclosure";
import type { AssessmentIntegrityEventType } from "@/lib/hiring/domain";
import type { DeliveredAssessmentQuestion } from "@/lib/hiring/assessment-engine";
import { hashValue } from "@/lib/security";
import { sendInternalEmail } from "@/lib/notifications";
import { resolveAssessmentAccommodation, type AssessmentAccommodation } from "@/lib/hiring/accommodations";
import { generateSystemReviewForApplication } from "@/lib/hiring/system-review";

type SessionRow = {
  id: string;
  session_reference: string;
  state: "invited" | "started" | "submitted" | "expired" | "revoked";
  delivered_form: DeliveredAssessmentQuestion[];
  watermark_reference: string;
  expires_at: Date;
  duration_minutes: number;
  application_reference: string;
  application_id: string;
  pii_encrypted: string;
  accommodation: AssessmentAccommodation | Record<string, unknown>;
  back_navigation_allowed: boolean;
};

async function loadSession(token: string, lock = false) {
  const result = await dbQuery<SessionRow>(
    `select s.id, s.session_reference, s.state, s.delivered_form,
            s.watermark_reference, s.expires_at, a.duration_minutes,
            application.application_reference, application.id as application_id, application.pii_encrypted,
            s.accommodation,s.back_navigation_allowed
     from hiring_assessment_sessions s
     join hiring_assessments a on a.id=s.assessment_id
     join hiring_applications application on application.id=s.application_id
     where s.access_token_hash=$1
     limit 1 ${lock ? "for update" : ""}`,
    [hashValue(token)]
  );
  const session = result.rows[0];
  if (!session || ["revoked", "expired"].includes(session.state)) throw new ApiError(404, "NOT_FOUND", "Assessment session is unavailable.");
  if (session.expires_at.getTime() <= Date.now()) throw new ApiError(410, "NOT_FOUND", "Assessment session has expired.");
  return session;
}

export async function startAssessmentSession(token: string) {
  const session = await loadSession(token);
  if (session.state === "submitted") throw new ApiError(409, "BAD_REQUEST", "Assessment has already been submitted.");
  const accommodation = resolveAssessmentAccommodation(session.accommodation);
  if (session.state === "invited") {
    const allowedMinutes = session.duration_minutes + accommodation.extraTimeMinutes;
    const updated = await dbQuery<{ expires_at: Date }>(
      `update hiring_assessment_sessions
       set state='started',
           started_at=coalesce(started_at,now()),
           expires_at=least(expires_at,now()+($2||' minutes')::interval),
           updated_at=now()
       where id=$1 and state='invited'
       returning expires_at`,
      [session.id, String(allowedMinutes)]
    );
    if (updated.rows[0]) session.expires_at = updated.rows[0].expires_at;
  }
  return {
    reference: session.session_reference,
    applicationReference: session.application_reference,
    watermarkReference: session.watermark_reference,
    expiresAt: session.expires_at.toISOString(),
    durationMinutes: session.duration_minutes,
    questionCount: session.delivered_form.length,
    accommodation,
    backNavigationAllowed: session.back_navigation_allowed,
    questions: session.delivered_form.slice(0,1).map((question) => ({ ...question }))
  };
}

export async function releaseAssessmentQuestion({token,index}:{token:string;index:number}){
  const session=await loadSession(token);
  if(session.state!=="started")throw new ApiError(409,"BAD_REQUEST","This assessment is not open.");
  if(!Number.isInteger(index)||index<0||index>=session.delivered_form.length)throw new ApiError(400,"BAD_REQUEST","Question index is invalid.");
  if(index>0){const previous=session.delivered_form[index-1];const answer=await dbQuery<{id:string}>("select id from hiring_assessment_answers where session_id=$1 and question_id=$2 limit 1",[session.id,previous.questionId]);if(!answer.rows[0])throw new ApiError(409,"BAD_REQUEST","Save the current answer before continuing.");}
  await dbQuery("update hiring_assessment_sessions set current_question_index=greatest(current_question_index,$2),updated_at=now() where id=$1",[session.id,index]);
  return{question:{...session.delivered_form[index]},index,questionCount:session.delivered_form.length};
}

export async function saveAssessmentAnswer({ token, questionId, answer }: { token: string; questionId: string; answer: string }) {
  const session = await loadSession(token);
  if (session.state !== "started") throw new ApiError(409, "BAD_REQUEST", "This assessment is not open for answers.");
  const delivered = session.delivered_form.find((question) => question.questionId === questionId);
  if (!delivered) throw new ApiError(403, "FORBIDDEN", "Question does not belong to this assessment.");
  const result = await dbQuery<{ id: string }>(
    `insert into hiring_assessment_answers (
       session_id, question_id, question_version, answer_encrypted
     ) values ($1,$2,$3,$4)
     on conflict (session_id,question_id) do update set
       answer_encrypted=excluded.answer_encrypted,
       question_version=excluded.question_version,
       revision_count=hiring_assessment_answers.revision_count+1,
       last_saved_at=now()
     where hiring_assessment_answers.locked_at is null
     returning id`,
    [session.id, questionId, delivered.version, encryptHiringReviewValue(answer)]
  );
  if (!result.rows[0]) throw new ApiError(409, "BAD_REQUEST", "This answer is locked.");
  return { saved: true, savedAt: new Date().toISOString() };
}

export async function recordAssessmentIntegrityEvent({ token, eventType, metadata }: { token: string; eventType: AssessmentIntegrityEventType; metadata?: Record<string, string | number | boolean | null> }) {
  const session = await loadSession(token);
  const safeMetadata = Object.fromEntries(Object.entries(metadata ?? {}).filter(([key]) => ["questionId", "durationMs", "characterCount", "attemptCount", "visibilityState"].includes(key)));
  await dbQuery(
    `insert into hiring_assessment_integrity_events (
       session_id,event_type,severity,safe_metadata
     ) values ($1,$2,'advisory',$3::jsonb)`,
    [session.id, eventType, JSON.stringify(safeMetadata)]
  );
  return { recorded: true };
}

export async function submitAssessmentSession(token: string) {
  const completed=await withDbTransaction(async (query) => {
    const sessions = await query<SessionRow>(
      `select s.id,s.session_reference,s.state,s.delivered_form,
              s.watermark_reference,s.expires_at,a.duration_minutes,
              application.application_reference, application.id as application_id, application.pii_encrypted,
              s.accommodation,s.back_navigation_allowed
       from hiring_assessment_sessions s
       join hiring_assessments a on a.id=s.assessment_id
       join hiring_applications application on application.id=s.application_id
       where s.access_token_hash=$1 for update`,
      [hashValue(token)]
    );
    const session=sessions[0];
    if(!session||session.state!=="started") throw new ApiError(409,"BAD_REQUEST","Assessment cannot be submitted.");
    const answers=await query<{question_id:string}>("select question_id from hiring_assessment_answers where session_id=$1",[session.id]);
    if(answers.length<session.delivered_form.length) throw new ApiError(400,"BAD_REQUEST","Answer every released question before submitting.");
    await query("update hiring_assessment_answers set submitted_at=now(),locked_at=now() where session_id=$1",[session.id]);
    await query("update hiring_assessment_sessions set state='submitted',submitted_at=now(),locked_at=now() where id=$1",[session.id]);
    await query("update hiring_applications set current_stage='assessment_submitted' where application_reference=$1",[session.application_reference]);
    return { submitted:true, reference:session.session_reference, applicationId:session.application_id, piiEncrypted:session.pii_encrypted };
  });
  try{const pii=JSON.parse(decryptHiringReviewValue(completed.piiEncrypted)||"{}")as{fullName?:string;email?:string};if(pii.email){const result=await sendInternalEmail({to:pii.email,subject:"WriteX assessment received",text:[`Hello ${pii.fullName||"Candidate"},`,"","Your assessment has been submitted and locked for human review.",`Assessment reference: ${completed.reference}`,"","WriteX Smart Hiring"].join("\n")});await dbQuery(`insert into hiring_notifications(application_id,notification_type,recipient_hash,provider,provider_message_reference,status,safe_failure_reason,sent_at) values($1,'assessment_completion',$2,$3,$4,$5,$6,$7)`,[completed.applicationId,hashHiringSignal("notification_recipient",pii.email.toLowerCase()),result.provider||null,result.messageId||null,result.sent?"sent":"failed",result.sent?null:(result.reason||`provider_status_${result.status||"unknown"}`),result.sent?new Date():null]);}}catch{/* Submission remains valid if notification delivery fails. */}
  try{
    await generateSystemReviewForApplication(completed.applicationId,"Automatic review after assessment submission");
  }catch(error){
    console.error("System Review generation failed after a valid assessment submission",{
      applicationId:completed.applicationId,
      assessmentReference:completed.reference,
      error:error instanceof Error?error.message:"unknown"
    });
  }
  return{submitted:true,reference:completed.reference};
}
