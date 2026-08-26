import "server-only";

import { createHash, randomUUID } from "crypto";
import type { z } from "zod";
import { ApiError } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import {
  questionInputSchema,
  questionMutationSchema,
  type QuestionInput
} from "@/lib/hiring/question-bank-schema";

type CurrentQuestion = {
  id: string;
  version: number;
  protected: boolean;
  role_key: QuestionInput["role"];
  title: string;
  category: string;
  section: string;
  difficulty: QuestionInput["difficulty"];
  prompt: string;
  instructions: string | null;
  source_material: string | null;
  answer_type: QuestionInput["answerType"];
  expected_time_minutes: number;
  maximum_score: string;
  required: boolean;
  randomization_eligible: boolean;
  back_navigation_rule: QuestionInput["backNavigationRule"];
  variants: string[];
  scoring_rubric: Record<string, unknown>;
  auto_scoring_rule: Record<string, unknown>;
  expected_competencies: string[];
  human_review_required: boolean;
  anti_cheat_sensitivity: QuestionInput["antiCheatSensitivity"];
  viva_follow_up_required: boolean;
  active: boolean;
  lifecycle_status: string;
  display_order: number;
  usage: number;
};

function contentHash(input: QuestionInput) {
  return createHash("sha256").update(JSON.stringify({
    role: input.role,
    title: input.title,
    category: input.category,
    section: input.section,
    difficulty: input.difficulty,
    prompt: input.prompt,
    instructions: input.instructions,
    sourceMaterial: input.sourceMaterial,
    answerType: input.answerType,
    expectedTimeMinutes: input.expectedTimeMinutes,
    maximumScore: input.maximumScore,
    required: input.required,
    randomizationEligible: input.randomizationEligible,
    backNavigationRule: input.backNavigationRule,
    variants: input.variants,
    scoringRubric: input.scoringRubric,
    autoScoringRule: input.autoScoringRule,
    expectedCompetencies: input.expectedCompetencies,
    humanReviewRequired: input.humanReviewRequired,
    antiCheatSensitivity: input.antiCheatSensitivity,
    vivaFollowUpRequired: input.vivaFollowUpRequired
  })).digest("hex");
}

function insertValues(stableId: string, version: number, input: QuestionInput, adminUserId: string) {
  return [
    stableId, version, input.role, input.title, input.category, input.section, input.difficulty,
    input.prompt, input.instructions || null, input.sourceMaterial || null, input.answerType,
    input.expectedTimeMinutes, input.maximumScore, input.required, input.randomizationEligible,
    input.backNavigationRule, JSON.stringify(input.variants), JSON.stringify(input.scoringRubric),
    JSON.stringify(input.autoScoringRule), input.expectedCompetencies, input.humanReviewRequired,
    input.antiCheatSensitivity, input.vivaFollowUpRequired, input.displayOrder, contentHash(input),
    input.changeReason, adminUserId
  ];
}

const insertQuestionSql = `insert into hiring_assessment_questions(
  stable_question_id,version,role_key,title,category,section,difficulty,prompt,instructions,
  source_material,answer_type,expected_time_minutes,maximum_score,required,randomization_eligible,
  back_navigation_rule,variants,scoring_rubric,auto_scoring_rule,expected_competencies,
  human_review_required,anti_cheat_sensitivity,viva_follow_up_required,display_order,protected,
  active,lifecycle_status,created_source,content_hash,change_reason,created_by_admin_user_id
) values(
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19::jsonb,
  $20,$21,$22,$23,$24,false,false,'draft','admin',$25,$26,$27
) returning id`;

