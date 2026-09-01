import "server-only";

import { isDatabaseConfigured, optionalDbQuery } from "@/lib/db";
import { decryptHiringReviewValue } from "@/lib/hiring/candidate-disclosure";
import { getHiringWorkflow } from "@/lib/hiring/workflow";

export type HiringAdminSnapshot = {
  counts: Record<string, number>;
  applications: Array<{
    reference: string;
    candidate: string;
    role: string;
    stage: string;
    submittedAt: string;
    assigned: boolean;
    reviewer: string;
    source: string;
    qualification: string;
    experience: string;
    assessmentStatus: string;
    verificationStatus: string;
    notificationStatus: string;
    risk: string;
    nextAction: string;
    lastActivity: string;
  }>;
  assessments: Array<{
    reference: string;
    applicationReference: string;
    role: string;
    state: string;
    assessor: string;
    integrityLevel: string;
    vivaStatus: string;
    submittedAt: string | null;
    createdAt: string;
  }>;
  questions: Array<{
    id: string;
    version: number;
    role: string;
    title: string;
    category: string;
    section: string;
    difficulty: string;
    prompt: string;
    instructions: string;
    sourceMaterial: string;
    answerType: string;
    expectedTimeMinutes: number;
    maximumScore: number;
    required: boolean;
    randomizationEligible: boolean;
    backNavigationRule: string;
    variants: string[];
    scoringRubric: Record<string, unknown>;
    autoScoringRule: Record<string, unknown>;
    expectedCompetencies: string[];
    humanReviewRequired: boolean;
    antiCheatSensitivity: string;
    vivaFollowUpRequired: boolean;
    lifecycleStatus: string;
    displayOrder: number;
    contentHash: string;
    protected: boolean;
    active: boolean;
    usage: number;
  }>;
  verificationCases: Array<{
    id: string;
    applicationReference: string;
    type: string;
    status: string;
    discrepancies: number;
    reviewer: string;
    offerBlocked: boolean;
    updatedAt: string;
  }>;
  interviews: Array<{ id:string;applicationReference:string;type:string;status:string;scheduledAt:string|null;recommendation:string|null }>;
  talentPool: Array<{ applicationReference:string;category:string;active:boolean;reviewAt:string|null;skillTags:string[] }>;
  referrals: Array<{ applicationReference:string;source:string;joinedStatus:string;payoutStatus:string;conflictStatus:string }>;
  retention: Array<{ applicationReference:string;category:string;status:string;reviewDueAt:string;legalHold:boolean }>;
  hrms: Array<{ applicationReference:string;status:string;lastAttemptedAt:string|null;failure:string|null }>;
  trustPublishing: Array<{ applicationReference:string;status:string;blockedReasons:string[] }>;
  integrityReviewCount: number;
  connectedReviewCount: number;
  notificationFailureCount: number;
};

const emptySnapshot: HiringAdminSnapshot = { counts: {}, applications: [], assessments: [], questions: [], verificationCases: [],interviews:[],talentPool:[],referrals:[],retention:[],hrms:[],trustPublishing:[],integrityReviewCount:0,connectedReviewCount:0,notificationFailureCount:0 };

