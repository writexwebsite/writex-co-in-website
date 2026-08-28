import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { emptyRequirementFields } from "../../lib/my-writex/request-types";
import { normalizeRequirementTitle, safeRequestFileName, sanitizeRequestFiles, sanitizeRequirementFields, validateDeadline, validateRequestStep } from "../../lib/my-writex/request-validation";

function source(file: string) { return readFileSync(path.join(process.cwd(), file), "utf8"); }

test("Stage 3A request sources and lifecycle are explicit", () => {
  const types = source("lib/my-writex/request-types.ts");
  for (const value of ["new_requirement", "similar_project", "upcoming_work", "invoice_workspace"]) assert.match(types, new RegExp(`"${value}"`));
  for (const value of ["Draft", "Submitted", "Reviewing", "More Information Needed", "Ready for Discussion", "Quote Shared", "Accepted", "Closed", "Cancelled"]) assert.match(types, new RegExp(`"${value}"`));
});

test("request validation rejects past deadlines and incomplete wizard steps", () => {
  const fields = emptyRequirementFields();
  assert.ok(validateRequestStep(1, fields).length >= 3);
  assert.match(validateDeadline({ deadlineDate: "2026-01-01", deadlineTime: "10:00" }, new Date("2026-08-27T10:00:00")), /future/);
  assert.equal(validateDeadline({ deadlineDate: "2026-09-01", deadlineTime: "10:00" }, new Date("2026-08-27T10:00:00")), "");
});

test("requirement titles enforce capitalized words in the UI and persisted payload", () => {
  assert.equal(normalizeRequirementTitle("strategic management report"), "Strategic Management Report");
  assert.equal(normalizeRequirementTitle("MBA strategy report"), "MBA Strategy Report");
  assert.equal(sanitizeRequirementFields({ title: "strategic management report" }).title, "Strategic Management Report");
  const draft = source("components/my-writex/RequirementDraft.tsx");
  assert.match(draft, /autoCapitalize="words"/);
  assert.match(draft, /normalizeRequirementTitle\(e\.target\.value\)/);
  assert.match(draft, /Strategic Management Report/);
});

test("request file metadata is safe, bounded and never stores raw paths", () => {
  assert.equal(safeRequestFileName("../brief?.pdf"), "-brief_.pdf");
  const files = sanitizeRequestFiles([{ name: "C:\\private\\brief.pdf", size: 1024, mimeType: "application/pdf", purpose: "brief" }]);
  assert.equal(files[0].name, "C_-private-brief.pdf");
  assert.equal(files[0].uploadState, "stored");
  assert.throws(() => sanitizeRequestFiles([{ name: "malware.exe", size: 100, mimeType: "application/x-msdownload", purpose: "supporting" }]));
  assert.throws(() => sanitizeRequestFiles([{ name: "huge.pdf", size: 11 * 1024 * 1024, mimeType: "application/pdf", purpose: "brief" }]));
});

