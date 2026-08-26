import "server-only";

import { ApiError } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { generateAssessmentForm, type AssessmentQuestionVersion } from "@/lib/hiring/assessment-engine";
import { decryptHiringReviewValue, encryptHiringReviewValue, hashHiringSignal } from "@/lib/hiring/candidate-disclosure";
import { hiringStages } from "@/lib/hiring/domain";
import { buildEligibilityRules, calculateEligibility } from "@/lib/hiring/eligibility";
import type { HiringOperation } from "@/lib/hiring/operations-schema";
import { sendInternalEmail } from "@/lib/notifications";
import { hashValue, randomToken } from "@/lib/security";
import { retryNewApplicationNotification } from "@/lib/hiring/application-notifications";
import { generateSystemReviewForApplication } from "@/lib/hiring/system-review";

async function applicationByReference(reference: string) {
  const result = await dbQuery<{ id: string; candidate_id: string; role_key: "academic_writer"|"sales_executive"; current_stage: string; pii_encrypted: string }>(
    "select id,candidate_id,role_key,current_stage,pii_encrypted from hiring_applications where application_reference=$1 limit 1",
    [reference.trim().toUpperCase()]
  );
  if (!result.rows[0]) throw new ApiError(404,"NOT_FOUND","Application was not found.");
  return result.rows[0];
}

const manualStageTransitions: Record<string, readonly string[]> = {
  application_received: ["eligibility_review", "withdrawn"],
  eligibility_review: ["assessment_invited", "rejected", "withdrawn"],
  assessment_invited: ["eligibility_review", "expired", "withdrawn"],
  assessment_started: ["assessment_submitted", "expired", "withdrawn"],
  assessment_submitted: ["under_review", "withdrawn"],
  under_review: ["eligibility_review", "shortlisted", "talent_pool", "rejected", "withdrawn"],
  shortlisted: ["interview_scheduled", "talent_pool", "rejected", "withdrawn"],
  interview_scheduled: ["shortlisted", "interview_completed", "withdrawn"],
  interview_completed: ["selected", "talent_pool", "rejected", "withdrawn"],
  selected: ["offer_released", "talent_pool", "rejected", "withdrawn"],
  offer_released: ["joined", "selected", "withdrawn"],
  talent_pool: ["eligibility_review", "withdrawn"],
  rejected: ["talent_pool"],
  expired: ["eligibility_review", "withdrawn"],
  withdrawn: [],
  joined: []
};

function assertManualStageTransition(from: string, to: string) {
  const allowed = manualStageTransitions[from] || [];
  if (allowed.includes(to)) return;
  if (allowed.length === 0) {
    throw new ApiError(409, "BAD_REQUEST", `The ${from.replaceAll("_", " ")} stage is complete and cannot be changed from this control.`);
  }
  throw new ApiError(
    409,
    "BAD_REQUEST",
    `Cannot move from ${from.replaceAll("_", " ")} to ${to.replaceAll("_", " ")}. Complete the required next action first. Allowed next stages: ${allowed.map((stage) => stage.replaceAll("_", " ")).join(", ")}.`
  );
}

async function audit(applicationId: string, adminUserId: string, action: string, entityType: string, entityReference: string, metadata: Record<string, unknown> = {}) {
  await dbQuery(
    `insert into hiring_audit_logs(application_id,actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
     values($1,'admin',$2,$3,$4,$5,$6::jsonb)`,
    [applicationId,adminUserId,action,entityType,entityReference,JSON.stringify(metadata)]
  );
}

function decodeCandidatePii(encrypted: string) {
  try {
    return JSON.parse(decryptHiringReviewValue(encrypted) || "{}") as { fullName?: string; email?: string; mobile?: string };
  } catch {
    throw new ApiError(500,"SERVER_ERROR","Candidate contact data could not be read safely.");
  }
}

