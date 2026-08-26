import "server-only";

import { createHash } from "crypto";
import { ApiError } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { getSmartHiringRules } from "@/lib/hiring/hiring-rules";

const SYSTEM_VERSION = "smart-hiring-system-review-v1";

type ReviewRecommendation =
  | "recommended_accept"
  | "recommended_reject"
  | "manual_review_required";

export async function generateSystemReviewForApplication(
  applicationId: string,
  triggerReason = "Assessment submission"
) {
  const applicationResult = await dbQuery<{
    id: string;
    application_reference: string;
    role_key: "academic_writer" | "sales_executive";
    current_stage: string;
  }>(
    "select id,application_reference,role_key,current_stage from hiring_applications where id=$1 limit 1",
    [applicationId]
  );
  const application = applicationResult.rows[0];
  if (!application) throw new ApiError(404, "NOT_FOUND", "Application was not found.");

  const rules = await getSmartHiringRules();
  const [eligibilityResult, sessionResult] = await Promise.all([
    dbQuery<{ automated_score: string; system_outcome: string }>(
      "select automated_score::text,system_outcome from hiring_eligibility_reviews where application_id=$1 limit 1",
      [application.id]
    ),
    dbQuery<{
      id: string;
      delivered_form: Array<{ questionId: string; version: number; category: string }>;
      accommodation: Record<string, unknown>;
      state: string;
    }>(
      `select id,delivered_form,accommodation,state
       from hiring_assessment_sessions
       where application_id=$1 and state='submitted'
       order by submitted_at desc limit 1`,
      [application.id]
    )
  ]);
  const eligibility = eligibilityResult.rows[0];
  const session = sessionResult.rows[0];
  if (!session) {
    throw new ApiError(409, "BAD_REQUEST", "A submitted assessment is required before System Review.");
  }

  const [answersResult, scoreResult, integrityResult] = await Promise.all([
    dbQuery<{ answer_length: number }>(
      `select length(answer_encrypted)::int as answer_length
       from hiring_assessment_answers where session_id=$1 and submitted_at is not null`,
      [session.id]
    ),
    dbQuery<{ automated_score: string | null }>(
      "select automated_score::text from hiring_assessment_scores where session_id=$1 limit 1",
      [session.id]
    ),
    dbQuery<{ event_type: string; severity: string }>(
      "select event_type,severity from hiring_assessment_integrity_events where session_id=$1",
      [session.id]
    )
  ]);

  const eligibilityScore = eligibility ? Number(eligibility.automated_score) : null;
  const eligibilityOutcome = eligibilityScore === null
    ? "review"
    : eligibilityScore >= rules.eligibilityPassThreshold
      ? "pass"
      : eligibilityScore < rules.eligibilityReviewThreshold
        ? "fail"
        : "review";

  const deliveredCount = session.delivered_form.length;
  const answeredCount = answersResult.rows.length;
  const completeness = deliveredCount ? answeredCount / deliveredCount : 0;
  const configuredAutomatedScore = scoreResult.rows[0]?.automated_score;
  const structuralScore = Math.min(90, Math.round(completeness * 75 + Math.min(answeredCount, 5) * 3));
  const assessmentScore = configuredAutomatedScore === null || configuredAutomatedScore === undefined
    ? structuralScore
    : Number(configuredAutomatedScore);

  const focusLosses = integrityResult.rows.filter((event) => event.event_type === "focus_loss").length;
  const pasteAttempts = integrityResult.rows.filter((event) => event.event_type === "paste_attempt").length;
  const reviewRequiredEvents = integrityResult.rows.filter((event) => event.severity === "review_required").length;
  const integrityRisk =
    focusLosses >= rules.integrityFocusReviewCount * 2 ||
    pasteAttempts >= rules.integrityPasteReviewCount * 2 ||
    reviewRequiredEvents >= 2
      ? "high"
      : focusLosses >= rules.integrityFocusReviewCount ||
          pasteAttempts >= rules.integrityPasteReviewCount ||
          reviewRequiredEvents > 0
        ? "review"
        : "low";

  const hasAccommodation = Object.values(session.accommodation || {}).some(
    (value) => value === true || (typeof value === "number" && value > 0)
  );
  const nearThreshold = Math.abs(assessmentScore - rules.assessmentAcceptThreshold) <= 5 ||
    Math.abs(assessmentScore - rules.assessmentRejectThreshold) <= 5;
  let recommendation: ReviewRecommendation;
  if (configuredAutomatedScore === null || configuredAutomatedScore === undefined || hasAccommodation || integrityRisk !== "low" || eligibilityOutcome === "review" || nearThreshold) {
    recommendation = "manual_review_required";
  } else if (eligibilityOutcome === "fail" || assessmentScore < rules.assessmentRejectThreshold) {
    recommendation = "recommended_reject";
  } else if (eligibilityOutcome === "pass" && assessmentScore >= rules.assessmentAcceptThreshold) {
    recommendation = "recommended_accept";
  } else {
    recommendation = "manual_review_required";
  }

  const reasoning = [
    eligibilityScore === null
      ? "Eligibility evidence has not been completed."
      : `Eligibility evidence scored ${eligibilityScore}/100 (${eligibilityOutcome}).`,
    configuredAutomatedScore === null || configuredAutomatedScore === undefined
      ? `All ${answeredCount} of ${deliveredCount} required responses were structurally reviewed; response quality still requires Admin Review.`
      : `Configured assessment scoring produced ${assessmentScore}/100.`,
    integrityRisk === "low"
      ? "Assessment integrity risk is low."
      : `Assessment Integrity Review Required: ${focusLosses} focus-loss event(s), ${pasteAttempts} paste attempt(s), and ${reviewRequiredEvents} review-required event(s).`
  ];
  const attention = [
    ...(hasAccommodation ? ["An approved accommodation is present and requires human interpretation."] : []),
    ...(nearThreshold ? ["The assessment score is close to a configured decision threshold."] : []),
    ...(configuredAutomatedScore === null || configuredAutomatedScore === undefined
      ? ["The score reflects structural completion, not a substitute for human evaluation of writing or communication quality."]
      : [])
  ];
  const confidence = configuredAutomatedScore !== null && configuredAutomatedScore !== undefined
    ? eligibilityScore !== null && integrityRisk === "low" ? "high" : "medium"
    : "low";
  const questionSetVersion = createHash("sha256")
    .update(JSON.stringify(session.delivered_form.map((question) => [question.questionId, question.version])))
    .digest("hex");

  const review = await withDbTransaction(async (query) => {
    await query("select pg_advisory_xact_lock(hashtext($1))", [`hiring-system-review:${application.id}`]);
    const versions = await query<{ version: number }>(
      "select coalesce(max(review_version),0)::int as version from hiring_system_reviews where application_id=$1",
      [application.id]
    );
    const version = versions[0].version + 1;
    await query(
      "update hiring_system_reviews set superseded_at=now() where application_id=$1 and superseded_at is null",
      [application.id]
    );
    const inserted = await query<{ id: string }>(
      `insert into hiring_system_reviews(
         application_id,assessment_session_id,review_version,system_version,rule_version,
         question_set_version,eligibility_outcome,assessment_score,integrity_risk,
         recommendation,reasoning,attention,confidence,calculated_scores
       ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14::jsonb)
       returning id`,
      [
        application.id,
        session.id,
        version,
        SYSTEM_VERSION,
        rules.version,
        questionSetVersion,
        eligibilityOutcome,
        assessmentScore,
        integrityRisk,
        recommendation,
        JSON.stringify(reasoning),
        JSON.stringify(attention),
        confidence,
        JSON.stringify({ eligibilityScore, assessmentScore, completeness, focusLosses, pasteAttempts, reviewRequiredEvents })
      ]
    );
    if (rules.autoProgressToAdminReview && application.current_stage === "assessment_submitted") {
      await query("update hiring_applications set current_stage='under_review',updated_at=now() where id=$1", [application.id]);
      await query(
        `insert into hiring_application_status_history(
           application_id,previous_stage,new_stage,changed_by_type,reason
         ) values($1,'assessment_submitted','under_review','system',$2)`,
        [application.id, "System Review completed; Admin Review is required."]
      );
    }
    await query(
      `insert into hiring_audit_logs(
         application_id,actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata
       ) values($1,'system',$2,'system_review_completed','system_review',$3,$4::jsonb)`,
      [application.id, SYSTEM_VERSION, inserted[0].id, JSON.stringify({ version, recommendation, confidence, triggerReason })]
    );
    return { id: inserted[0].id, version };
  });

  return {
    ...review,
    eligibilityOutcome,
    assessmentScore,
    integrityRisk,
    recommendation,
    reasoning,
    attention,
    confidence,
    systemVersion: SYSTEM_VERSION,
    ruleVersion: rules.version,
    questionSetVersion
  };
}