test("request truth hard-stops outside an explicit local or isolated demo fixture", () => {
  const repository = source("lib/my-writex/request-repository.ts");
  assert.match(repository, /isMyWritexFixtureEnabled/);
  assert.match(repository, /isMyWritexDemoFixtureEnabled/);
  assert.match(repository, /\.local[\s\S]*my-writex-stage3a[\s\S]*requests\.json/);
  assert.match(repository, /path\.isAbsolute\(configured\)/);
  assert.match(repository, /DEMO_MAX_STORE_BYTES/);
  assert.match(repository, /writeFile\(temporary/);
  assert.match(repository, /rename\(temporary, target\)/);
});

test("draft and submission lifecycle is stable and idempotent", () => {
  const repository = source("lib/my-writex/request-repository.ts");
  assert.match(repository, /candidate\.idempotencyKey === input\.idempotencyKey/);
  assert.match(repository, /status === "Draft"/);
  assert.match(repository, /return \{ record: structuredClone\(duplicate\), created: false \}/);
  assert.match(repository, /existingSequence/);
  assert.match(repository, /REQ-\$\{new Date\(now\)\.getUTCFullYear\(\)\}/);
  assert.match(repository, /upcomingDuplicate/);
  assert.match(repository, /record\.history\.push/);
  assert.match(repository, /record\.events\.push/);
});

test("customer and invoice request APIs enforce different scopes", () => {
  const customer = source("app/api/my-writex/requests/route.ts");
  const invoice = source("app/api/client/requests/route.ts");
  assert.match(customer, /verifyCustomerClientSessionFromRequest/);
  assert.doesNotMatch(customer, /verifyInvoiceClientSessionFromRequest/);
  assert.match(invoice, /verifyInvoiceClientSessionFromRequest/);
  assert.doesNotMatch(invoice, /verifyCustomerClientSessionFromRequest/);
  const validator = source("lib/my-writex/request-api.ts");
  assert.match(validator, /That source project is not available for this customer/);
  assert.match(validator, /That upcoming-work item is not available for this customer/);
  assert.match(validator, /input\.source !== "invoice_workspace"/);
  assert.match(validator, /input\.sourceInvoiceReference = session\.invoiceId/);
});

test("the customer journey is four steps with safe review, autosave, discard and manager handoff", () => {
  const wizard = source("components/my-writex/RequirementDraft.tsx");
  for (const label of ["What you need", "Scope & deadline", "Brief & files", "Review"]) assert.match(wizard, new RegExp(label.replace(/[&]/g, "&")));
  assert.match(wizard, /operation: "save_draft"/);
  assert.match(wizard, /Discard Draft/);
  assert.match(wizard, /window\.confirm/);
  assert.match(wizard, /Send to My WriteX Manager/);
  assert.match(wizard, /Your requirement has been sent to Aman/);
  assert.match(wizard, /No real message, quote, payment request or production record/);
});

test("repeat revenue entry points preserve source and omit unsafe historic fields", () => {
  const page = source("app/my-writex/new-requirement/page.tsx");
  assert.match(page, /fromProject/);
  assert.match(page, /fromUpcoming/);
  assert.match(page, /source = "similar_project"/);
  assert.match(page, /source = "upcoming_work"/);
  assert.doesNotMatch(page, /payment|invoice|credentials|delivered/i);
  assert.match(source("components/my-writex/ProjectDetail.tsx"), /Order Similar Work/);
  assert.match(source("components/my-writex/UpcomingWorkPlanner.tsx"), /Requirement Created/);
});

test("My Requests is list-led with scoped detail, timeline and information response", () => {
  const list = source("components/my-writex/RequestsExperience.tsx");
  for (const tab of ["Active", "Waiting for Me", "Resolved", "All"]) assert.match(list, new RegExp(`"${tab}"`));
  const detail = source("components/my-writex/RequestDetailExperience.tsx");
  assert.match(detail, /Request history/);
  assert.match(detail, /More Information Needed/);
  assert.match(detail, /Send Response/);
  assert.match(source("app/my-writex/requests/[requestRef]/page.tsx"), /findRequest\(requestOwnerFromSession\(session\)/);
});

test("invoice continuation and request centre remain invoice-scoped", () => {
  const detail = source("components/my-writex/ProjectDetail.tsx");
  for (const label of ["Start Another Work", "Order Similar Work", "View Requests", "Contact WriteX"]) assert.match(detail, new RegExp(label));
  const page = source("app/client/request/page.tsx");
  assert.match(page, /requireInvoiceClientSession/);
  assert.match(page, /source="invoice_workspace"/);
  assert.doesNotMatch(page, /getMyWritexCustomer|customerMasterId/);
});

test("manager inspector is local or separately gated in the isolated demo", () => {
  const page = source("app/dev/my-writex-requests/page.tsx");
  assert.match(page, /isMyWritexDevFixtureEnabled/);
  assert.match(page, /isMyWritexDemoFixtureEnabled/);
  assert.match(page, /hasMyWritexDemoReviewAccessFromCookies/);
  assert.match(page, /DemoReviewAccessForm/);
  const inspector = source("components/my-writex/RequestInspector.tsx");
  for (const label of ["Manager queue", "Update status", "Request information", "Internal note", "History"]) assert.match(inspector, new RegExp(label));
  const types = source("lib/my-writex/request-types.ts");
  assert.doesNotMatch(types.match(/export type MyWritexRequestEvent = \{[\s\S]*?\};/)?.[0] || "", /brief|body|phone|email|fullText/i);
});
