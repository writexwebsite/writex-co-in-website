import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Website Admin AXO v1 exposes exactly 31 unique operations", async () => {
  const adapter = await read("lib/axo/admin-control.ts");
  const operations = [...adapter.matchAll(/operationId:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(operations.length, 31);
  assert.equal(new Set(operations).size, 31);
  for (const required of ["createEmployee", "setReportingParent", "setTrainer", "setAcademyEntitlements", "runSync", "createAdminWebhook"]) {
    assert.ok(operations.includes(required), `${required} is missing`);
  }
});

test("Website Admin AXO route enforces authentication, scopes and replay safety", async () => {
  const route = await read("app/api/axo/v1/[[...axo]]/route.ts");
  const auth = await read("lib/axo/control-auth.ts");
  const store = await read("lib/axo/control-store.ts");
  for (const evidence of [
    "authenticateAxoRequest(request)",
    "requireAxoScope(actor, operation.scope)",
    "requireDelegatedAdmin(actor)",
    "requireWriteHeaders",
    "requireIfMatch",
    "beginAxoIdempotency",
    "auditAxoMutation",
    "publishAxoWebhookEvent"
  ]) assert.match(route, new RegExp(evidence.replace(/[()*.]/g, "\\$&")));
  assert.match(auth, /createHmac\("sha256", requiredSecret\(\)\)/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /assertCanManageEmployees/);
  assert.match(auth, /role: activeAdmin\.role/);
  assert.doesNotMatch(auth, /role: claims\.role/);
  assert.match(store, /createCipheriv\("aes-256-gcm"/);
  assert.match(store, /x-writex-signature/);
});

test("Website Admin AXO mutations reuse employee and Academy-sync domain services", async () => {
  const adapter = await read("lib/axo/admin-control.ts");
  for (const service of [
    "createEmployee",
    "updateEmployee",
    "applyEmployeeLifecycleMutation",
    "attemptEmployeeAcademySync",
    "resetAcademyEmployeePassword"
  ]) assert.match(adapter, new RegExp(service));
  assert.match(adapter, /isValidDeliveryReportingEdge/);
  assert.match(adapter, /deliveryTrainerEmployeeId/);
  assert.match(adapter, /deliveryReportingParentEmployeeId/);
  assert.doesNotMatch(adapter, /password_hash\s*=|passwordHash\s*:/i);
});

test("Website Admin AXO migration and rollback cover idempotency and signed webhooks", async () => {
  const up = await read("database/migrations/20260826_axo_control_api_v1.sql");
  const down = await read("database/migrations/20260826_axo_control_api_v1.rollback.sql");
  for (const table of ["axo_api_idempotency", "axo_webhook_subscriptions", "axo_webhook_deliveries"]) {
    assert.match(up, new RegExp(`create table if not exists ${table}`));
    assert.match(down, new RegExp(`drop table if exists ${table}`));
  }
  assert.match(up, /unique \(service_name, actor_subject, idempotency_key\)/);
  assert.match(up, /secret_encrypted/);
  assert.doesNotMatch(up, /api[_ -]?key\s*=|password\s*=|secret\s*=/i);
});
