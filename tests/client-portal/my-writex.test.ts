import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { normalizeWhatsapp } from "../../lib/client/identifiers";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

function sha256(file: string) {
  return createHash("sha256").update(source(file)).digest("hex");
}

test("phone normalization supports international E.164 and existing Indian formats", () => {
  assert.equal(normalizeWhatsapp("+44 7700 900001"), "+447700900001");
  assert.equal(normalizeWhatsapp("0044 7700 900001"), "+447700900001");
  assert.equal(normalizeWhatsapp("+91 98742 13123"), "+919874213123");
  assert.equal(normalizeWhatsapp("9874213123"), "+919874213123");
  assert.equal(normalizeWhatsapp("98742abc13123"), "");
});

test("the client login visual shell remains frozen while the first label supports both identifiers", () => {
  assert.equal(
    sha256("components/auth/AuthShell.tsx"),
    "7e15149b5caffb1b534ae666fe05c01ba5e7fdb136bbd2f6213f33e236bb6542"
  );
  assert.equal(
    sha256("components/auth/DesignerLoginThemeRenderer.tsx"),
    "120fbdfd203cdb0cc4354864df8ffc025a4484d528f51ac29d5ac37988b611f8"
  );
  const login = source("components/client/ClientLoginForm.tsx");
  assert.match(login, /label="Invoice Number \/ WriteX ID"/);
  assert.match(login, /Sign In Securely/);
  assert.match(login, /Registered Mobile Number/);
  assert.doesNotMatch(login, /tablist|Invoice Login|WriteX ID Login/);
});

test("the resolver returns distinct invoice and customer session scopes with one generic failure", () => {
  const login = source("app/api/client/auth/login/route.ts");
  assert.match(login, /authScope: "invoice"/);
  assert.match(login, /authScope: "customer"/);
  assert.match(login, /resolveDevelopmentInvoice/);
  assert.match(login, /resolveDevelopmentCustomer/);
  assert.ok(
    login.indexOf("const fixtureInvoice = resolveDevelopmentInvoice") <
      login.indexOf("const fixtureCustomer = resolveDevelopmentCustomer")
  );
  assert.match(login, /We couldn't verify those details\. Please check them and try again\./);
  assert.doesNotMatch(login, /phone exists|WriteX ID exists|which field/i);
});

test("development fixtures require an explicit local flag and hard-stop in production", () => {
  const fixture = source("lib/my-writex/dev-fixture.ts");
  assert.match(fixture, /process\.env\.NODE_ENV !== "production"/);
  assert.match(fixture, /process\.env\.MY_WRITEX_DEV_FIXTURES === "true"/);
  assert.match(fixture, /CUST-TEST-001/);
  assert.match(fixture, /rahulsharma\.7k2/);
  assert.match(fixture, /\+447700900001/);
});

test("server authorization separates invoice and customer APIs", () => {
  const auth = source("lib/auth/index.ts");
  assert.match(auth, /assertInvoiceClientSession/);
  assert.match(auth, /assertCustomerClientSession/);
  assert.match(auth, /verifyInvoiceClientSessionFromRequest/);
  assert.match(auth, /verifyCustomerClientSessionFromRequest/);

  for (const file of [
    "app/api/client/overview/route.ts",
    "app/api/client/project/route.ts",
    "app/api/client/files/route.ts",
    "app/api/client/invoices/route.ts",
    "app/api/client/download/[invoiceId]/route.ts"
  ]) {
    assert.match(source(file), /verifyInvoiceClientSessionFromRequest/);
  }
  for (const file of [
    "app/api/my-writex/home/route.ts",
    "app/api/my-writex/projects/route.ts",
    "app/api/my-writex/projects/[projectId]/route.ts",
    "app/api/my-writex/profile/route.ts"
  ]) {
    assert.match(source(file), /verifyCustomerClientSessionFromRequest/);
  }
});

test("customer and project URL ownership are checked on the server", () => {
  const customerRoute = source(
    "app/api/my-writex/customers/[customerMasterId]/route.ts"
  );
  assert.match(customerRoute, /customerMasterId\) !== session\.customerMasterId/);
  assert.match(customerRoute, /throw forbidden/);

  const fixture = source("lib/my-writex/dev-fixture.ts");
  assert.match(fixture, /project\.customerMasterId === authorizedCustomer\.customerMasterId/);
  const projectRoute = source("app/api/my-writex/projects/[projectId]/route.ts");
  assert.match(projectRoute, /if \(!project\) throw forbidden/);
});

test("development sessions are opaque, expiring, rotatable and revocable", () => {
  const sessions = source("lib/my-writex/dev-sessions.ts");
  assert.match(sessions, /randomToken\(\)/);
  assert.match(sessions, /hashValue\(sessionToken\)/);
  assert.match(sessions, /absoluteExpiresAt/);
  assert.match(sessions, /idleExpiresAt/);
  assert.match(sessions, /revokeDevelopmentClientSession/);
  assert.match(sessions, /rotateDevelopmentClientSession/);
});

test("My WriteX uses a shared project detail system and does not touch employee login", () => {
  assert.match(source("app/client/overview/page.tsx"), /ProjectDetail/);
  assert.match(source("app/client/project/page.tsx"), /ProjectDetail/);
  assert.match(source("app/my-writex/projects/[projectId]/page.tsx"), /ProjectDetail/);
  assert.doesNotMatch(source("components/my-writex/ProjectDetail.tsx"), /employee/i);
});