export async function getHiringAdminSnapshot(): Promise<HiringAdminSnapshot> {
  if (!isDatabaseConfigured()) return emptySnapshot;
  try {
    const [stageRows, applications, assessments, questions, verificationCases,interviews,talentPool,referrals,retention,hrms,trustPublishing,integrity,connectedReviews] = await Promise.all([
      optionalDbQuery<{ current_stage: string; count: string }>("select current_stage, count(*)::text as count from hiring_applications group by current_stage"),
      optionalDbQuery<{
        application_reference: string;
        candidate_reference: string;
        role_key: string;
        current_stage: string;
        submitted_at: Date;
        assigned_admin_user_id: string | null;
        reviewer: string | null;
        source: string;
        qualification: string;
        experience: string;
        assessment_status: string;
        verification_status: string;
        notification_status: string;
        risk: string;
        updated_at: Date;
        has_eligibility: boolean; assessment_state: string | null; has_system_review: boolean;
        has_admin_review: boolean; has_interview: boolean; interview_completed: boolean;
        has_final_decision: boolean; has_sales_video: boolean; has_sales_video_review: boolean;
      }>(`
        select
          application.application_reference,
          candidate.candidate_reference,
          application.role_key,
          application.current_stage,
          application.submitted_at,
          application.assigned_admin_user_id,
          reviewer.name as reviewer,
          application.source,
          application.updated_at,
          exists(select 1 from hiring_eligibility_reviews where application_id=application.id) as has_eligibility,
          (select state from hiring_assessment_sessions where application_id=application.id order by created_at desc limit 1) as assessment_state,
          exists(select 1 from hiring_system_reviews where application_id=application.id and superseded_at is null) as has_system_review,
          exists(select 1 from hiring_admin_reviews where application_id=application.id and superseded_at is null) as has_admin_review,
          exists(select 1 from hiring_candidate_interviews where application_id=application.id) as has_interview,
          exists(select 1 from hiring_candidate_interviews where application_id=application.id and status='completed') as interview_completed,
          exists(select 1 from hiring_final_decisions where application_id=application.id and superseded_at is null) as has_final_decision,
          exists(select 1 from hiring_candidate_files where application_id=application.id and file_type='video_introduction' and revoked_at is null and deleted_at is null) as has_sales_video,
          exists(select 1 from hiring_video_reviews where application_id=application.id and superseded_at is null) as has_sales_video_review,
          coalesce(nullif(application.application_payload->>'qualification', ''), 'Not provided') as qualification,
          coalesce(nullif(application.application_payload->>'experience', ''), 'Not provided') as experience,
          coalesce((
            select session.state
            from hiring_assessment_sessions session
            where session.application_id = application.id
            order by session.created_at desc
            limit 1
          ), 'not_started') as assessment_status,
          coalesce((
            select case
              when bool_or(verification.status in ('unable_to_verify', 'not_approved_for_hiring')) then 'action_required'
              when bool_or(verification.status not in ('approved', 'approved_for_hiring', 'approved_with_conditions')) then 'in_review'
              else 'approved'
            end
            from hiring_verification_cases verification
            where verification.application_id = application.id
          ), 'not_started') as verification_status,
          coalesce((
            select notification.status
            from hiring_notifications notification
            where notification.application_id = application.id
              and notification.notification_type = 'internal_hiring_alert'
            order by notification.created_at desc
            limit 1
          ), 'not_recorded') as notification_status,
          coalesce((
            select review.risk_level
            from hiring_connected_candidate_reviews review
            where review.candidate_a_id = application.candidate_id
               or review.candidate_b_id = application.candidate_id
            order by
              case review.risk_level when 'high' then 3 when 'review' then 2 else 1 end desc,
              review.updated_at desc
            limit 1
          ), 'low') as risk
        from hiring_applications application
        join hiring_candidates candidate on candidate.id=application.candidate_id
        left join admin_users reviewer on reviewer.id = application.assigned_admin_user_id
        order by application.submitted_at desc
        limit 100
      `),
      optionalDbQuery<{
        session_reference: string;
        application_reference: string;
        role_key: string;
        state: string;
        assessor: string | null;
        integrity_level: string;
        viva_status: string;
        submitted_at: Date | null;
        created_at: Date;
      }>(`
        select
          session.session_reference,
          application.application_reference,
          assessment.role_key,
          session.state,
          assessor.name as assessor,
          coalesce((
            select event.severity
            from hiring_assessment_integrity_events event
            where event.session_id = session.id
            order by
              case event.severity
                when 'review_required' then 3
                when 'advisory' then 2
                else 1
              end desc,
              event.occurred_at desc
            limit 1
          ), 'clear') as integrity_level,
          coalesce((
            select interview.status
            from hiring_candidate_interviews interview
            where interview.application_id = application.id
              and interview.interview_type = 'viva'
            order by interview.updated_at desc
            limit 1
          ), 'not_scheduled') as viva_status,
          session.submitted_at,
          session.created_at
        from hiring_assessment_sessions session
        join hiring_assessments assessment on assessment.id = session.assessment_id
        join hiring_applications application on application.id = session.application_id
        left join hiring_assessment_scores score on score.session_id = session.id
        left join admin_users assessor on assessor.id = score.scored_by_admin_user_id
        order by session.created_at desc
        limit 100
      `),
      optionalDbQuery<{
        stable_question_id:string;version:number;role_key:string;title:string;category:string;section:string;
        difficulty:string;prompt:string;instructions:string|null;source_material:string|null;answer_type:string;
        expected_time_minutes:number;maximum_score:string;required:boolean;randomization_eligible:boolean;
        back_navigation_rule:string;variants:string[];scoring_rubric:Record<string,unknown>;auto_scoring_rule:Record<string,unknown>;expected_competencies:string[];
        human_review_required:boolean;anti_cheat_sensitivity:string;viva_follow_up_required:boolean;
        lifecycle_status:string;display_order:number;content_hash:string;protected:boolean;active:boolean;usage:string;
      }>(`select q.stable_question_id,q.version,q.role_key,q.title,q.category,q.section,q.difficulty,
          q.prompt,q.instructions,q.source_material,q.answer_type,q.expected_time_minutes,
          q.maximum_score::text,q.required,q.randomization_eligible,q.back_navigation_rule,q.variants,
          q.scoring_rubric,q.auto_scoring_rule,q.expected_competencies,q.human_review_required,q.anti_cheat_sensitivity,
          q.viva_follow_up_required,q.lifecycle_status,q.display_order,q.content_hash,q.protected,q.active,
          count(a.id)::text as usage
        from hiring_assessment_questions q
        left join hiring_assessment_answers a on a.question_id=q.id
        where q.archived_at is null
          and q.version=(select max(latest.version) from hiring_assessment_questions latest where latest.stable_question_id=q.stable_question_id and latest.archived_at is null)
        group by q.id
        order by q.role_key,q.display_order,q.stable_question_id,q.version desc
        limit 500`),
      optionalDbQuery<{
        id: string;
        application_reference: string;
        verification_type: string;
        status: string;
        discrepancy_count: number;
        reviewer: string | null;
        offer_blocked: boolean;
        updated_at: Date;
      }>(`
        select
          verification.id,
          application.application_reference,
          verification.verification_type,
          verification.status,
          verification.discrepancy_count,
          reviewer.name as reviewer,
          (
            verification.discrepancy_count > 0
            or verification.status in ('unable_to_verify', 'not_approved_for_hiring')
          ) as offer_blocked,
          verification.updated_at
        from hiring_verification_cases verification
        join hiring_applications application on application.id = verification.application_id
        left join admin_users reviewer on reviewer.id = verification.assigned_admin_user_id
        order by verification.updated_at desc
        limit 100
      `),
      optionalDbQuery<{id:string;application_reference:string;interview_type:string;status:string;scheduled_at:Date|null;recommendation:string|null}>("select i.id,a.application_reference,i.interview_type,i.status,i.scheduled_at,i.recommendation from hiring_candidate_interviews i join hiring_applications a on a.id=i.application_id order by coalesce(i.scheduled_at,i.created_at) desc limit 100"),
      optionalDbQuery<{application_reference:string;category:string;active:boolean;review_at:Date|null;skill_tags:string[]}>("select a.application_reference,t.category,t.active,t.review_at,t.skill_tags from hiring_talent_pool t join hiring_applications a on a.id=t.application_id order by t.updated_at desc limit 100"),
      optionalDbQuery<{application_reference:string;referral_source:string;joined_status:string;payout_status:string;conflict_status:string}>("select a.application_reference,r.referral_source,r.joined_status,r.payout_status,r.conflict_status from hiring_candidate_referrals r join hiring_applications a on a.id=r.application_id order by r.updated_at desc limit 100"),
      optionalDbQuery<{application_reference:string;retention_category:string;status:string;review_due_at:Date;legal_hold:boolean}>("select a.application_reference,r.retention_category,r.status,r.review_due_at,r.legal_hold from hiring_retention_queue r join hiring_applications a on a.id=r.application_id order by r.review_due_at asc limit 100"),
      optionalDbQuery<{application_reference:string;sync_status:string;last_attempted_at:Date|null;safe_failure_reason:string|null}>("select a.application_reference,h.sync_status,h.last_attempted_at,h.safe_failure_reason from hiring_hrms_sync h join hiring_applications a on a.id=h.application_id order by h.updated_at desc limit 100"),
      optionalDbQuery<{application_reference:string;publish_status:string;blocked_reasons:string[]}>("select a.application_reference,t.publish_status,t.blocked_reasons from hiring_trust_publish_status t join hiring_applications a on a.id=t.application_id order by t.updated_at desc limit 100"),
      optionalDbQuery<{count:string}>("select count(*)::text as count from hiring_assessment_integrity_events where reviewed_at is null and severity in ('advisory','review_required')"),
      optionalDbQuery<{count:string}>("select count(*)::text as count from hiring_connected_candidate_reviews where review_status='pending_review'")
    ]);
    return {
      counts: Object.fromEntries((stageRows?.rows ?? []).map((row) => [row.current_stage, Number(row.count)])),
      applications: (applications?.rows ?? []).map((row) => ({
        reference: row.application_reference,
        candidate: row.candidate_reference,
        role: row.role_key,
        stage: row.current_stage,
        submittedAt: row.submitted_at.toISOString(),
        assigned: Boolean(row.assigned_admin_user_id),
        reviewer: row.reviewer || "Unassigned",
        source: row.source,
        qualification: row.qualification,
        experience: row.experience,
        assessmentStatus: row.assessment_status,
        verificationStatus: row.verification_status,
        notificationStatus: row.notification_status,
        risk: row.risk,
        nextAction:getHiringWorkflow({role:row.role_key,stage:row.current_stage,assignedReviewer:Boolean(row.assigned_admin_user_id),hasEligibility:row.has_eligibility,hasAssessment:Boolean(row.assessment_state),assessmentState:row.assessment_state,hasSystemReview:row.has_system_review,hasAdminReview:row.has_admin_review,hasInterview:row.has_interview,interviewCompleted:row.interview_completed,hasFinalDecision:row.has_final_decision,hasSalesVideo:row.has_sales_video,hasSalesVideoReview:row.has_sales_video_review}).next.label,
        lastActivity:row.updated_at.toISOString()
      })),
      assessments: (assessments?.rows ?? []).map((row) => ({
        reference: row.session_reference,
        applicationReference: row.application_reference,
        role: row.role_key,
        state: row.state,
        assessor: row.assessor || "Unassigned",
        integrityLevel: row.integrity_level,
        vivaStatus: row.viva_status,
        submittedAt: row.submitted_at?.toISOString() || null,
        createdAt: row.created_at.toISOString()
      })),
      questions: (questions?.rows ?? []).map((row) => ({
        id:row.stable_question_id,version:row.version,role:row.role_key,title:row.title,
        category:row.category,section:row.section,difficulty:row.difficulty,prompt:row.prompt,
        instructions:row.instructions||"",sourceMaterial:row.source_material||"",answerType:row.answer_type,
        expectedTimeMinutes:row.expected_time_minutes,maximumScore:Number(row.maximum_score),required:row.required,
        randomizationEligible:row.randomization_eligible,backNavigationRule:row.back_navigation_rule,
        variants:row.variants||[],scoringRubric:row.scoring_rubric||{},autoScoringRule:row.auto_scoring_rule||{},expectedCompetencies:row.expected_competencies||[],
        humanReviewRequired:row.human_review_required,antiCheatSensitivity:row.anti_cheat_sensitivity,
        vivaFollowUpRequired:row.viva_follow_up_required,lifecycleStatus:row.lifecycle_status,
        displayOrder:row.display_order,contentHash:row.content_hash,protected:row.protected,
        active:row.active,usage:Number(row.usage)
      })),
      verificationCases: (verificationCases?.rows ?? []).map((row) => ({
        id: row.id,
        applicationReference: row.application_reference,
        type: row.verification_type,
        status: row.status,
        discrepancies: row.discrepancy_count,
        reviewer: row.reviewer || "Unassigned",
        offerBlocked: row.offer_blocked,
        updatedAt: row.updated_at.toISOString()
      })),
      interviews:(interviews?.rows??[]).map(row=>({id:row.id,applicationReference:row.application_reference,type:row.interview_type,status:row.status,scheduledAt:row.scheduled_at?.toISOString()||null,recommendation:row.recommendation})),
      talentPool:(talentPool?.rows??[]).map(row=>({applicationReference:row.application_reference,category:row.category,active:row.active,reviewAt:row.review_at?.toISOString()||null,skillTags:row.skill_tags||[]})),
      referrals:(referrals?.rows??[]).map(row=>({applicationReference:row.application_reference,source:row.referral_source,joinedStatus:row.joined_status,payoutStatus:row.payout_status,conflictStatus:row.conflict_status})),
      retention:(retention?.rows??[]).map(row=>({applicationReference:row.application_reference,category:row.retention_category,status:row.status,reviewDueAt:row.review_due_at.toISOString(),legalHold:row.legal_hold})),
      hrms:(hrms?.rows??[]).map(row=>({applicationReference:row.application_reference,status:row.sync_status,lastAttemptedAt:row.last_attempted_at?.toISOString()||null,failure:row.safe_failure_reason})),
      trustPublishing:(trustPublishing?.rows??[]).map(row=>({applicationReference:row.application_reference,status:row.publish_status,blockedReasons:row.blocked_reasons||[]})),
      integrityReviewCount:Number(integrity?.rows[0]?.count||0),
      connectedReviewCount:Number(connectedReviews?.rows[0]?.count||0),
      notificationFailureCount:(applications?.rows||[]).filter(row=>["failed","unavailable"].includes(row.notification_status)).length
    };
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return emptySnapshot;
    throw error;
  }
}