async function recordNotification(applicationId: string, notificationType: string, recipient: string, result: {sent:boolean;provider?:string;messageId?:string;reason?:string;status?:number}) {
  await dbQuery(
    `insert into hiring_notifications(application_id,notification_type,recipient_hash,provider,provider_message_reference,status,safe_failure_reason,sent_at)
     values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [applicationId,notificationType,hashHiringSignal("notification_recipient",recipient.toLowerCase()),result.provider||null,result.messageId||null,result.sent?"sent":"failed",result.sent?null:(result.reason||`provider_status_${result.status||"unknown"}`),result.sent?new Date():null]
  );
}

async function notifyCandidate(application:{id:string;pii_encrypted:string},notificationType:string,subject:string,lines:string[]){const pii=decodeCandidatePii(application.pii_encrypted);if(!pii.email)return false;const result=await sendInternalEmail({to:pii.email,subject,text:[`Hello ${pii.fullName||"Candidate"},`,"",...lines,"",`WriteX Smart Hiring`].join("\n")});await recordNotification(application.id,notificationType,pii.email,result);return result.sent;}

async function notifyHiringTeam(applicationId:string,notificationType:string,subject:string,lines:string[]){
  const recipient=process.env.HIRING_NOTIFICATION_EMAIL||process.env.SUPPORT_EMAIL;
  if(!recipient)return false;
  const result=await sendInternalEmail({to:recipient,subject,text:[...lines,"","WriteX Smart Hiring"].join("\n")});
  await recordNotification(applicationId,notificationType,recipient,result);
  return result.sent;
}

export async function runApplicationOperation(input: Extract<HiringOperation,{resource:"application"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  if(input.action==="retry_notification"){
    if(!input.notificationType)throw new ApiError(400,"BAD_REQUEST","Choose the notification to retry.");
    const pii=decodeCandidatePii(application.pii_encrypted);
    if(!pii.email)throw new ApiError(409,"BAD_REQUEST","Candidate email is unavailable.");
    const result=await retryNewApplicationNotification({
      applicationId:application.id,
      applicationReference:input.applicationReference,
      candidateName:pii.fullName||"Candidate",
      candidateEmail:pii.email,
      role:application.role_key,
      submittedAt:new Date().toISOString(),
      correlationId:randomToken(18)
    },input.notificationType);
    await audit(application.id,adminUserId,"application_notification_retry_requested","hiring_notification",input.notificationType,{status:result.status,reason:input.reason});
    return{ok:true,notificationSent:result.status==="sent",notificationStatus:result.status};
  }
  if(input.action==="assign"){
    await dbQuery("update hiring_applications set assigned_admin_user_id=$2,updated_at=now() where id=$1",[application.id,input.assignedAdminUserId||null]);
    await audit(application.id,adminUserId,"application_assignment_changed","application",input.applicationReference,{assigned:Boolean(input.assignedAdminUserId),reason:input.reason});
  } else if(input.action==="add_note"){
    if(!input.note)throw new ApiError(400,"BAD_REQUEST","A note is required.");
    await dbQuery("insert into hiring_application_notes(application_id,note_encrypted,created_by_admin_user_id) values($1,$2,$3)",[application.id,encryptHiringReviewValue(input.note),adminUserId]);
    await audit(application.id,adminUserId,"application_note_added","application",input.applicationReference,{reason:input.reason});
  } else if(input.action==="mark_duplicate"){
    if(!input.duplicateOfReference)throw new ApiError(400,"BAD_REQUEST","The original application reference is required.");
    const original=await applicationByReference(input.duplicateOfReference);
    if(original.id===application.id)throw new ApiError(400,"BAD_REQUEST","An application cannot duplicate itself.");
    await dbQuery("update hiring_applications set duplicate_of_application_id=$2,override_reason=$3,updated_at=now() where id=$1",[application.id,original.id,input.reason]);
    await audit(application.id,adminUserId,"application_duplicate_linked","application",input.applicationReference,{originalReference:input.duplicateOfReference,reason:input.reason});
  } else if(input.action==="set_retention"){
    if(!input.retentionCategory||!input.reviewDueAt)throw new ApiError(400,"BAD_REQUEST","Retention category and review date are required.");
    const legalHold=input.retentionCategory==="legal_hold";
    await dbQuery(`update hiring_applications set retention_state=$2,retention_review_at=$3,legal_hold=$4,updated_at=now() where id=$1`,[application.id,input.retentionCategory,new Date(input.reviewDueAt),legalHold]);
    await dbQuery(`insert into hiring_retention_queue(application_id,retention_category,review_due_at,legal_hold,status,safe_notes)
      values($1,$2,$3,$4,$5,$6) on conflict(application_id) do update set retention_category=excluded.retention_category,review_due_at=excluded.review_due_at,legal_hold=excluded.legal_hold,status=excluded.status,safe_notes=excluded.safe_notes,updated_at=now()`,[application.id,input.retentionCategory,new Date(input.reviewDueAt),legalHold,legalHold?"blocked_by_legal_hold":input.retentionCategory==="deletion_requested"?"deletion_pending":"scheduled",input.reason]);
    await audit(application.id,adminUserId,"retention_updated","retention",input.applicationReference,{category:input.retentionCategory,legalHold,reason:input.reason});
  } else {
    if(!input.stage)throw new ApiError(400,"BAD_REQUEST","A destination stage is required.");
    const destinationStage=input.stage;
    if(["offer_released","joined"].includes(destinationStage))await assertOfferGate(application.id);
    const stageChange=await withDbTransaction(async query=>{
      await query("select pg_advisory_xact_lock(hashtext($1))",[`hiring-stage:${application.id}`]);
      const locked=await query<{current_stage:string}>("select current_stage from hiring_applications where id=$1 for update",[application.id]);
      const currentStage=locked[0]?.current_stage;
      if(!currentStage)throw new ApiError(404,"NOT_FOUND","Application was not found.");
      if(currentStage===destinationStage)return {idempotent:true,previousStage:currentStage};
      if(currentStage!==application.current_stage){
        throw new ApiError(409,"BAD_REQUEST","This candidate was updated in another session. Refresh the workspace; the latest stage has been preserved.");
      }
      assertManualStageTransition(currentStage,destinationStage);
      await query("update hiring_applications set current_stage=$2,override_reason=$3,updated_at=now() where id=$1",[application.id,destinationStage,input.reason]);
      await query("insert into hiring_application_status_history(application_id,previous_stage,new_stage,changed_by_type,changed_by_admin_user_id,reason) values($1,$2,$3,'admin',$4,$5)",[application.id,currentStage,destinationStage,adminUserId,input.reason]);
      return {idempotent:false,previousStage:currentStage};
    });
    if(stageChange.idempotent)return {ok:true,idempotent:true};
    await audit(application.id,adminUserId,"application_stage_changed","application",input.applicationReference,{from:stageChange.previousStage,to:destinationStage,reason:input.reason,automatic:false});
    const notices:Partial<Record<(typeof hiringStages)[number],{type:string;subject:string;lines:string[]}>>={selected:{type:"selection_notice",subject:"WriteX application update",lines:["Your application has progressed to the selected stage. The hiring team will share the approved next step separately."]},rejected:{type:"rejection_notice",subject:"WriteX application update",lines:["After human review, we are unable to progress your application at this time. Thank you for the time you invested in the process."]},talent_pool:{type:"talent_pool_notice",subject:"WriteX talent-pool update",lines:["Your profile has been placed in the WriteX talent pool for a future role review, subject to the applicable retention period and your consent."]},withdrawn:{type:"withdrawal_acknowledgement",subject:"WriteX application withdrawn",lines:["Your application withdrawal has been recorded. Eligible retention or deletion requests continue through the privacy process."]}};
    const notice=notices[destinationStage];if(notice)await notifyCandidate(application,notice.type,notice.subject,[...notice.lines,`Application reference: ${input.applicationReference}`]);
  }
  return {ok:true};
}

export async function runEligibilityOperation(
  input: Extract<HiringOperation, { resource: "eligibility" }>,
  adminUserId: string
) {
  const application = await applicationByReference(input.applicationReference);
  const rules = buildEligibilityRules(application.role_key, input.checks);
  const advisory = calculateEligibility(application.role_key, rules);

  await withDbTransaction(async (query) => {
    await query(
      `insert into hiring_eligibility_reviews(
         application_id,role_key,rules,automated_score,system_outcome,
         reviewer_outcome,reviewer_notes,review_reason,reviewed_by_admin_user_id,reviewed_at
       ) values($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,now())
       on conflict(application_id) do update set
         role_key=excluded.role_key,
         rules=excluded.rules,
         automated_score=excluded.automated_score,
         system_outcome=excluded.system_outcome,
         reviewer_outcome=excluded.reviewer_outcome,
         reviewer_notes=excluded.reviewer_notes,
         review_reason=excluded.review_reason,
         reviewed_by_admin_user_id=excluded.reviewed_by_admin_user_id,
         reviewed_at=now(),
         updated_at=now()`,
      [
        application.id,
        application.role_key,
        JSON.stringify(rules),
        advisory.automatedScore,
        advisory.outcome,
        input.reviewerOutcome,
        input.notes,
        input.reason,
        adminUserId
      ]
    );
    if (application.current_stage === "application_received") {
      await query(
        `update hiring_applications
         set current_stage='eligibility_review',updated_at=now()
         where id=$1`,
        [application.id]
      );
      await query(
        `insert into hiring_application_status_history(
           application_id,previous_stage,new_stage,changed_by_type,
           changed_by_admin_user_id,reason,notes
         ) values($1,'application_received','eligibility_review','admin',$2,$3,$4)`,
        [application.id, adminUserId, input.reason, input.notes]
      );
    }
    return true;
  });

  await audit(
    application.id,
    adminUserId,
    "eligibility_review_recorded",
    "eligibility_review",
    input.applicationReference,
    {
      automatedScore: advisory.automatedScore,
      systemOutcome: advisory.outcome,
      reviewerOutcome: input.reviewerOutcome,
      automaticRejection: false,
      reason: input.reason
    }
  );

  return {
    ok: true,
    automatedScore: advisory.automatedScore,
    systemOutcome: advisory.outcome,
    reviewerOutcome: input.reviewerOutcome,
    automaticRejection: false
  };
}

async function assertOfferGate(applicationId: string) {
  const result=await dbQuery<{verification_type:string;final_clearance_status:string|null}>("select verification_type,final_clearance_status from hiring_verification_cases where application_id=$1 and verification_type in ('identity','education','background')",[applicationId]);
  const approved=new Set(result.rows.filter(row=>["approved_for_hiring","approved_with_conditions"].includes(row.final_clearance_status||"")).map(row=>row.verification_type));
  const missing=["identity","education","background"].filter(type=>!approved.has(type));
  if(missing.length)throw new ApiError(409,"BAD_REQUEST",`Hiring approval is blocked until these reviews are complete: ${missing.join(", ")}.`);
}

async function questionsForRole(role: "academic_writer"|"sales_executive") {
  const result=await dbQuery<{id:string;version:number;role_key:"academic_writer"|"sales_executive";title:string;category:string;section:string;difficulty:"foundation"|"intermediate"|"advanced";prompt:string;instructions:string|null;source_material:string|null;answer_type:string;expected_time_minutes:number;maximum_score:string;required:boolean;randomization_eligible:boolean;back_navigation_rule:string;human_review_required:boolean;anti_cheat_sensitivity:string;viva_follow_up_required:boolean;display_order:number;content_hash:string;protected:boolean;active:boolean;variants:string[]}>(
    `select distinct on(stable_question_id) id,version,role_key,title,category,section,difficulty,
       prompt,instructions,source_material,answer_type,expected_time_minutes,maximum_score::text,
       required,randomization_eligible,back_navigation_rule,human_review_required,
       anti_cheat_sensitivity,viva_follow_up_required,display_order,content_hash,protected,active,variants
     from hiring_assessment_questions where role_key=$1 and active=true and lifecycle_status='active' and archived_at is null
     order by stable_question_id,version desc`,[role]
  );
  return result.rows.map(row=>({id:row.id,version:row.version,role:row.role_key,title:row.title,category:row.category,section:row.section,difficulty:row.difficulty,prompt:row.prompt,instructions:row.instructions||"",sourceMaterial:row.source_material||"",answerType:row.answer_type,expectedTimeMinutes:row.expected_time_minutes,maximumScore:Number(row.maximum_score),required:row.required,randomizationEligible:row.randomization_eligible,backNavigationRule:row.back_navigation_rule,humanReviewRequired:row.human_review_required,antiCheatSensitivity:row.anti_cheat_sensitivity,vivaFollowUpRequired:row.viva_follow_up_required,displayOrder:row.display_order,contentHash:row.content_hash,protected:row.protected,active:row.active,variants:row.variants}) satisfies AssessmentQuestionVersion);
}

export async function runAssessmentOperation(input: Extract<HiringOperation,{resource:"assessment"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  if(input.action==="score"){
    if(input.humanScore===undefined||!input.recommendation)throw new ApiError(400,"BAD_REQUEST","Human score and recommendation are required.");
    const sessions=await dbQuery<{id:string}>("select id from hiring_assessment_sessions where application_id=$1 and state='submitted' order by submitted_at desc limit 1",[application.id]);
    if(!sessions.rows[0])throw new ApiError(409,"BAD_REQUEST","A submitted assessment is required.");
    const combined=input.vivaScore===undefined?input.humanScore:Number((input.humanScore*0.75+input.vivaScore*0.25).toFixed(2));
    await dbQuery(`insert into hiring_assessment_scores(session_id,human_score,combined_score,score_breakdown,reviewer_notes,recommendation,scored_by_admin_user_id,scored_at)
      values($1,$2,$3,$4::jsonb,$5,$6,$7,now()) on conflict(session_id) do update set human_score=excluded.human_score,combined_score=excluded.combined_score,score_breakdown=excluded.score_breakdown,reviewer_notes=excluded.reviewer_notes,recommendation=excluded.recommendation,scored_by_admin_user_id=excluded.scored_by_admin_user_id,scored_at=now(),updated_at=now()`,[sessions.rows[0].id,input.humanScore,combined,JSON.stringify({human:input.humanScore,viva:input.vivaScore??null}),input.notes||null,input.recommendation,adminUserId]);
    await audit(application.id,adminUserId,"assessment_scored","assessment",input.applicationReference,{recommendation:input.recommendation,combinedScore:combined,humanReview:true,reason:input.reason});
    return {ok:true,combinedScore:combined};
  }
  if(input.action==="revoke"){
    await dbQuery("update hiring_assessment_sessions set state='revoked',revoked_at=now(),revoked_reason=$2,locked_at=coalesce(locked_at,now()),updated_at=now() where application_id=$1 and state in ('invited','started')",[application.id,input.reason]);
    await audit(application.id,adminUserId,"assessment_revoked","assessment",input.applicationReference,{reason:input.reason});
    return {ok:true};
  }
  const assessment=await dbQuery<{id:string;duration_minutes:number}>("select id,duration_minutes from hiring_assessments where role_key=$1 and active=true order by version desc limit 1",[application.role_key]);
  if(!assessment.rows[0])throw new ApiError(409,"BAD_REQUEST","No active assessment is configured for this role.");
  const questions=await questionsForRole(application.role_key);
  if(!questions.length)throw new ApiError(409,"BAD_REQUEST","No active assessment questions are configured.");
  const token=randomToken(36); const sessionReference=`WX-AS-${crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase()}`;
  const delivered=generateAssessmentForm({role:application.role_key,questions});
  const expiresInHours=input.expiresInHours||72;
  await withDbTransaction(async query=>{
    await query("update hiring_assessment_sessions set state='revoked',revoked_at=now(),revoked_reason='Superseded by a new invitation',locked_at=coalesce(locked_at,now()),updated_at=now() where application_id=$1 and state in ('invited','started')",[application.id]);
    await query(`insert into hiring_assessment_sessions(application_id,assessment_id,session_reference,access_token_hash,delivered_form,watermark_reference,state,expires_at,invitation_sent_at,accommodation,back_navigation_allowed)
      values($1,$2,$3,$4,$5::jsonb,$6,'invited',now()+($7||' hours')::interval,now(),$8::jsonb,$9)`,[application.id,assessment.rows[0].id,sessionReference,hashValue(token),JSON.stringify(delivered),`${input.applicationReference}-${sessionReference}`,String(expiresInHours),JSON.stringify(input.accommodation||{}),input.backNavigationAllowed===true]);
    await query("update hiring_applications set current_stage='assessment_invited',updated_at=now() where id=$1",[application.id]);
    await query("insert into hiring_application_status_history(application_id,previous_stage,new_stage,changed_by_type,changed_by_admin_user_id,reason) values($1,$2,'assessment_invited','admin',$3,$4)",[application.id,application.current_stage,adminUserId,input.reason]);
    return true;
  });
  const pii=decodeCandidatePii(application.pii_encrypted);
  if(!pii.email)throw new ApiError(500,"SERVER_ERROR","Candidate email is unavailable.");
  const baseUrl=process.env.NEXT_PUBLIC_SITE_URL||"https://www.writex.co.in";
  const reminder=input.action==="remind";
  const result=await sendInternalEmail({to:pii.email,subject:reminder?"WriteX assessment reminder":"WriteX assessment invitation",text:[`Hello ${pii.fullName||"Candidate"},`,"",reminder?"This is a reminder to complete your WriteX assessment using the replacement secure link below.":"Your WriteX assessment is ready:",`${baseUrl}/careers/assessment/${token}`,`This private link expires in ${expiresInHours} hours and replaces any earlier invitation.`,"",`Reference: ${sessionReference}`].join("\n")});
  const notificationType=reminder?"assessment_reminder":input.action==="resend"?"assessment_invitation_resent":"assessment_invitation";
  await recordNotification(application.id,notificationType,pii.email,result);
  await audit(application.id,adminUserId,notificationType,"assessment",sessionReference,{questionCount:delivered.length,expiresInHours,reason:input.reason,accommodation:input.accommodation||{},backNavigationAllowed:input.backNavigationAllowed===true});
  return {ok:true,sessionReference,notificationSent:result.sent};
}

export async function runSystemReviewOperation(
  input: Extract<HiringOperation,{resource:"system_review"}>,
  adminUserId:string
) {
  const application=await applicationByReference(input.applicationReference);
  const review=await generateSystemReviewForApplication(application.id,input.reason);
  await audit(application.id,adminUserId,"system_review_recalculated","system_review",review.id,{
    version:review.version,recommendation:review.recommendation,reason:input.reason
  });
  return {ok:true,review};
}

export async function runAdminReviewOperation(
  input: Extract<HiringOperation,{resource:"admin_review"}>,
  adminUserId:string
) {
  const application=await applicationByReference(input.applicationReference);
  const systemResult=await dbQuery<{id:string;recommendation:string;review_version:number}>(
    "select id,recommendation,review_version from hiring_system_reviews where application_id=$1 and superseded_at is null limit 1",
    [application.id]
  );
  const systemReview=systemResult.rows[0];
  if(!systemReview)throw new ApiError(409,"BAD_REQUEST","Complete System Review before recording Admin Review.");
  const expectedDecision=systemReview.recommendation==="recommended_accept"?"accept":systemReview.recommendation==="recommended_reject"?"reject":null;
  if(input.recommendationAction==="confirm"&&(!expectedDecision||input.decision!==expectedDecision)){
    throw new ApiError(409,"BAD_REQUEST","The Admin decision does not confirm the current System Review. Choose Override and provide a reason.");
  }
  if(input.recommendationAction==="independent"&&systemReview.recommendation!=="manual_review_required"){
    throw new ApiError(409,"BAD_REQUEST","Use Confirm or Override when System Review has a recommendation.");
  }
  const overrideStatus=input.recommendationAction==="override"?"overridden":input.recommendationAction==="confirm"?"confirmed":"not_applicable";
  const result=await withDbTransaction(async query=>{
    await query("select pg_advisory_xact_lock(hashtext($1))",[`hiring-admin-review:${application.id}`]);
    await query("update hiring_admin_reviews set superseded_at=now() where application_id=$1 and superseded_at is null",[application.id]);
    const inserted=await query<{id:string}>(
      `insert into hiring_admin_reviews(
         application_id,system_review_id,decision,admin_score,structured_notes,notes,
         recommendation_action,override_status,override_reason,reviewed_by_admin_user_id
       ) values($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10) returning id`,
      [application.id,systemReview.id,input.decision,input.adminScore??null,JSON.stringify(input.structuredNotes||{}),input.notes||null,input.recommendationAction,overrideStatus,input.overrideReason||null,adminUserId]
    );
    const nextStage=["accept","request_viva"].includes(input.decision)
      ? "shortlisted"
      : input.decision==="request_reassessment"
        ? "eligibility_review"
        : "under_review";
    if(application.current_stage!==nextStage){
      await query("update hiring_applications set current_stage=$2,updated_at=now() where id=$1",[application.id,nextStage]);
      await query(
        `insert into hiring_application_status_history(application_id,previous_stage,new_stage,changed_by_type,changed_by_admin_user_id,reason)
         values($1,$2,$3,'admin',$4,$5)`,
        [application.id,application.current_stage,nextStage,adminUserId,input.reason]
      );
    }
    return {id:inserted[0].id,nextStage};
  });
  await audit(application.id,adminUserId,"admin_review_recorded","admin_review",result.id,{
    decision:input.decision,recommendationAction:input.recommendationAction,overrideStatus,
    systemReviewVersion:systemReview.review_version,reason:input.reason
  });
  return {ok:true,id:result.id,decision:input.decision,nextStage:result.nextStage,overrideStatus};
}

export async function runFinalDecisionOperation(
  input: Extract<HiringOperation,{resource:"final_decision"}>,
  adminUserId:string
) {
  const application=await applicationByReference(input.applicationReference);
  const adminReviewResult=await dbQuery<{id:string;decision:string}>(
    "select id,decision from hiring_admin_reviews where application_id=$1 and superseded_at is null limit 1",
    [application.id]
  );
  const adminReview=adminReviewResult.rows[0];
  if(!adminReview)throw new ApiError(409,"BAD_REQUEST","Complete Admin Review before recording the Final Decision.");
  if(
    ["accept","request_viva"].includes(adminReview.decision)
    && application.current_stage!=="interview_completed"
  ){
    throw new ApiError(409,"BAD_REQUEST","Complete the required Viva or interview before recording the Final Decision.");
  }
  if(input.outcome==="offer_released")await assertOfferGate(application.id);
  const nextStage=input.outcome==="hold"?"under_review":input.outcome;
  const result=await withDbTransaction(async query=>{
    await query("select pg_advisory_xact_lock(hashtext($1))",[`hiring-final-decision:${application.id}`]);
    const existing=await query<{id:string;outcome:string;reason:string}>(
      "select id,outcome,reason from hiring_final_decisions where application_id=$1 and superseded_at is null limit 1",
      [application.id]
    );
    if(existing[0]?.outcome===input.outcome&&existing[0]?.reason===input.reason){
      return {id:existing[0].id,idempotent:true};
    }
    await query("update hiring_final_decisions set superseded_at=now() where application_id=$1 and superseded_at is null",[application.id]);
    const inserted=await query<{id:string}>(
      `insert into hiring_final_decisions(application_id,admin_review_id,outcome,reason,decided_by_admin_user_id)
       values($1,$2,$3,$4,$5) returning id`,
      [application.id,adminReview.id,input.outcome,input.reason,adminUserId]
    );
    if(application.current_stage!==nextStage){
      await query("update hiring_applications set current_stage=$2,updated_at=now() where id=$1",[application.id,nextStage]);
      await query(
        `insert into hiring_application_status_history(application_id,previous_stage,new_stage,changed_by_type,changed_by_admin_user_id,reason)
         values($1,$2,$3,'admin',$4,$5)`,
        [application.id,application.current_stage,nextStage,adminUserId,input.reason]
      );
    }
    return {id:inserted[0].id,idempotent:false};
  });
  if(result.idempotent)return {ok:true,id:result.id,outcome:input.outcome,nextStage,idempotent:true};
  await audit(application.id,adminUserId,"final_hiring_decision_recorded","final_decision",result.id,{
    outcome:input.outcome,adminReviewDecision:adminReview.decision,explicitConfirmation:true
  });
  if(["selected","rejected","talent_pool"].includes(input.outcome)){
    const copy=input.outcome==="selected"
      ?["Your application has progressed to the selected stage. The hiring team will share the approved next step separately."]
      :input.outcome==="talent_pool"
        ?["Your profile has been placed in the WriteX talent pool for a future role review, subject to your consent and the applicable retention period."]
        :["After human review, we are unable to progress your application at this time. Thank you for the time you invested in the process."];
    await notifyCandidate(application,`${input.outcome}_decision_notice`,"WriteX application update",[...copy,`Application reference: ${input.applicationReference}`]);
  }
  return {ok:true,id:result.id,outcome:input.outcome,nextStage};
}

export async function runIntegrityReviewOperation(
  input: Extract<HiringOperation, { resource: "integrity_review" }>,
  adminUserId: string
) {
  const session = await dbQuery<{ id: string; application_id: string }>(
    `select id,application_id
     from hiring_assessment_sessions
     where session_reference=$1
     limit 1`,
    [input.sessionReference.trim().toUpperCase()]
  );
  const row = session.rows[0];
  if (!row) throw new ApiError(404, "NOT_FOUND", "Assessment session was not found.");

  const reviewed = await withDbTransaction(async (query) => {
    const events = await query<{ id: string }>(
      `update hiring_assessment_integrity_events
       set reviewed_at=now(),reviewed_by_admin_user_id=$2,review_outcome=$3
       where session_id=$1 and reviewed_at is null
       returning id`,
      [row.id, adminUserId, input.outcome]
    );
    await query(
      `insert into hiring_audit_logs(
         application_id,actor_type,actor_reference,action,entity_type,
         entity_reference,safe_metadata
       ) values($1,'admin',$2,'assessment_integrity_reviewed','assessment',$3,$4::jsonb)`,
      [
        row.application_id,
        adminUserId,
        input.sessionReference,
        JSON.stringify({
          outcome: input.outcome,
          eventCount: events.length,
          reason: input.reason,
          notes: input.notes,
          automaticDecision: false
        })
      ]
    );
    return events.length;
  });

  return {
    ok: true,
    reviewedEvents: reviewed,
    outcome: input.outcome,
    automaticDecision: false
  };
}

export async function runInterviewOperation(input: Extract<HiringOperation,{resource:"interview"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  if(input.action==="schedule"){
    if(!input.scheduledAt||!input.interviewerAdminUserId||!input.interviewType)throw new ApiError(400,"BAD_REQUEST","Schedule, interviewer and interview type are required.");
    const scheduledAt=new Date(input.scheduledAt);
    const result=await withDbTransaction(async query=>{
      await query("select pg_advisory_xact_lock(hashtext($1))",[`hiring-interview-schedule:${application.id}`]);
      const existing=await query<{id:string;interview_type:string;scheduled_at:Date;interviewer_admin_user_id:string}>(
        `select id,interview_type,scheduled_at,interviewer_admin_user_id from hiring_candidate_interviews
         where application_id=$1 and status in ('scheduled','rescheduled') order by created_at desc limit 1`,
        [application.id]
      );
      const current=existing[0];
      if(current){
        const isSame=current.interview_type===input.interviewType
          &&current.interviewer_admin_user_id===input.interviewerAdminUserId
          &&new Date(current.scheduled_at).getTime()===scheduledAt.getTime();
        if(isSame)return {id:current.id,idempotent:true};
        throw new ApiError(409,"BAD_REQUEST","An interview is already scheduled. Choose Reschedule and use the current interview ID.");
      }
      const inserted=await query<{id:string}>(`insert into hiring_candidate_interviews(application_id,interview_type,status,scheduled_at,interviewer_admin_user_id,duration_minutes,structured_notes)
        values($1,$2,'scheduled',$3,$4,$5,$6) returning id`,[application.id,input.interviewType,scheduledAt,input.interviewerAdminUserId,input.durationMinutes||30,input.notes||null]);
      await query("update hiring_applications set current_stage='interview_scheduled',updated_at=now() where id=$1",[application.id]);
      return {id:inserted[0].id,idempotent:false};
    });
    if(result.idempotent)return {ok:true,interviewId:result.id,idempotent:true};
    await audit(application.id,adminUserId,"interview_scheduled","interview",result.id,{scheduledAt:input.scheduledAt,type:input.interviewType,reason:input.reason});
    await notifyCandidate(application,"interview_invitation","WriteX interview invitation",[`An interview has been scheduled for ${new Date(input.scheduledAt).toLocaleString("en-IN")}.`,`Application reference: ${input.applicationReference}`,"Your interviewer will use a structured role-specific scorecard."]);
    return {ok:true,interviewId:result.id};
  }
  if(!input.interviewId)throw new ApiError(400,"BAD_REQUEST","Interview ID is required.");
  if(input.action==="complete"&&Object.keys(input.scores||{}).length===0)throw new ApiError(400,"BAD_REQUEST","Complete the structured interview scorecard before finishing the interview.");
  const status=input.action==="reschedule"?"rescheduled":input.action==="complete"?"completed":input.action==="cancel"?"cancelled":input.action;
  const updated=await dbQuery<{id:string}>(`update hiring_candidate_interviews set status=$2,scheduled_at=coalesce($3,scheduled_at),structured_notes=coalesce($4,structured_notes),recommendation=coalesce($5,recommendation),reschedule_reason=case when $2='rescheduled' then $6 else reschedule_reason end,cancel_reason=case when $2='cancelled' then $6 else cancel_reason end,no_show_notes=case when $2='no_show' then $6 else no_show_notes end,completed_at=case when $2='completed' then now() else completed_at end,updated_at=now() where id=$1 and application_id=$7 returning id`,[input.interviewId,status,input.scheduledAt?new Date(input.scheduledAt):null,input.notes||null,input.recommendation||null,input.reason,application.id]);
  if(!updated.rows[0])throw new ApiError(404,"NOT_FOUND","The interview was not found for this candidate. Refresh the candidate workspace and use the current interview ID.");
  if(input.action==="complete"){
    for(const [competency,score] of Object.entries(input.scores||{}))await dbQuery(`insert into hiring_candidate_interview_scores(interview_id,competency_key,score,notes) values($1,$2,$3,$4) on conflict(interview_id,competency_key) do update set score=excluded.score,notes=excluded.notes`,[input.interviewId,competency,score,input.notes||null]);
    await dbQuery("update hiring_applications set current_stage='interview_completed',updated_at=now() where id=$1",[application.id]);
  }else if(["no_show","cancel"].includes(input.action)&&application.current_stage!=="shortlisted"){
    await dbQuery("update hiring_applications set current_stage='shortlisted',updated_at=now() where id=$1",[application.id]);
    await dbQuery(`insert into hiring_application_status_history(application_id,previous_stage,new_stage,changed_by_type,changed_by_admin_user_id,reason)
      values($1,$2,'shortlisted','admin',$3,$4)`,[application.id,application.current_stage,adminUserId,input.reason]);
  }
  await audit(application.id,adminUserId,`interview_${input.action}`,"interview",input.interviewId,{reason:input.reason,recommendation:input.recommendation||null});
  if(input.action==="reschedule"&&input.scheduledAt)await notifyCandidate(application,"interview_reschedule","WriteX interview rescheduled",[`Your interview has been rescheduled to ${new Date(input.scheduledAt).toLocaleString("en-IN")}.`,`Application reference: ${input.applicationReference}`]);
  return {ok:true};
}

export async function runTalentPoolOperation(input: Extract<HiringOperation,{resource:"talent_pool"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  if(input.action==="remove"){
    await dbQuery("update hiring_talent_pool set active=false,removed_at=now(),removal_reason=$2,updated_at=now() where application_id=$1",[application.id,input.reason]);
  }else if(input.action==="convert"){
    await dbQuery("update hiring_talent_pool set active=false,removed_at=now(),removal_reason=$2,updated_at=now() where application_id=$1",[application.id,input.reason]);
    await dbQuery("update hiring_applications set current_stage='eligibility_review',updated_at=now() where id=$1",[application.id]);
  }else{
    if(!input.category)throw new ApiError(400,"BAD_REQUEST","Talent-pool category is required.");
    await dbQuery(`insert into hiring_talent_pool(application_id,category,notes,review_at,active,skill_tags,role_tags,availability,added_by_admin_user_id)
      values($1,$2,$3,$4,true,$5,$6,$7,$8) on conflict(application_id) do update set category=excluded.category,notes=excluded.notes,review_at=excluded.review_at,active=true,skill_tags=excluded.skill_tags,role_tags=excluded.role_tags,availability=excluded.availability,removed_at=null,removal_reason=null,updated_at=now()`,[application.id,input.category,input.notes||null,input.reviewAt?new Date(input.reviewAt):null,input.skillTags||[],input.roleTags||[],input.availability||null,adminUserId]);
    await dbQuery("update hiring_applications set current_stage='talent_pool',updated_at=now() where id=$1",[application.id]);
  }
  await audit(application.id,adminUserId,`talent_pool_${input.action}`,"talent_pool",input.applicationReference,{category:input.category||null,reason:input.reason});
  return {ok:true};
}

export async function runReferralOperation(input: Extract<HiringOperation,{resource:"referral"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  await dbQuery(`insert into hiring_candidate_referrals(application_id,referral_code_hash,referrer_reference_hash,joined_status,payout_status,referral_source,conflict_status,safe_notes)
    values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(application_id) do update set referral_code_hash=excluded.referral_code_hash,referrer_reference_hash=excluded.referrer_reference_hash,joined_status=excluded.joined_status,payout_status=excluded.payout_status,referral_source=excluded.referral_source,conflict_status=excluded.conflict_status,safe_notes=excluded.safe_notes,updated_at=now()`,[application.id,hashHiringSignal("referral_code",input.referrerCode),hashHiringSignal("referrer_reference",input.referrerCode),input.joinedStatus||"not_joined",input.payoutStatus||"not_applicable",input.referralSource,input.conflictStatus||"clear",input.notes||null]);
  await audit(application.id,adminUserId,`referral_${input.action}`,"referral",input.applicationReference,{source:input.referralSource,conflictStatus:input.conflictStatus||"clear",reason:input.reason});
  return {ok:true};
}

export async function runVerificationOperation(input: Extract<HiringOperation,{resource:"verification"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  if(input.action==="open_case"){
    await dbQuery(`insert into hiring_verification_cases(application_id,verification_type,status,consent_recorded_at,assigned_admin_user_id,method)
      values($1,$2,'manual_review',now(),$3,$4) on conflict(application_id,verification_type) do update set status='manual_review',assigned_admin_user_id=excluded.assigned_admin_user_id,method=excluded.method,updated_at=now()`,[application.id,input.verificationType,adminUserId,input.method||"manual_document_review"]);
    const consentType = input.verificationType === "identity" || input.verificationType === "aadhaar"
      ? "identity_verification"
      : input.verificationType === "education"
        ? "education_verification"
        : "background_verification";
    await dbQuery(`insert into hiring_candidate_consents(application_id,consent_type,policy_version,granted,granted_at,safe_metadata)
      values($1,$2,'hiring-privacy-v1',true,now(),'{}'::jsonb) on conflict(application_id,consent_type,policy_version) do update set granted=true,granted_at=coalesce(hiring_candidate_consents.granted_at,now()),updated_at=now()`,[application.id,consentType]);
    await notifyHiringTeam(application.id,"verification_pending_alert","WriteX hiring verification review pending",[`Application reference: ${input.applicationReference}`,`Verification type: ${input.verificationType}`,"A human reviewer must complete the evidence review in Super Admin."]);
  }else{
    const cases=await dbQuery<{id:string}>("select id from hiring_verification_cases where application_id=$1 and verification_type=$2",[application.id,input.verificationType]);
    if(!cases.rows[0])throw new ApiError(409,"BAD_REQUEST","Open the verification case before recording a decision.");
    const decision=input.action==="request_clarification"?"candidate_clarification":input.decision;
    if(!decision)throw new ApiError(400,"BAD_REQUEST","A verification decision is required.");
    await dbQuery(`insert into hiring_verification_decisions(verification_case_id,decision,reason,evidence_reviewed,notes,conditions,decided_by_admin_user_id)
      values($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7)`,[
        cases.rows[0].id,
        decision,
        input.reason,
        JSON.stringify(input.evidenceReviewed || []),
        input.notes,
        JSON.stringify(input.conditions || []),
        adminUserId
      ]);
    await dbQuery("update hiring_verification_cases set status=$2,final_clearance_status=$3,updated_at=now() where id=$1",[cases.rows[0].id,decision,decision]);
    if(decision==="candidate_clarification")await notifyCandidate(application,"candidate_clarification_request","WriteX verification clarification requested",["The hiring team needs a clarification before completing the verification review.",`Application reference: ${input.applicationReference}`,"Reply only through the approved communication channel and do not send documents to an unverified personal account."]);
    if(decision==="additional_verification")await notifyCandidate(application,"additional_document_request","WriteX additional verification requested",["Additional evidence is required before the hiring review can continue.",`Application reference: ${input.applicationReference}`,"Use only the secure upload method supplied by the authorised hiring team."]);
  }
  await audit(application.id,adminUserId,`verification_${input.action}`,"verification",`${input.applicationReference}:${input.verificationType}`,{
    decision:input.decision||null,
    reason:input.reason,
    manualReview:true,
    evidenceReviewed:input.evidenceReviewed||[],
    completionChecklist:input.completionChecklist||null,
    explicitConfirmation:input.explicitConfirmation===true
  });
  return {ok:true};
}

export async function runHrmsOperation(input: Extract<HiringOperation,{resource:"hrms"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  await dbQuery(`insert into hiring_hrms_sync(application_id,sync_status,last_attempted_at,safe_failure_reason)
    values($1,'sync_failed',now(),'HRMS provider is unavailable.') on conflict(application_id) do update set sync_status='sync_failed',last_attempted_at=now(),safe_failure_reason='HRMS provider is unavailable.',updated_at=now()`,[application.id]);
  await audit(application.id,adminUserId,"hrms_retry_blocked","hrms_sync",input.applicationReference,{provider:"unavailable",reason:input.reason});
  throw new ApiError(503,"INTEGRATION_UNAVAILABLE","HRMS integration is currently unavailable. No employee record was created.");
}

export async function runTrustPublishOperation(input: Extract<HiringOperation,{resource:"trust_publish"}>, adminUserId: string) {
  const application=await applicationByReference(input.applicationReference);
  const hrms=await dbQuery<{sync_status:string;hrms_employee_reference:string|null;official_mobile_status:string|null;joining_status:string|null}>("select sync_status,hrms_employee_reference,official_mobile_status,joining_status from hiring_hrms_sync where application_id=$1",[application.id]);
  const reasons:string[]=[]; if(application.current_stage!=="joined")reasons.push("candidate_not_joined"); if(hrms.rows[0]?.sync_status!=="synced")reasons.push("hrms_not_active"); if(!hrms.rows[0]?.hrms_employee_reference)reasons.push("official_employee_id_missing"); if(hrms.rows[0]?.official_mobile_status!=="verified")reasons.push("official_mobile_missing"); if(process.env.HIRING_TRUST_PUBLISHING_ENABLED!=="true")reasons.push("trust_publishing_disabled");
  if(input.action==="approve"&&reasons.length)throw new ApiError(409,"BAD_REQUEST",`Trust publishing is blocked: ${reasons.join(", ")}.`);
  const status=input.action==="revoke"?"revoked":reasons.length?"blocked":input.action==="approve"?"approved":"eligible";
  await dbQuery(`insert into hiring_trust_publish_status(application_id,eligible,approved,publish_status,blocked_reasons,approved_by_admin_user_id,approved_at)
    values($1,$2,$3,$4,$5,$6,$7) on conflict(application_id) do update set eligible=excluded.eligible,approved=excluded.approved,publish_status=excluded.publish_status,blocked_reasons=excluded.blocked_reasons,approved_by_admin_user_id=excluded.approved_by_admin_user_id,approved_at=excluded.approved_at,updated_at=now()`,[application.id,reasons.length===0,input.action==="approve",status,reasons,input.action==="approve"?adminUserId:null,input.action==="approve"?new Date():null]);
  await audit(application.id,adminUserId,`trust_publish_${input.action}`,"trust_publish",input.applicationReference,{status,blockedReasons:reasons,reason:input.reason});
  return {ok:true,status,blockedReasons:reasons};
}
