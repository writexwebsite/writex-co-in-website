import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildMergeImpactPreview,
  checkWriteXIdAvailability,
  classifyPortalIdentifier,
  normalizeRegisteredPhone,
  normalizeWriteXId,
  suggestDuplicateCustomers,
} from "../../lib/my-writex/integration/customer-identity";
import {
  GENERIC_AUTH_FAILURE,
  MyWritexContractError,
  type MyWritexPrincipal,
} from "../../lib/my-writex/integration/contract";
import { LocalMockMyWritexAdapter } from "../../lib/my-writex/integration/mock-adapter";

process.env.MY_WRITEX_DEV_FIXTURES = "true";

const CUSTOMER_A_ID = "rahulsharma.7k2";
const CUSTOMER_A_PHONE = "+447700900001";
const CUSTOMER_B_ID = "sarahjones.9m4";
const CUSTOMER_B_PHONE = "+447700900002";
const INVOICE_A = "WX-MW-1001";

function adapter() {
  return new LocalMockMyWritexAdapter({
    nodeEnv: "test",
    fixturesEnabled: true,
    now: () => new Date("2026-08-27T12:00:00.000Z"),
  });
}

function expectContractError(
  operation: () => unknown,
  code: MyWritexContractError["code"],
) {
  assert.throws(operation, (error) => {
    assert.ok(error instanceof MyWritexContractError);
    assert.equal(error.code, code);
    return true;
  });
}

test("WriteX IDs normalize and availability is case-insensitively unique", () => {
  assert.equal(normalizeWriteXId("  @Rahul.Sharma  "), "rahul.sharma");
  const unavailable = checkWriteXIdAvailability("RAHUL.SHARMA", ["rahul.sharma"]);
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.reason, "unavailable");
  assert.deepEqual(
    unavailable.suggestions,
    checkWriteXIdAvailability("RAHUL.SHARMA", ["rahul.sharma"]).suggestions,
  );
  assert.equal(checkWriteXIdAvailability("invoice123", []).available, false);
});

test("registered phones normalize only explicit international values", () => {
  assert.equal(normalizeRegisteredPhone("+44 (7700) 900001"), CUSTOMER_A_PHONE);
  assert.equal(normalizeRegisteredPhone("0044 7700 900001"), CUSTOMER_A_PHONE);
  assert.equal(normalizeRegisteredPhone("07700 900001"), null);
  assert.equal(normalizeRegisteredPhone("+44abc"), null);
});

test("invoice identifiers and WriteX IDs resolve to distinct scopes", () => {
  assert.equal(classifyPortalIdentifier("wx-mw-1001").kind, "invoice");
  assert.equal(classifyPortalIdentifier("RahulSharma.7k2").kind, "writex_id");
  const mock = adapter();
  assert.equal(mock.resolveAuth(INVOICE_A, CUSTOMER_A_PHONE).scope, "invoice");
  assert.equal(mock.resolveAuth(CUSTOMER_A_ID, CUSTOMER_A_PHONE).scope, "customer");
});

test("all invalid authentication combinations return one generic error", () => {
  const mock = adapter();
  const attempts = [
    () => mock.resolveAuth("unknown.user", CUSTOMER_A_PHONE),
    () => mock.resolveAuth(CUSTOMER_A_ID, "+447700900099"),
    () => mock.resolveAuth("WX-MW-9999", CUSTOMER_A_PHONE),
    () => mock.resolveAuth(CUSTOMER_A_ID, "not-a-phone"),
  ];
  for (const attempt of attempts) {
    assert.throws(attempt, (error) => {
      assert.ok(error instanceof MyWritexContractError);
      assert.equal(error.code, "AUTHENTICATION_FAILED");
      assert.equal(error.status, 401);
      assert.equal(error.message, GENERIC_AUTH_FAILURE);
      return true;
    });
  }
});

test("invoice scope exposes only its own project, invoice and documents", () => {
  const mock = adapter();
  const invoice = mock.resolveAuth(INVOICE_A, CUSTOMER_A_PHONE);
  const projects = mock.listProjects(invoice);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].invoiceReference, INVOICE_A);
  assert.deepEqual(mock.listInvoices(invoice).map((item) => item.invoiceReference), [INVOICE_A]);
  assert.ok(
    mock
      .listDocuments(invoice)
      .every((item) => item.projectPublicRef === projects[0].publicRef),
  );
  expectContractError(
    () => mock.getProject(invoice, "project-dissertation-chapter-four"),
    "NOT_FOUND",
  );
});

test("customer scope exposes all and only that customer's objects", () => {
  const mock = adapter();
  const customerA = mock.resolveAuth(CUSTOMER_A_ID, CUSTOMER_A_PHONE);
  assert.ok(mock.listProjects(customerA).length > 1);
  assert.ok(mock.listInvoices(customerA).length > 1);
  assert.ok(mock.listDocuments(customerA).length > 1);
  assert.equal(mock.getMe(customerA).scope, "customer");
});

test("Customer A and Customer B remain separated", () => {
  const mock = adapter();
  const customerA = mock.resolveAuth(CUSTOMER_A_ID, CUSTOMER_A_PHONE);
  const customerB = mock.resolveAuth(CUSTOMER_B_ID, CUSTOMER_B_PHONE);
  assert.ok(mock.listProjects(customerA).length > 0);
  assert.equal(mock.listProjects(customerB).length, 0);
  assert.notEqual(customerA.sessionRef, customerB.sessionRef);

  const forged: MyWritexPrincipal = {
    ...customerA,
    customerMasterId: customerB.customerMasterId,
  };
  expectContractError(() => mock.listProjects(forged), "NOT_FOUND");
});