test("Stage 2 project and document discovery stays fixture-backed and customer-scoped", () => {
  const projects = source("components/my-writex/ProjectsExplorer.tsx");
  for (const label of ["Active", "Upcoming", "Delivered", "Completed", "All"]) {
    assert.match(projects, new RegExp(`label: "${label}"`));
  }
  assert.match(projects, /Search projects/);
  assert.match(projects, /Filter by status/);
  assert.match(projects, /Soonest date/);

  const documents = source("components/my-writex/DocumentVault.tsx");
  assert.match(documents, /Search documents/);
  assert.match(documents, /Filter documents by type/);
  assert.match(documents, /Filter documents by project/);
  assert.doesNotMatch(documents, /download\//i);
});

test("Stage 2 local planners and preferences never call production mutations", () => {
  for (const file of [
    "components/my-writex/UpcomingWorkPlanner.tsx",
    "components/my-writex/ProfilePreferences.tsx",
    "components/my-writex/SupportRequests.tsx"
  ]) {
    const contents = source(file);
    assert.doesNotMatch(contents, /fetch\(|\/api\/|integrations\/lts|Customer Master write/i);
  }
  assert.match(source("components/my-writex/UpcomingWorkPlanner.tsx"), /localStorage/);
  assert.match(source("components/my-writex/ProfilePreferences.tsx"), /localStorage/);
  assert.doesNotMatch(source("app/my-writex/profile/page.tsx"), /customerMasterId/);
  const requirement = source("components/my-writex/RequirementDraft.tsx");
  assert.match(requirement, /\/api\/my-writex\/requests/);
  assert.doesNotMatch(requirement, /integrations\/lts|Customer Master write|notifications/i);
});

test("Stage 2A Project Room exposes verified quality and recovery without duplicating authorization", () => {
  const projectRoom = source("components/my-writex/ProjectDetail.tsx");
  for (const section of ["overview", "files", "invoice", "support"]) {
    assert.match(projectRoom, new RegExp(`id="${section}"`));
  }
  assert.match(projectRoom, /Ask a Question/);
  assert.match(projectRoom, /Request Revision/);
  assert.match(projectRoom, /Request Callback/);
  assert.match(projectRoom, /Order Similar Work/);
  const intelligence = source("components/my-writex/ProjectIntelligence.tsx");
  assert.match(intelligence, /id="quality"/);
  assert.match(intelligence, /Quality journey/);
  assert.match(intelligence, /Quality summary/);
  assert.match(intelligence, /Understand My Work/);
  assert.match(intelligence, /Viva Prep/);
  assert.match(intelligence, /Something does not feel right/);
  assert.match(source("lib/my-writex/dev-fixture.ts"), /timelineEvents\.slice\(0, currentIndex \+ 1\)/);
});

test("Stage 2A supports adaptive customer states and the five-area navigation model", () => {
  const home = source("components/my-writex/MyWritexHome.tsx");
  assert.match(home, /For You Today/);
  assert.match(home, /Jobs for You/);
  assert.match(home, /Current Work/);
  assert.match(home, /MyWritexConcierge/);

  const presentation = source("lib/my-writex/presentation.ts");
  for (const state of ["new", "active", "established", "no_active_project", "job_seeking", "payment_pressure", "quality_concern", "graduating"]) {
    assert.match(presentation, new RegExp(`"${state}"`));
  }

  const navigation = source("components/my-writex/MyWritexNavigation.tsx");
  for (const area of ["Home", "Work", "Career", "Plan", "My WriteX"]) {
    assert.match(navigation, new RegExp(`label: "${area}"`));
  }
  assert.match(navigation, /Mobile My WriteX navigation/);
  assert.match(navigation, /Open My WriteX menu/);
  assert.match(navigation, /ClientLogoutButton/);
});

test("Stage 2A career fixtures and interactions stay local and source-labelled", () => {
  const fixture = source("lib/my-writex/dev-fixture.ts");
  assert.match(fixture, /Graduate Business Analyst/);
  assert.match(fixture, /lastChecked/);
  assert.match(fixture, /Graduate Analyst CV/);
  assert.match(fixture, /applications:/);

  const career = source("components/my-writex/CareerExperience.tsx");
  assert.match(career, /Job Radar/);
  assert.match(career, /CV Studio/);
  assert.match(career, /ApplicationTracker/);
  assert.match(career, /InterviewPrep/);
  assert.match(career, /CareerConsultation/);
  assert.doesNotMatch(career, /fetch\(|\/api\/|integrations\/lts/i);
});

test("Stage 2A customer and invoice experiences reuse intelligence without crossing scope", () => {
  const projectRoom = source("components/my-writex/ProjectDetail.tsx");
  assert.match(projectRoom, /ProjectIntelligence project=\{project\} mode=\{mode\}/);
  assert.match(projectRoom, /My WriteX Lite/);
  assert.match(projectRoom, /invoice session remains safely limited/);
  assert.doesNotMatch(source("components/my-writex/ProjectIntelligence.tsx"), /fetch\(|\/api\/my-writex/);
});

test("Stage 2 interactive surfaces expose focus and reduced-motion safeguards", () => {
  for (const file of [
    "components/my-writex/MyWritexNavigation.tsx",
    "components/my-writex/MyWritexPrimitives.tsx",
    "components/my-writex/ProjectsExplorer.tsx",
    "components/my-writex/UpcomingWorkPlanner.tsx",
    "components/my-writex/RequirementDraft.tsx"
  ]) {
    assert.match(source(file), /focus-visible:(?:ring|outline)/);
  }
  assert.match(source("app/my-writex/loading.tsx"), /motion-reduce:animate-none/);
});