export async function getHiringApplicationDetail(
  reference: string,
  options: { revealContact?: boolean } = {}
){
  if(!isDatabaseConfigured())return null;
  const application=await optionalDbQuery<{
    id:string;
    candidate_reference:string;
    application_reference:string;
    role_key:string;
    current_stage:string;
    pii_encrypted:string;
    city:string|null;
    source:string;
    application_payload:Record<string,unknown>;
    submitted_at:Date;
    updated_at:Date;
    retention_state:string;
    retention_review_at:Date|null;
    legal_hold:boolean;
    assigned_reviewer:string|null;
  }>(`
    select
      application.id,
      candidate.candidate_reference,
      application.application_reference,
      application.role_key,
      application.current_stage,
      application.pii_encrypted,
      application.city,
      application.source,
      application.application_payload,
      application.submitted_at,
      application.updated_at,
      application.retention_state,
      application.retention_review_at,
      application.legal_hold,
      reviewer.name as assigned_reviewer
    from hiring_applications application
    join hiring_candidates candidate on candidate.id = application.candidate_id
    left join admin_users reviewer on reviewer.id = application.assigned_admin_user_id
    where application.application_reference=$1
    limit 1
  `,[reference.trim().toUpperCase()]);
  const row=application?.rows[0];if(!row)return null;
  let pii:{fullName?:string;email?:string;mobile?:string}={};try{pii=JSON.parse(decryptHiringReviewValue(row.pii_encrypted)||"{}");}catch{pii={};}
  const maskEmail=(value?:string)=>{if(!value)return"Unavailable";const[local,domain]=value.split("@");return `${local.slice(0,2)}***@${domain||"hidden"}`;};
  const maskMobile=(value?:string)=>value?`******${value.replace(/\D/g,"").slice(-4)}`:"Unavailable";
  const[history,files,interviews,verification,eligibility,audit,consents,assessment,notifications,disclosure,systemReview,adminReview,finalDecision,integritySummary,videoReview]=await Promise.all([
    optionalDbQuery<{previous_stage:string|null;new_stage:string;reason:string;changed_at:Date}>("select previous_stage,new_stage,reason,changed_at from hiring_application_status_history where application_id=$1 order by changed_at desc limit 100",[row.id]),
    optionalDbQuery<{id:string;file_type:string;safe_file_name:string;mime_type:string;file_size:string;malware_scan_status:string;capture_source:string|null;duration_seconds:number|null;revoked_at:Date|null;deleted_at:Date|null;created_at:Date}>("select id,file_type,safe_file_name,mime_type,file_size::text,malware_scan_status,capture_source,duration_seconds,revoked_at,deleted_at,created_at from hiring_candidate_files where application_id=$1 order by created_at desc",[row.id]),
    optionalDbQuery<{id:string;interview_type:string;status:string;scheduled_at:Date|null;recommendation:string|null}>("select id,interview_type,status,scheduled_at,recommendation from hiring_candidate_interviews where application_id=$1 order by created_at desc",[row.id]),
    optionalDbQuery<{id:string;verification_type:string;status:string;final_clearance_status:string|null;discrepancy_count:number}>("select id,verification_type,status,final_clearance_status,discrepancy_count from hiring_verification_cases where application_id=$1 order by created_at",[row.id]),
    optionalDbQuery<{rules:Array<{key:string;label:string;weight:number;passed:boolean;reason:string}>;automated_score:string;system_outcome:string;reviewer_outcome:string;reviewer_notes:string;review_reason:string;reviewed_at:Date}>("select rules,automated_score::text,system_outcome,reviewer_outcome,reviewer_notes,review_reason,reviewed_at from hiring_eligibility_reviews where application_id=$1 limit 1",[row.id]),
    optionalDbQuery<{action:string;entity_type:string;safe_metadata:Record<string,unknown>;correlation_id:string|null;created_at:Date}>("select action,entity_type,safe_metadata,correlation_id,created_at from hiring_audit_logs where application_id=$1 order by created_at desc limit 100",[row.id]),
    optionalDbQuery<{consent_type:string;policy_version:string;granted:boolean;granted_at:Date|null;withdrawn_at:Date|null}>("select consent_type,policy_version,granted,granted_at,withdrawn_at from hiring_candidate_consents where application_id=$1 order by created_at",[row.id]),
    optionalDbQuery<{session_reference:string;state:string;submitted_at:Date|null;created_at:Date}>("select session_reference,state,submitted_at,created_at from hiring_assessment_sessions where application_id=$1 order by created_at desc limit 1",[row.id]),
    optionalDbQuery<{notification_type:string;status:string;provider:string|null;safe_failure_reason:string|null;sent_at:Date|null;correlation_id:string|null;created_at:Date}>("select notification_type,status,provider,safe_failure_reason,sent_at,correlation_id,created_at from hiring_notifications where application_id=$1 order by created_at desc",[row.id]),
    optionalDbQuery<{knows_applicant_or_employee:boolean;related_person_name_encrypted:string|null;relationship_type:string|null;related_role:string|null;disclosure_details_encrypted:string|null}>("select disclosure.knows_applicant_or_employee,disclosure.related_person_name_encrypted,disclosure.relationship_type,disclosure.related_role,disclosure.disclosure_details_encrypted from hiring_candidate_disclosures disclosure join hiring_applications application on application.candidate_id=disclosure.candidate_id where application.id=$1 limit 1",[row.id]),
    optionalDbQuery<{id:string;review_version:number;system_version:string;rule_version:string;question_set_version:string|null;eligibility_outcome:string;assessment_score:string|null;integrity_risk:string;recommendation:string;reasoning:string[];attention:string[];confidence:string;created_at:Date}>("select id,review_version,system_version,rule_version,question_set_version,eligibility_outcome,assessment_score::text,integrity_risk,recommendation,reasoning,attention,confidence,created_at from hiring_system_reviews where application_id=$1 and superseded_at is null limit 1",[row.id]),
    optionalDbQuery<{id:string;decision:string;admin_score:string|null;structured_notes:Record<string,string>;notes:string|null;recommendation_action:string;override_status:string;override_reason:string|null;reviewer_name:string;reviewed_at:Date}>("select review.id,review.decision,review.admin_score::text,review.structured_notes,review.notes,review.recommendation_action,review.override_status,review.override_reason,admin.name as reviewer_name,review.reviewed_at from hiring_admin_reviews review join admin_users admin on admin.id=review.reviewed_by_admin_user_id where review.application_id=$1 and review.superseded_at is null limit 1",[row.id]),
    optionalDbQuery<{id:string;outcome:string;reason:string;decider_name:string;decided_at:Date}>("select decision.id,decision.outcome,decision.reason,admin.name as decider_name,decision.decided_at from hiring_final_decisions decision join admin_users admin on admin.id=decision.decided_by_admin_user_id where decision.application_id=$1 and decision.superseded_at is null limit 1",[row.id]),
    optionalDbQuery<{total:string;review_required:string;reviewed:string}>("select count(*)::text as total,count(*) filter(where severity='review_required' or severity='advisory')::text as review_required,count(*) filter(where reviewed_at is not null)::text as reviewed from hiring_assessment_integrity_events event join hiring_assessment_sessions session on session.id=event.session_id where session.application_id=$1",[row.id]),
    optionalDbQuery<{id:string;candidate_file_id:string;clarity:string;role_motivation:string;communication_structure:string;customer_orientation:string;recommendation:string;notes:string;reviewer_name:string;created_at:Date}>("select review.id,review.candidate_file_id,review.clarity,review.role_motivation,review.communication_structure,review.customer_orientation,review.recommendation,review.notes,admin.name as reviewer_name,review.created_at from hiring_video_reviews review join admin_users admin on admin.id=review.reviewer_admin_user_id where review.application_id=$1 and review.superseded_at is null limit 1",[row.id]).catch((error)=>{if((error as{code?:string}).code==="42P01")return null;throw error;})
  ]);
  const eligibilityRow=eligibility?.rows[0];
  const disclosureRow=disclosure?.rows[0];
  const systemReviewRow=systemReview?.rows[0];
  const adminReviewRow=adminReview?.rows[0];
  const finalDecisionRow=finalDecision?.rows[0];
  const videoReviewRow=videoReview?.rows[0];
  const reveal=options.revealContact===true;
  const decryptOptional=(value:string|null)=>{
    if(!value||!reveal)return null;
    try{return decryptHiringReviewValue(value)||null;}catch{return null;}
  };
  return{
    reference:row.application_reference,
    candidateReference:row.candidate_reference,
    role:row.role_key,
    stage:row.current_stage,
    source:row.source,
    assignedReviewer:row.assigned_reviewer,
    candidate:{
      name:pii.fullName||"Candidate",
      email:reveal?(pii.email||"Unavailable"):maskEmail(pii.email),
      mobile:reveal?(pii.mobile||"Unavailable"):maskMobile(pii.mobile),
      city:row.city,
      contactVisibility:reveal?"authorised":"masked"
    },
    applicationPayload:row.application_payload,
    submittedAt:row.submitted_at.toISOString(),
    updatedAt:row.updated_at.toISOString(),
    retention:{state:row.retention_state,reviewAt:row.retention_review_at?.toISOString()||null,legalHold:row.legal_hold},
    history:(history?.rows||[]).map(item=>({...item,changed_at:item.changed_at.toISOString()})),
    files:(files?.rows||[]).map(item=>({...item,file_size:Number(item.file_size),created_at:item.created_at.toISOString(),revoked_at:item.revoked_at?.toISOString()||null,deleted_at:item.deleted_at?.toISOString()||null})),
    interviews:(interviews?.rows||[]).map(item=>({...item,scheduled_at:item.scheduled_at?.toISOString()||null})),
    verification:verification?.rows||[],
    eligibility:eligibilityRow?{rules:eligibilityRow.rules||[],automatedScore:Number(eligibilityRow.automated_score),systemOutcome:eligibilityRow.system_outcome,reviewerOutcome:eligibilityRow.reviewer_outcome,notes:eligibilityRow.reviewer_notes,reason:eligibilityRow.review_reason,reviewedAt:eligibilityRow.reviewed_at.toISOString()}:null,
    assessment:assessment?.rows[0]?{
      reference:assessment.rows[0].session_reference,
      state:assessment.rows[0].state,
      submittedAt:assessment.rows[0].submitted_at?.toISOString()||null,
      createdAt:assessment.rows[0].created_at.toISOString()
    }:null,
    systemReview:systemReviewRow?{
      id:systemReviewRow.id,version:systemReviewRow.review_version,systemVersion:systemReviewRow.system_version,
      ruleVersion:systemReviewRow.rule_version,questionSetVersion:systemReviewRow.question_set_version,
      eligibilityOutcome:systemReviewRow.eligibility_outcome,
      assessmentScore:systemReviewRow.assessment_score===null?null:Number(systemReviewRow.assessment_score),
      integrityRisk:systemReviewRow.integrity_risk,recommendation:systemReviewRow.recommendation,
      reasoning:systemReviewRow.reasoning||[],attention:systemReviewRow.attention||[],confidence:systemReviewRow.confidence,
      createdAt:systemReviewRow.created_at.toISOString()
    }:null,
    adminReview:adminReviewRow?{
      id:adminReviewRow.id,decision:adminReviewRow.decision,
      adminScore:adminReviewRow.admin_score===null?null:Number(adminReviewRow.admin_score),
      structuredNotes:adminReviewRow.structured_notes||{},notes:adminReviewRow.notes,
      recommendationAction:adminReviewRow.recommendation_action,overrideStatus:adminReviewRow.override_status,
      overrideReason:adminReviewRow.override_reason,reviewer:adminReviewRow.reviewer_name,
      reviewedAt:adminReviewRow.reviewed_at.toISOString()
    }:null,
    finalDecision:finalDecisionRow?{
      id:finalDecisionRow.id,outcome:finalDecisionRow.outcome,reason:finalDecisionRow.reason,
      decidedBy:finalDecisionRow.decider_name,decidedAt:finalDecisionRow.decided_at.toISOString()
    }:null,
    videoReview:videoReviewRow?{
      id:videoReviewRow.id,candidateFileId:videoReviewRow.candidate_file_id,
      clarity:videoReviewRow.clarity,roleMotivation:videoReviewRow.role_motivation,
      communicationStructure:videoReviewRow.communication_structure,customerOrientation:videoReviewRow.customer_orientation,
      recommendation:videoReviewRow.recommendation,notes:videoReviewRow.notes,reviewer:videoReviewRow.reviewer_name,
      createdAt:videoReviewRow.created_at.toISOString()
    }:null,
    integrity:{
      total:Number(integritySummary?.rows[0]?.total||0),
      reviewRequired:Number(integritySummary?.rows[0]?.review_required||0),
      reviewed:Number(integritySummary?.rows[0]?.reviewed||0)
    },
    consents:(consents?.rows||[]).map(item=>({...item,granted_at:item.granted_at?.toISOString()||null,withdrawn_at:item.withdrawn_at?.toISOString()||null})),
    notifications:(notifications?.rows||[]).map(item=>({...item,sent_at:item.sent_at?.toISOString()||null,created_at:item.created_at.toISOString()})),
    relationship:disclosureRow?{
      disclosed:disclosureRow.knows_applicant_or_employee,
      name:decryptOptional(disclosureRow.related_person_name_encrypted),
      type:disclosureRow.relationship_type,
      role:disclosureRow.related_role,
      details:decryptOptional(disclosureRow.disclosure_details_encrypted)
    }:null,
    audit:(audit?.rows||[]).map(item=>({...item,created_at:item.created_at.toISOString()}))
  };
}

