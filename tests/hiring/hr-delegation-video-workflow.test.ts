import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { AdminSession } from "../../lib/auth";
import { canUseHiringPermission } from "../../lib/admin/permissions";
import { getVisibleAdminNavigation } from "../../lib/admin/navigation";
import { getHiringWorkflow } from "../../lib/hiring/workflow";

const source=(file:string)=>readFile(path.join(process.cwd(),file),"utf8");
function session(role:string,hiringRole?:string):AdminSession{return{kind:"admin",adminUserId:"11111111-1111-4111-8111-111111111111",email:"uat@example.invalid",role,hiringRole,mustChangePassword:false};}

test("delegated hiring roles do not mutate the global Website Admin role",()=>{
  const delegated=session("viewer","hr_admin");
  assert.equal(delegated.role,"viewer");
  assert.equal(canUseHiringPermission(delegated,"hiring.applications.manage"),true);
  assert.equal(canUseHiringPermission(session("viewer","read_only_auditor"),"hiring.applications.manage"),false);
});

test("Hiring access grant retains the submitted form across the async request",async()=>{
  const manager=await source("components/admin/HiringAccessManager.tsx");
  assert.match(manager,/const formElement = event\.currentTarget/);
  assert.match(manager,/formElement\.reset\(\); await refresh\(\)/);
  assert.doesNotMatch(manager,/event\.currentTarget\.reset\(\)/);
  assert.doesNotMatch(manager,/window\.prompt/);
  assert.match(manager,/Revoke Hiring access/);
});

test("delegated HR sees only the compact Hiring navigation",()=>{
  const groups=getVisibleAdminNavigation({role:"viewer",hiringRole:"hr_admin",hiringEnabled:true});
  assert.deepEqual(groups.map(group=>group.href),["/admin/hiring"]);
  assert.deepEqual(groups[0].items.map(item=>item.label),["Overview","Candidates","Assessments","Interviews","Talent Pool","Settings"]);
  assert.equal(groups[0].advancedItems.length,0);
});

test("Primary Admin can reset a secondary Hiring password without retaining plaintext",async()=>{
  const [manager,route,access,migration,adminLayout]=await Promise.all([
    source("components/admin/HiringAccessManager.tsx"),
    source("app/api/admin/hiring/access/route.ts"),
    source("lib/hiring/access.ts"),
    source("database/migrations/20260831_smart_hiring_hr_delegation_and_video.sql"),
    source("app/admin/layout.tsx")
  ]);
  assert.match(manager,/Set \/ Change \/ Reset password/);
  assert.match(manager,/The current password cannot be viewed/);
  assert.doesNotMatch(manager,/localStorage|sessionStorage/);
  assert.match(route,/resetHiringAdminPassword/);
  assert.match(route,/hiring_secondary_password_reset/);
  assert.match(access,/hashAdminPassword\(input\.newPassword\)/);
  assert.match(access,/must_change_password=true/);
  assert.match(access,/session_version=session_version\+1/);
  assert.match(migration,/session_version integer not null default 0/);
  assert.match(adminLayout,/pathname\.startsWith\("\/admin\/hiring"\)/);
  assert.match(adminLayout,/redirect\("\/admin\/hiring"\)/);
});

test("Sales workflow blocks eligibility until video and human review exist",()=>{
  const missing=getHiringWorkflow({role:"sales_executive",stage:"application_received",assignedReviewer:true});
  assert.equal(missing.blockers[0].code,"SALES_VIDEO_MISSING");
  const pending=getHiringWorkflow({role:"sales_executive",stage:"application_received",assignedReviewer:true,hasSalesVideo:true});
  assert.equal(pending.blockers[0].code,"SALES_VIDEO_REVIEW_PENDING");
  const ready=getHiringWorkflow({role:"sales_executive",stage:"application_received",assignedReviewer:true,hasSalesVideo:true,hasSalesVideoReview:true});
  assert.equal(ready.next.label,"Complete eligibility");
});

test("Academic Writer workflow has no Sales video blocker",()=>{
  const writer=getHiringWorkflow({role:"academic_writer",stage:"application_received",assignedReviewer:true});
  assert.equal(writer.blockers.some(item=>item.code.startsWith("SALES_VIDEO")),false);
});

test("video implementation is private, governed, consented and human-only",async()=>{
  const [migration,form,route,operations,policy,applicationRoute]=await Promise.all([
    source("database/migrations/20260831_smart_hiring_hr_delegation_and_video.sql"),
    source("components/hiring/VideoIntroductionField.tsx"),
    source("app/api/admin/hiring/video-reviews/route.ts"),
    source("lib/hiring/operations.ts"),
    source("lib/hiring/video-policy.ts"),
    source("app/api/hiring/applications/route.ts")
  ]);
  assert.match(migration,/video_introduction/);assert.match(migration,/hiring_video_reviews/);
  assert.match(migration,/retention_review_at/);
  assert.match(migration,/select tableowner/);assert.match(migration,/alter table %I owner to %I/);
  assert.match(form,/getUserMedia/);assert.match(form,/policy\.targetMinSeconds/);assert.match(form,/policy\.targetMaxSeconds/);assert.match(form,/Record/);assert.match(form,/Upload/);
  assert.match(policy,/targetMinSeconds: 60/);assert.match(policy,/targetMaxSeconds: 120/);assert.match(policy,/retentionDays: 365/);
  assert.match(applicationRoute,/getSalesVideoPolicy/);assert.match(applicationRoute,/validateHiringFile\(videoIntroduction,[\s\S]*videoPolicy\)/);
  assert.match(await source("lib/hiring/public-applications.ts"),/make_interval\(days => \$10::integer\)/);
  assert.match(route,/automatedInference:false/);assert.doesNotMatch(route,/body.language|emotion|facial/i);
  assert.match(operations,/Watch the private Sales video/);
  assert.match(operations,/destinationStage==="eligibility_review"\)await assertSalesVideoReady\(application\)/);
});

test("every Hiring API except Super Admin access and rules resolves delegated access live",async()=>{
  const files=["operations/route.ts","applications/[reference]/route.ts","applications/export.csv/route.ts","files/[fileId]/route.ts","files/[fileId]/preview/route.ts"];
  for(const file of files)assert.match(await source(`app/api/admin/hiring/${file}`),/getHiringAdminSessionFromRequest/);
});
