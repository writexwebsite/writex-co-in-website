import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  GENERIC_AUTH_FAILURE,
  MyWritexContractError,
  type MyWritexPrincipal,
} from "../../lib/my-writex/integration/contract";
import {
  getMyWritexFeatureFlags,
  MY_WRITEX_FEATURE_FLAG_DEFAULTS,
  riskyIntegrationFlagsAreOff,
} from "../../lib/my-writex/integration/feature-flags";
import { safeMyWritexIntegrationLog } from "../../lib/my-writex/integration/observability";
import {
  ProductionLTSAdapter,
  PRODUCTION_LTS_ADAPTER_IMPLEMENTED,
} from "../../lib/my-writex/integration/production-lts-adapter";
import {
  SanitizedSnapshotAdapter,
  type SanitizedSnapshot,
} from "../../lib/my-writex/integration/sanitized-snapshot-adapter";
import { MyWriteXService } from "../../lib/my-writex/integration/service";

const CUSTOMER_A_PHONE = "+447700900001";
const CUSTOMER_B_PHONE = "+447700900002";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

function snapshot(): SanitizedSnapshot {
  return {
    metadata: {
      sanitized: true,
      approvalRef: "APPROVAL-STAGE3B1-TEST",
      snapshotTime: "2026-08-27T12:00:00.000Z",
      schemaVersion: 1,
    },
    customers: [
      {
        customerRef: "CUST-SAN-A",
        writeXId: "customer.a7k2",
        registeredPhone: CUSTOMER_A_PHONE,
        displayName: "Customer A",
        manager: { publicRef: "MGR-SAN-1", displayName: "Manager One" },
      },
      {
        customerRef: "CUST-SAN-B",
        writeXId: "customer.b9m4",
        registeredPhone: CUSTOMER_B_PHONE,
        displayName: "Customer B",
        manager: { publicRef: "MGR-SAN-2", displayName: "Manager Two" },
      },
    ],
    projects: [
      {
        customerRef: "CUST-SAN-A",
        publicRef: "PROJECT-SAN-A1",
        invoiceReference: "WX-SAN-A1",
        title: "Project A One",
        status: "active",
      },
      {
        customerRef: "CUST-SAN-A",
        publicRef: "PROJECT-SAN-A2",
        invoiceReference: "WX-SAN-A2",
        title: "Project A Two",
        status: "active",
      },
      {
        customerRef: "CUST-SAN-B",
        publicRef: "PROJECT-SAN-B1",
        invoiceReference: "WX-SAN-B1",
        title: "Project B One",
        status: "active",
      },
    ],
    invoices: [
      {
        customerRef: "CUST-SAN-A",
        invoiceReference: "WX-SAN-A1",
        projectPublicRef: "PROJECT-SAN-A1",
        status: "paid",
      },
      {
        customerRef: "CUST-SAN-A",
        invoiceReference: "WX-SAN-A2",
        projectPublicRef: "PROJECT-SAN-A2",
        status: "due",
      },
      {
        customerRef: "CUST-SAN-B",
        invoiceReference: "WX-SAN-B1",
        projectPublicRef: "PROJECT-SAN-B1",
        status: "paid",
      },
    ],
    documents: [
      {
        customerRef: "CUST-SAN-A",
        publicRef: "DOC-SAN-A1",
        projectPublicRef: "PROJECT-SAN-A1",
        name: "Document A One",
      },
      {
        customerRef: "CUST-SAN-B",
        publicRef: "DOC-SAN-B1",
        projectPublicRef: "PROJECT-SAN-B1",
        name: "Document B One",
      },
    ],
    relationship: [
      {
        customerRef: "CUST-SAN-A",
        publicRef: "REL-SAN-A1",
        type: "milestone",
        label: "Customer A milestone",
        occurredAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

function adapter(data = snapshot()) {
  return new SanitizedSnapshotAdapter(data, {
    nodeEnv: "test",
    enabled: true,
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

test("all Stage 3B-1 feature flags default off and risky flags cannot be enabled", () => {
  assert.ok(Object.values(MY_WRITEX_FEATURE_FLAG_DEFAULTS).every((value) => !value));
  const requested = getMyWritexFeatureFlags({
    NODE_ENV: "test",
    MY_WRITEX_ENABLED: "true",
    MY_WRITEX_LTS_INTEGRATION_ENABLED: "true",
    MY_WRITEX_CUSTOMER_MASTER_ENABLED: "true",
    MY_WRITEX_REAL_REQUESTS_ENABLED: "true",
    MY_WRITEX_PRODUCTION_AUTH_ENABLED: "true",
    MY_WRITEX_LOCAL_MOCK_ENABLED: "true",
    MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED: "true",
  });
  assert.equal(requested.MY_WRITEX_ENABLED, true);
  assert.equal(requested.MY_WRITEX_CUSTOMER_MASTER_ENABLED, true);
  assert.equal(requested.MY_WRITEX_LOCAL_MOCK_ENABLED, true);
  assert.equal(requested.MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED, true);
  assert.equal(riskyIntegrationFlagsAreOff(requested), true);

  const production = getMyWritexFeatureFlags({
    NODE_ENV: "production",
    MY_WRITEX_ENABLED: "true",
    MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED: "true",
  });
  assert.deepEqual(production, MY_WRITEX_FEATURE_FLAG_DEFAULTS);
});

test("the production LTS adapter is an unconditional non-networking hard stop", () => {
  assert.equal(PRODUCTION_LTS_ADAPTER_IMPLEMENTED, false);
  expectContractError(() => new ProductionLTSAdapter(), "PRODUCTION_ADAPTER_DISABLED");
  const productionSource = source(
    "lib/my-writex/integration/production-lts-adapter.ts",
  );
  assert.doesNotMatch(productionSource, /fetch\s*\(|https?:\/\/|createConnection|Pool\s*\(/);
});

test("the sanitized adapter refuses disabled, production and remote construction", async () => {
  expectContractError(
    () => new SanitizedSnapshotAdapter(snapshot(), { nodeEnv: "test", enabled: false }),
    "FIXTURES_DISABLED",
  );
  expectContractError(
    () =>
      new SanitizedSnapshotAdapter(snapshot(), {
        nodeEnv: "production",
        enabled: true,
      }),
    "FIXTURES_DISABLED",
  );
  await assert.rejects(
    SanitizedSnapshotAdapter.fromFile("https://example.invalid/snapshot.json", {
      nodeEnv: "test",
      enabled: true,
    }),
    /offline local JSON file/,
  );
});

test("snapshot validation rejects orphaned or cross-customer relationships", () => {
  const invalid = snapshot();
  const crossCustomerProject = {
    ...invalid.projects[0],
    invoiceReference: "WX-SAN-B1",
  };
  assert.throws(
    () =>
      new SanitizedSnapshotAdapter(
        { ...invalid, projects: [crossCustomerProject, ...invalid.projects.slice(1)] },
        { nodeEnv: "test", enabled: true },
      ),
    /invalid invoice relationship/,
  );
});

test("snapshot authentication failures are generic, including malformed phones", () => {
  const sanitized = adapter();
  for (const attempt of [
    () => sanitized.resolveAuth("unknown.customer", CUSTOMER_A_PHONE),
    () => sanitized.resolveAuth("customer.a7k2", CUSTOMER_B_PHONE),
    () => sanitized.resolveAuth("WX-SAN-MISSING", CUSTOMER_A_PHONE),
    () => sanitized.resolveAuth("customer.a7k2", "07700 900001"),
  ]) {
    assert.throws(attempt, (error) => {
      assert.ok(error instanceof MyWritexContractError);
      assert.equal(error.code, "AUTHENTICATION_FAILED");
      assert.equal(error.status, 401);
      assert.equal(error.message, GENERIC_AUTH_FAILURE);
      return true;
    });
  }
});

test("customer, invoice and object scopes stay isolated without internal references", () => {
  const sanitized = adapter();
  const customerA = sanitized.resolveAuth("customer.a7k2", CUSTOMER_A_PHONE);
  const customerB = sanitized.resolveAuth("customer.b9m4", CUSTOMER_B_PHONE);
  const invoiceA = sanitized.resolveAuth("WX-SAN-A1", CUSTOMER_A_PHONE);

  assert.deepEqual(
    sanitized.listProjects(customerA).map((project) => project.publicRef),
    ["PROJECT-SAN-A1", "PROJECT-SAN-A2"],
  );
  assert.deepEqual(
    sanitized.listProjects(customerB).map((project) => project.publicRef),
    ["PROJECT-SAN-B1"],
  );
  assert.deepEqual(
    sanitized.listProjects(invoiceA).map((project) => project.publicRef),
    ["PROJECT-SAN-A1"],
  );
  for (const record of [
    ...sanitized.listProjects(customerA),
    ...sanitized.listInvoices(customerA),
    ...sanitized.listDocuments(customerA),
    ...sanitized.getRelationship(customerA),
  ]) {
    assert.equal("customerRef" in record, false);
  }
  expectContractError(
    () => sanitized.getProject(customerA, "PROJECT-SAN-B1"),
    "NOT_FOUND",
  );
  expectContractError(
    () => sanitized.getProject(invoiceA, "PROJECT-SAN-A2"),
    "NOT_FOUND",
  );

  const forged: MyWritexPrincipal = {
    ...customerA,
    customerMasterId: "CUST-SAN-B",
  };
  expectContractError(() => sanitized.listProjects(forged), "NOT_FOUND");
});

test("sanitized request writes are local, scoped and idempotent", () => {
  const sanitized = adapter();
  const customerA = sanitized.resolveAuth("customer.a7k2", CUSTOMER_A_PHONE);
  const customerB = sanitized.resolveAuth("customer.b9m4", CUSTOMER_B_PHONE);
  const input = {
    title: "A scoped local request",
    type: "Support",
    projectPublicRef: "PROJECT-SAN-A1",
  };
  const first = sanitized.createRequest(customerA, input, "same-local-key");
  assert.deepEqual(
    sanitized.createRequest(customerA, input, "same-local-key"),
    first,
  );
  expectContractError(
    () =>
      sanitized.createRequest(
        customerA,
        { ...input, title: "A different request" },
        "same-local-key",
      ),
    "IDEMPOTENCY_CONFLICT",
  );
  expectContractError(
    () => sanitized.getRequest(customerB, first.requestRef),
    "NOT_FOUND",
  );
});

test("the application service delegates only through explicit ports", () => {
  const sanitized = adapter();
  const service = new MyWriteXService({
    customers: sanitized,
    projects: sanitized,
    invoices: sanitized,
    documents: sanitized,
    managers: sanitized,
    relationships: sanitized,
    requests: sanitized,
  });
  const principal = service.resolveAuth("customer.a7k2", CUSTOMER_A_PHONE);
  assert.equal(service.getMe(principal).displayName, "Customer A");
  assert.equal(service.listProjects(principal).length, 2);
});

test("integration logging is allowlisted and excludes supplied PII", () => {
  const input = {
    correlationId: "corr-stage3b1-0001",
    authScope: "customer" as const,
    customerPublicRef: "CUSTOMER-PUBLIC-A1",
    route: "/v1/projects/{publicRef}",
    latencyMs: 12.6,
    result: "success" as const,
    phone: CUSTOMER_A_PHONE,
    email: "customer@example.invalid",
  };
  const entry = safeMyWritexIntegrationLog(input);
  assert.equal(entry.latencyMs, 13);
  assert.equal("phone" in entry, false);
  assert.equal("email" in entry, false);
  assert.throws(
    () => safeMyWritexIntegrationLog({ ...input, route: "/projects?phone=secret" }),
    /Unsafe route/,
  );
});

test("existing portal sources retain authentication and session security controls", () => {
  const login = source("app/api/client/auth/login/route.ts");
  const access = source("lib/client/access.ts");
  const auth = source("lib/auth/index.ts");
  const security = source("lib/security/index.ts");
  const logout = source("app/api/client/auth/logout/route.ts");
  const session = source("app/api/client/auth/session/route.ts");

  assert.match(login, /assertSameOrigin\(request\)/);
  assert.match(login, /assertRateLimit/);
  assert.match(login, /isClientLoginLocked/);
  assert.match(login, /recordClientLoginAttempt/);
  assert.match(login, /We couldn't verify those details/);
  assert.match(access, /input_fingerprint = \$1 or ip_hash = \$2/);
  assert.match(security, /RATE_LIMITED/);
  assert.match(auth, /session_token_hash/);
  assert.match(auth, /revoked_at is null/);
  assert.match(auth, /last_rotated_at = now\(\)/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /secure: process\.env\.NODE_ENV === "production"/);
  assert.match(auth, /sameSite: "lax"/);
  assert.match(logout, /revokeClientSessionToken/);
  assert.match(session, /rotateClientSessionToken/);
  assert.match(auth, /assertInvoiceClientSession/);
  assert.match(auth, /assertCustomerClientSession/);
});

test("offline proof scripts retain fail-closed workspace and source controls", () => {
  const migrationProof = source("scripts/prove-my-writex-disposable.mjs");
  const sanitizer = source("scripts/sanitize-lts-snapshot.mjs");
  assert.match(migrationProof, /host !== "127\.0\.0\.1"/);
  assert.match(
    migrationProof,
    /options\.port < 40000 \|\|\s*options\.port > 49999/,
  );
  assert.match(migrationProof, /\.local/);
  assert.match(migrationProof, /finally/);
  assert.match(sanitizer, /approval-ref/);
  assert.match(sanitizer, /source-env/);
  assert.match(sanitizer, /snapshot-time/);
  assert.match(sanitizer, /createHmac/);
  assert.match(sanitizer, /https\?:/);
});