test("project authorization does not reveal another customer's project", () => {
  const mock = adapter();
  const customerB = mock.resolveAuth(CUSTOMER_B_ID, CUSTOMER_B_PHONE);
  expectContractError(
    () => mock.getProject(customerB, "project-research-proposal"),
    "NOT_FOUND",
  );
});

test("request authorization separates customer and invoice owners", () => {
  const mock = adapter();
  const customer = mock.resolveAuth(CUSTOMER_A_ID, CUSTOMER_A_PHONE);
  const invoice = mock.resolveAuth(INVOICE_A, CUSTOMER_A_PHONE);
  const created = mock.createRequest(
    invoice,
    { title: "Invoice delivery question", type: "Support" },
    "invoice-request-one",
  );
  assert.equal(mock.getRequest(invoice, created.requestRef).requestRef, created.requestRef);
  expectContractError(() => mock.getRequest(customer, created.requestRef), "NOT_FOUND");
});

test("OpenAPI draft contains a valid versioned contract surface", () => {
  const yaml = readFileSync(
    path.join(process.cwd(), "MY_WRITEX_LTS_API_CONTRACT.yaml"),
    "utf8",
  );
  assert.match(yaml, /^openapi: ["']?3\.1\.0["']?/m);
  assert.match(yaml, /^info:\s*$/m);
  assert.match(yaml, /^paths:\s*$/m);
  assert.match(yaml, /^components:\s*$/m);
  assert.doesNotMatch(yaml, /\t/);
  for (const route of [
    "/auth/resolve",
    "/me",
    "/projects",
    "/projects/{publicRef}",
    "/invoices",
    "/documents",
    "/manager",
    "/relationship",
    "/requests",
    "/requests/{requestRef}",
    "/requests/{requestRef}/respond",
  ]) {
    assert.match(yaml, new RegExp(`^  ${route.replace(/[{}]/g, "\\$&")}:\\s*$`, "m"));
  }
  for (const requirement of [
    "Idempotency-Key",
    "X-Correlation-ID",
    "securitySchemes",
    "rate",
    "cache",
    "retry",
  ]) assert.match(yaml, new RegExp(requirement, "i"));
});

test("request creation is idempotent and rejects key reuse with another body", () => {
  const mock = adapter();
  const customer = mock.resolveAuth(CUSTOMER_A_ID, CUSTOMER_A_PHONE);
  const input = {
    title: "Discuss chapter four results",
    type: "Callback",
    projectPublicRef: "project-dissertation-chapter-four",
  };
  const first = mock.createRequest(customer, input, "same-key");
  const replay = mock.createRequest(customer, input, "same-key");
  assert.deepEqual(replay, first);
  expectContractError(
    () => mock.createRequest(customer, { ...input, title: "Different" }, "same-key"),
    "IDEMPOTENCY_CONFLICT",
  );
});

test("duplicate suggestions classify strong evidence but never execute a merge", () => {
  const exactPhone = suggestDuplicateCustomers(
    { customerRef: "A", normalizedPhones: [CUSTOMER_A_PHONE] },
    { customerRef: "B", normalizedPhones: [CUSTOMER_A_PHONE] },
  );
  assert.equal(exactPhone.confidence, "high");
  assert.deepEqual(exactPhone.reasons, ["exact_normalized_phone"]);
  assert.equal(exactPhone.status, "Suggested Duplicate");
  assert.equal(exactPhone.autoMergeAllowed, false);
});

test("name-only matching is low confidence and cannot auto-merge", () => {
  const suggestion = suggestDuplicateCustomers(
    { customerRef: "A", name: "Same Name" },
    { customerRef: "B", name: "same name" },
  );
  assert.equal(suggestion.confidence, "low");
  assert.deepEqual(suggestion.reasons, ["name_only"]);
  assert.equal(suggestion.autoMergeAllowed, false);
});

test("merge impact preview counts unique relationships without becoming executable", () => {
  const preview = buildMergeImpactPreview(
    {
      invoices: ["I-1", "I-2"],
      projects: ["P-1"],
      payments: ["PAY-1"],
      files: ["F-1"],
      managerHistory: ["M-1"],
      portalAccounts: ["A-1"],
    },
    {
      invoices: ["I-2", "I-3"],
      projects: ["P-2"],
      files: ["F-2", "F-3"],
      portalAccounts: ["A-2"],
    },
  );
  assert.deepEqual(preview, {
    invoicesAffected: 3,
    projectsAffected: 2,
    paymentsAffected: 1,
    filesAffected: 3,
    managerHistoryAffected: 1,
    portalAccountsAffected: 2,
    executable: false,
  });
});

test("production cannot instantiate development fixtures", () => {
  expectContractError(
    () =>
      new LocalMockMyWritexAdapter({
        nodeEnv: "production",
        fixturesEnabled: true,
      }),
    "FIXTURES_DISABLED",
  );
  expectContractError(
    () =>
      new LocalMockMyWritexAdapter({
        nodeEnv: "test",
        fixturesEnabled: false,
      }),
    "FIXTURES_DISABLED",
  );
});
