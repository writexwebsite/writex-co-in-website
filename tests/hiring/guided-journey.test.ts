import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hiringOperationSchema } from "../../lib/hiring/operations-schema";
import { questionInputSchema, questionMutationSchema } from "../../lib/hiring/question-bank-schema";

test("Admin Review and Final Decision are separate validated actions",()=>{
  assert.equal(hiringOperationSchema.safeParse({resource:"admin_review",applicationReference:"WX-HR-TEST123",decision:"accept",recommendationAction:"confirm",structuredNotes:{strengths:"Clear reasoning"},reason:"Human review completed"}).success,true);
  assert.equal(hiringOperationSchema.safeParse({resource:"admin_review",applicationReference:"WX-HR-TEST123",decision:"reject",recommendationAction:"override",structuredNotes:{},reason:"Override attempted without evidence"}).success,false);
  assert.equal(hiringOperationSchema.safeParse({resource:"final_decision",applicationReference:"WX-HR-TEST123",outcome:"selected",reason:"Admin review and interview evidence support selection",explicitConfirmation:true}).success,true);
  assert.equal(hiringOperationSchema.safeParse({resource:"final_decision",applicationReference:"WX-HR-TEST123",outcome:"selected",reason:"Unconfirmed decision",explicitConfirmation:false}).success,false);
});

test("question lifecycle supports rich drafts and exact publish operations",()=>{
  const question={role:"academic_writer",title:"Source analysis",category:"source_reading",section:"written",difficulty:"advanced",prompt:"Evaluate the supplied argument.",instructions:"Explain the evidence used.",sourceMaterial:"A candidate-safe source extract.",answerType:"source_based_response",expectedTimeMinutes:20,maximumScore:100,required:true,randomizationEligible:true,backNavigationRule:"locked_after_next",variants:[],scoringRubric:{criteria:"Reasoning and source use"},autoScoringRule:{},expectedCompetencies:["analysis"],humanReviewRequired:true,antiCheatSensitivity:"standard",vivaFollowUpRequired:false,displayOrder:20,active:false,changeReason:"Create a reviewed role question"};
  assert.equal(questionInputSchema.safeParse(question).success,true);
  assert.equal(questionMutationSchema.safeParse({operation:"update_draft",input:question}).success,true);
  assert.equal(questionMutationSchema.safeParse({operation:"publish",reason:"Approved exact version after preview"}).success,true);
  assert.equal(questionMutationSchema.safeParse({operation:"duplicate",reason:"Create a separate candidate-safe draft"}).success,true);
  assert.equal(questionMutationSchema.safeParse({operation:"reorder",displayOrder:30,reason:"Align section order"}).success,true);
});

test("candidate workspace exposes every guided review section",()=>{
  const page=readFileSync(new URL("../../app/admin/hiring/applications/[reference]/page.tsx",import.meta.url),"utf8");
  for(const label of ["Application","CV & Files","Eligibility","Assessment","System Review","Integrity","Interview / Viva","Admin Review","Decision","Communication","History"]){assert.match(page,new RegExp(label.replace(/[&/]/g,"\\$&")));}
  assert.match(page,/CandidateReviewControls/);
  assert.match(page,/candidateOperationView/);
  assert.match(page,/view=\{operationView\}/);
  assert.match(page,/finalDecisionReady/);
  assert.match(page,/stage==="shortlisted"&&hasAdminReview/);
  assert.match(page,/stage==="interview_scheduled"&&hasAdminReview/);
});

test("accepted Admin Reviews require Viva or interview completion before Final Decision",()=>{
  const operations=readFileSync(new URL("../../lib/hiring/operations.ts",import.meta.url),"utf8");
  const controls=readFileSync(new URL("../../components/admin/CandidateReviewControls.tsx",import.meta.url),"utf8");
  assert.match(operations,/\["accept","request_viva"\]\.includes\(input\.decision\)/);
  assert.match(operations,/application\.current_stage!=="interview_completed"/);
  assert.match(operations,/Complete the required Viva or interview before recording the Final Decision/);
  assert.match(controls,/!hasAdminReview\|\|!finalDecisionReady/);
});

test("visible interview completion includes a structured scorecard",()=>{
  const consoleSource=readFileSync(new URL("../../components/admin/HiringOperationsConsole.tsx",import.meta.url),"utf8");
  const operations=readFileSync(new URL("../../lib/hiring/operations.ts",import.meta.url),"utf8");
  for(const field of ["scoreCommunication","scoreRoleKnowledge","scoreProblemSolving","scoreIntegrity"]){
    assert.match(consoleSource,new RegExp(field));
  }
  assert.match(consoleSource,/clean\.scores=scores/);
  assert.match(operations,/Complete the structured interview scorecard before finishing the interview/);
  assert.match(operations,/returning id/);
  assert.match(operations,/The interview was not found for this candidate/);
  assert.match(operations,/\["no_show","cancel"\]\.includes\(input\.action\)/);
  assert.match(operations,/current_stage='shortlisted'/);
});

test("completed decisions do not show stale interview guidance",()=>{
  const page=readFileSync(new URL("../../app/admin/hiring/applications/[reference]/page.tsx",import.meta.url),"utf8");
  const controls=readFileSync(new URL("../../components/admin/CandidateReviewControls.tsx",import.meta.url),"utf8");
  assert.match(page,/hasFinalDecision=\{Boolean\(item\.finalDecision\)\}/);
  assert.match(page,/The completed interview is ready for an authorised Final Decision/);
  assert.match(controls,/hasFinalDecision\|\|!hasAdminReview\|\|!finalDecisionReady/);
  assert.match(controls,/The final decision is already recorded/);
});

test("manual stage changes and retry-sensitive actions fail safely",()=>{
  const operations=readFileSync(new URL("../../lib/hiring/operations.ts",import.meta.url),"utf8");
  assert.match(operations,/manualStageTransitions/);
  assert.match(operations,/assertManualStageTransition/);
  assert.match(operations,/hiring-stage:/);
  assert.match(operations,/This candidate was updated in another session/);
  assert.match(operations,/Allowed next stages/);
  assert.match(operations,/hiring-interview-schedule:/);
  assert.match(operations,/An interview is already scheduled\. Choose Reschedule/);
  assert.match(operations,/hiring-final-decision:/);
  assert.match(operations,/idempotent:true/);
});

test("public guided journey includes stable assessment and privacy routes",()=>{
  const assessment=readFileSync(new URL("../../app/careers/assessment/page.tsx",import.meta.url),"utf8");
  const privacy=readFileSync(new URL("../../app/careers/privacy/page.tsx",import.meta.url),"utf8");
  assert.match(assessment,/candidate-specific/);
  assert.match(privacy,/System Review and Admin Review are separate/);
});

test("migration is additive and stores three independent decision records",()=>{
  const migration=readFileSync(new URL("../../database/migrations/20260811_smart_hiring_guided_journey.sql",import.meta.url),"utf8");
  assert.match(migration,/create table if not exists hiring_system_reviews/);
  assert.match(migration,/create table if not exists hiring_admin_reviews/);
  assert.match(migration,/create table if not exists hiring_final_decisions/);
  assert.doesNotMatch(migration,/drop table/i);
});