function currentAsInput(current: CurrentQuestion, changeReason: string): QuestionInput {
  return questionInputSchema.parse({
    role: current.role_key,
    title: current.title,
    category: current.category,
    section: current.section,
    difficulty: current.difficulty,
    prompt: current.prompt,
    instructions: current.instructions || "",
    sourceMaterial: current.source_material || "",
    answerType: current.answer_type,
    expectedTimeMinutes: current.expected_time_minutes,
    maximumScore: Number(current.maximum_score),
    required: current.required,
    randomizationEligible: current.randomization_eligible,
    backNavigationRule: current.back_navigation_rule,
    variants: current.variants || [],
    scoringRubric: current.scoring_rubric || {},
    autoScoringRule: current.auto_scoring_rule || {},
    expectedCompetencies: current.expected_competencies || [],
    humanReviewRequired: current.human_review_required,
    antiCheatSensitivity: current.anti_cheat_sensitivity,
    vivaFollowUpRequired: current.viva_follow_up_required,
    displayOrder: current.display_order,
    active: false,
    changeReason
  });
}

export async function createCustomQuestion(input: QuestionInput, adminUserId: string) {
  const parsed = questionInputSchema.parse(input);
  const stableId = `WXQ-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const result = await dbQuery<{ id: string }>(insertQuestionSql, insertValues(stableId, 1, parsed, adminUserId));
  await dbQuery(
    `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
     values('admin',$1,'question_draft_created','assessment_question',$2,$3::jsonb)`,
    [adminUserId, stableId, JSON.stringify({ version: 1, lifecycleStatus: "draft", reason: parsed.changeReason })]
  );
  return { id: result.rows[0].id, stableQuestionId: stableId, version: 1, lifecycleStatus: "draft" };
}

export async function mutateQuestion(
  stableQuestionId: string,
  input: z.infer<typeof questionMutationSchema>,
  adminUserId: string
) {
  const parsed = questionMutationSchema.parse(input);
  return withDbTransaction(async (query) => {
    await query("select pg_advisory_xact_lock(hashtext($1))", [`hiring-question:${stableQuestionId}`]);
    const rows = await query<CurrentQuestion>(
      `select q.id,q.version,q.protected,q.role_key,q.title,q.category,q.section,q.difficulty,
         q.prompt,q.instructions,q.source_material,q.answer_type,q.expected_time_minutes,
         q.maximum_score::text,q.required,q.randomization_eligible,q.back_navigation_rule,
         q.variants,q.scoring_rubric,q.auto_scoring_rule,q.expected_competencies,
         q.human_review_required,q.anti_cheat_sensitivity,q.viva_follow_up_required,q.active,
         q.lifecycle_status,q.display_order,
         (select count(*)::int from hiring_assessment_answers answer where answer.question_id=q.id) as usage
       from hiring_assessment_questions q
       where q.stable_question_id=$1 and q.archived_at is null
       order by q.version desc limit 1 for update`,
      [stableQuestionId]
    );
    const current = rows[0];
    if (!current) throw new ApiError(404, "NOT_FOUND", "Question was not found.");

    if (parsed.operation === "duplicate") {
      const duplicateId = `WXQ-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
      const duplicate = currentAsInput(current, parsed.reason);
      const inserted = await query<{ id: string }>(insertQuestionSql, insertValues(duplicateId, 1, duplicate, adminUserId));
      await query(
        `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
         values('admin',$1,'question_duplicated','assessment_question',$2,$3::jsonb)`,
        [adminUserId, duplicateId, JSON.stringify({ sourceStableQuestionId: stableQuestionId, sourceVersion: current.version, reason: parsed.reason })]
      );
      return { id: inserted[0].id, stableQuestionId: duplicateId, version: 1, lifecycleStatus: "draft" };
    }

    if (parsed.operation === "reorder") {
      await query("update hiring_assessment_questions set display_order=$2 where id=$1", [current.id, parsed.displayOrder]);
      await query(
        `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
         values('admin',$1,'question_reordered','assessment_question',$2,$3::jsonb)`,
        [adminUserId, stableQuestionId, JSON.stringify({ version: current.version, previousOrder: current.display_order, displayOrder: parsed.displayOrder, reason: parsed.reason })]
      );
      return { stableQuestionId, version: current.version, displayOrder: parsed.displayOrder };
    }

    if (parsed.operation === "publish" || parsed.operation === "set_active") {
      const active = parsed.operation === "publish" ? true : parsed.active;
      await query(
        `update hiring_assessment_questions
         set active=false,lifecycle_status=case when lifecycle_status='active' then 'published' else lifecycle_status end
         where stable_question_id=$1 and archived_at is null`,
        [stableQuestionId]
      );
      await query(
        `update hiring_assessment_questions set active=$2,lifecycle_status=$3,
           published_at=case when $2 then coalesce(published_at,now()) else published_at end,
           published_by_admin_user_id=case when $2 then $4 else published_by_admin_user_id end
         where id=$1`,
        [current.id, active, active ? "active" : "disabled", adminUserId]
      );
      const reason = parsed.reason;
      await query(
        `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
         values('admin',$1,$2,'assessment_question',$3,$4::jsonb)`,
        [adminUserId, active ? "question_version_published" : "question_disabled", stableQuestionId, JSON.stringify({ version: current.version, reason })]
      );
      return { stableQuestionId, version: current.version, active, lifecycleStatus: active ? "active" : "disabled" };
    }

    if (current.protected) {
      throw new ApiError(403, "FORBIDDEN", "Protected base questions cannot be edited, versioned or archived.");
    }

    if (parsed.operation === "archive") {
      await query(
        "update hiring_assessment_questions set active=false,lifecycle_status='archived',archived_at=now() where stable_question_id=$1 and archived_at is null",
        [stableQuestionId]
      );
      await query(
        `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
         values('admin',$1,'question_archived','assessment_question',$2,$3::jsonb)`,
        [adminUserId, stableQuestionId, JSON.stringify({ version: current.version, reason: parsed.reason })]
      );
      return { stableQuestionId, version: current.version, archived: true };
    }

    if (parsed.operation === "update_draft") {
      if (current.lifecycle_status !== "draft" || current.usage > 0) {
        throw new ApiError(409, "BAD_REQUEST", "Only an unused draft can be edited. Create a new version instead.");
      }
      const next = parsed.input;
      await query(
        `update hiring_assessment_questions set
           role_key=$2,title=$3,category=$4,section=$5,difficulty=$6,prompt=$7,instructions=$8,
           source_material=$9,answer_type=$10,expected_time_minutes=$11,maximum_score=$12,required=$13,
           randomization_eligible=$14,back_navigation_rule=$15,variants=$16::jsonb,
           scoring_rubric=$17::jsonb,auto_scoring_rule=$18::jsonb,expected_competencies=$19,
           human_review_required=$20,anti_cheat_sensitivity=$21,viva_follow_up_required=$22,
           display_order=$23,content_hash=$24,change_reason=$25
         where id=$1`,
        [current.id, ...insertValues(stableQuestionId, current.version, next, adminUserId).slice(2, 24), contentHash(next), next.changeReason]
      );
      await query(
        `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
         values('admin',$1,'question_draft_updated','assessment_question',$2,$3::jsonb)`,
        [adminUserId, stableQuestionId, JSON.stringify({ version: current.version, reason: next.changeReason })]
      );
      return { stableQuestionId, version: current.version, lifecycleStatus: "draft" };
    }

    const next = parsed.input;
    const version = current.version + 1;
    const inserted = await query<{ id: string }>(insertQuestionSql, insertValues(stableQuestionId, version, next, adminUserId));
    await query(
      `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
       values('admin',$1,'question_version_created','assessment_question',$2,$3::jsonb)`,
      [adminUserId, stableQuestionId, JSON.stringify({ previousVersion: current.version, newVersion: version, reason: next.changeReason })]
    );
    return { id: inserted[0].id, stableQuestionId, version, lifecycleStatus: "draft" };
  });
}