export async function getHiringAssessmentDetail(reference: string) {
  if (!isDatabaseConfigured()) return null;
  const session = await optionalDbQuery<{
    id: string;
    application_id: string;
    session_reference: string;
    application_reference: string;
    role_key: string;
    title: string;
    state: string;
    delivered_form: Array<{ questionId: string; version: number; order: number; section: string; category: string; prompt: string }>;
    accommodation: Record<string, unknown>;
    started_at: Date | null;
    submitted_at: Date | null;
    expires_at: Date;
    created_at: Date;
  }>(
    `select s.id,s.application_id,s.session_reference,app.application_reference,a.role_key,a.title,
            s.state,s.delivered_form,s.accommodation,s.started_at,s.submitted_at,s.expires_at,s.created_at
     from hiring_assessment_sessions s
     join hiring_applications app on app.id=s.application_id
     join hiring_assessments a on a.id=s.assessment_id
     where s.session_reference=$1
     limit 1`,
    [reference.toUpperCase()]
  );
  const row = session?.rows[0];
  if (!row) return null;
  const [answers, integrity, score, audit] = await Promise.all([
    optionalDbQuery<{
      question_id: string;
      stable_question_id: string;
      question_version: number;
      category: string;
      section: string;
      answer_encrypted: string;
      revision_count: number;
      last_saved_at: Date;
      submitted_at: Date | null;
    }>(
      `select ans.question_id,q.stable_question_id,ans.question_version,q.category,q.section,
              ans.answer_encrypted,ans.revision_count,ans.last_saved_at,ans.submitted_at
       from hiring_assessment_answers ans
       join hiring_assessment_questions q on q.id=ans.question_id
       where ans.session_id=$1
       order by ans.first_saved_at`,
      [row.id]
    ),
    optionalDbQuery<{
      id: string;
      event_type: string;
      severity: string;
      safe_metadata: Record<string, unknown>;
      occurred_at: Date;
      reviewed_at: Date | null;
      review_outcome: string | null;
    }>(
      `select id,event_type,severity,safe_metadata,occurred_at,reviewed_at,review_outcome
       from hiring_assessment_integrity_events where session_id=$1 order by occurred_at`,
      [row.id]
    ),
    optionalDbQuery<{
      automated_score: string | null;
      human_score: string | null;
      combined_score: string | null;
      score_breakdown: Record<string, unknown>;
      reviewer_notes: string | null;
      recommendation: string | null;
      scored_at: Date | null;
    }>(
      `select automated_score::text,human_score::text,combined_score::text,score_breakdown,
              reviewer_notes,recommendation,scored_at
       from hiring_assessment_scores where session_id=$1 limit 1`,
      [row.id]
    ),
    optionalDbQuery<{
      action: string;
      entity_type: string;
      safe_metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `select action,entity_type,safe_metadata,created_at
       from hiring_audit_logs
       where application_id=$1 and (entity_type='assessment' or action like 'assessment_%')
       order by created_at desc limit 100`,
      [row.application_id]
    )
  ]);
  return {
    reference: row.session_reference,
    applicationReference: row.application_reference,
    role: row.role_key,
    title: row.title,
    state: row.state,
    deliveredForm: row.delivered_form || [],
    accommodation: row.accommodation || {},
    startedAt: row.started_at?.toISOString() || null,
    submittedAt: row.submitted_at?.toISOString() || null,
    expiresAt: row.expires_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    answers: (answers?.rows || []).map((answer) => {
      let value = "Answer unavailable.";
      try {
        value = decryptHiringReviewValue(answer.answer_encrypted) || value;
      } catch {
        value = "Answer could not be decrypted.";
      }
      return {
        questionId: answer.question_id,
        stableQuestionId: answer.stable_question_id,
        version: answer.question_version,
        category: answer.category,
        section: answer.section,
        answer: value,
        revisionCount: answer.revision_count,
        savedAt: answer.last_saved_at.toISOString(),
        submittedAt: answer.submitted_at?.toISOString() || null
      };
    }),
    integrityEvents: (integrity?.rows || []).map((event) => ({
      id: event.id,
      type: event.event_type,
      severity: event.severity,
      metadata: event.safe_metadata || {},
      occurredAt: event.occurred_at.toISOString(),
      reviewedAt: event.reviewed_at?.toISOString() || null,
      reviewOutcome: event.review_outcome
    })),
    score: score?.rows[0] ? {
      automated: score.rows[0].automated_score === null ? null : Number(score.rows[0].automated_score),
      human: score.rows[0].human_score === null ? null : Number(score.rows[0].human_score),
      combined: score.rows[0].combined_score === null ? null : Number(score.rows[0].combined_score),
      breakdown: score.rows[0].score_breakdown || {},
      notes: score.rows[0].reviewer_notes,
      recommendation: score.rows[0].recommendation,
      scoredAt: score.rows[0].scored_at?.toISOString() || null
    } : null,
    audit: (audit?.rows || []).map((event, index) => ({
      id: `${event.created_at.toISOString()}-${index}`,
      action: event.action,
      entityType: event.entity_type,
      metadata: event.safe_metadata || {},
      createdAt: event.created_at.toISOString()
    }))
  };
}

export async function getHiringVerificationCaseDetail(caseId: string) {
  if (!isDatabaseConfigured()) return null;
  const cases = await optionalDbQuery<{
    id: string;
    application_id: string;
    application_reference: string;
    verification_type: string;
    status: string;
    consent_recorded_at: Date | null;
    method: string | null;
    source_reference: string | null;
    discrepancy_count: number;
    final_clearance_status: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `select v.id,v.application_id,a.application_reference,v.verification_type,v.status,
            v.consent_recorded_at,v.method,v.source_reference,v.discrepancy_count,
            v.final_clearance_status,v.created_at,v.updated_at
     from hiring_verification_cases v
     join hiring_applications a on a.id=v.application_id
     where v.id=$1 limit 1`,
    [caseId]
  );
  const row = cases?.rows[0];
  if (!row) return null;
  const [documents, decisions, consents, audit] = await Promise.all([
    optionalDbQuery<{
      id: string;
      candidate_file_id: string;
      document_kind: string;
      masking_status: string;
      visual_review_status: string;
      digital_credential_status: string;
      institution_confirmation_status: string;
      safe_file_name: string;
      mime_type: string;
      malware_scan_status: string;
      created_at: Date;
    }>(
      `select d.id,d.candidate_file_id,d.document_kind,d.masking_status,d.visual_review_status,
              d.digital_credential_status,d.institution_confirmation_status,
              f.safe_file_name,f.mime_type,f.malware_scan_status,d.created_at
       from hiring_verification_documents d
       join hiring_candidate_files f on f.id=d.candidate_file_id
       where d.verification_case_id=$1 order by d.created_at desc`,
      [row.id]
    ),
    optionalDbQuery<{
      id: string;
      decision: string;
      reason: string;
      evidence_reviewed: string[];
      notes: string;
      conditions: string[];
      decided_at: Date;
    }>(
      `select id,decision,reason,evidence_reviewed,notes,conditions,decided_at
       from hiring_verification_decisions where verification_case_id=$1 order by decided_at desc`,
      [row.id]
    ),
    optionalDbQuery<{
      consent_type: string;
      granted: boolean;
      granted_at: Date | null;
      withdrawn_at: Date | null;
    }>(
      `select consent_type,granted,granted_at,withdrawn_at
       from hiring_candidate_consents where application_id=$1 order by updated_at desc`,
      [row.application_id]
    ),
    optionalDbQuery<{
      action: string;
      safe_metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `select action,safe_metadata,created_at from hiring_audit_logs
       where application_id=$1 and entity_type in ('verification','verification_document','candidate_file')
       order by created_at desc limit 100`,
      [row.application_id]
    )
  ]);
  return {
    id: row.id,
    applicationReference: row.application_reference,
    type: row.verification_type,
    status: row.status,
    consentRecordedAt: row.consent_recorded_at?.toISOString() || null,
    method: row.method,
    sourceReference: row.source_reference,
    discrepancyCount: row.discrepancy_count,
    finalClearanceStatus: row.final_clearance_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    documents: (documents?.rows || []).map((document) => ({
      id: document.id,
      fileId: document.candidate_file_id,
      kind: document.document_kind,
      maskingStatus: document.masking_status,
      visualReviewStatus: document.visual_review_status,
      digitalCredentialStatus: document.digital_credential_status,
      institutionStatus: document.institution_confirmation_status,
      fileName: document.safe_file_name,
      mimeType: document.mime_type,
      malwareStatus: document.malware_scan_status,
      createdAt: document.created_at.toISOString()
    })),
    decisions: (decisions?.rows || []).map((decision) => ({
      ...decision,
      decided_at: decision.decided_at.toISOString()
    })),
    consents: (consents?.rows || []).map((consent) => ({
      type: consent.consent_type,
      granted: consent.granted,
      grantedAt: consent.granted_at?.toISOString() || null,
      withdrawnAt: consent.withdrawn_at?.toISOString() || null
    })),
    audit: (audit?.rows || []).map((event, index) => ({
      id: `${event.created_at.toISOString()}-${index}`,
      action: event.action,
      metadata: event.safe_metadata || {},
      createdAt: event.created_at.toISOString()
    }))
  };
}
