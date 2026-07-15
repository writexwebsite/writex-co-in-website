import assert from "node:assert/strict";
import test from "node:test";
import { clientDemoData } from "../../lib/demo/clientDemoData";
import { getDemoSessionExpirySeconds, isDemoServerEnabled } from "../../lib/demo/config";
import { getEmployeeDemoData } from "../../lib/demo/employeeDemoData";
import { demoWorkspaceIds, demoWorkspaces, isDemoWorkspaceId } from "../../lib/demo/demoWorkspaces";

test("demo mode is disabled unless the backend flag is explicitly true", () => {
  const original = process.env.DEMO_LOGIN_ENABLED;
  delete process.env.DEMO_LOGIN_ENABLED;
  assert.equal(isDemoServerEnabled(), false);
  process.env.DEMO_LOGIN_ENABLED = "false";
  assert.equal(isDemoServerEnabled(), false);
  process.env.DEMO_LOGIN_ENABLED = "true";
  assert.equal(isDemoServerEnabled(), true);
  if (original === undefined) delete process.env.DEMO_LOGIN_ENABLED; else process.env.DEMO_LOGIN_ENABLED = original;
});

test("demo session duration is short and capped at one hour", () => {
  const original = process.env.DEMO_SESSION_EXPIRY_SECONDS;
  process.env.DEMO_SESSION_EXPIRY_SECONDS = "99999";
  assert.equal(getDemoSessionExpirySeconds(), 3600);
  process.env.DEMO_SESSION_EXPIRY_SECONDS = "10";
  assert.equal(getDemoSessionExpirySeconds(), 300);
  if (original === undefined) delete process.env.DEMO_SESSION_EXPIRY_SECONDS; else process.env.DEMO_SESSION_EXPIRY_SECONDS = original;
});

test("client fixture is fictional and locked for mutations", () => {
  assert.equal(clientDemoData.isDemo, true);
  assert.equal(clientDemoData.invoice.invoiceId, "WX-DEMO-1001");
  assert.equal(clientDemoData.client.name, "Demo Client");
  assert.equal(clientDemoData.delivery.downloadUnlocked, false);
  assert.equal(clientDemoData.payment.paymentStatus, "Partially Paid");
});

test("employee demo exposes only the approved workspace allowlist", () => {
  assert.deepEqual(demoWorkspaceIds, ["subject_matter_expert", "senior_subject_matter_expert", "team_leader", "team_manager", "project_manager", "operations_manager", "business_development_associate", "business_development_executive", "accounts", "executives_admin", "hr"]);
  assert.equal(isDemoWorkspaceId("team_manager"), true);
  assert.equal(isDemoWorkspaceId("admin"), false);
  assert.equal(isDemoWorkspaceId("/employee/arbitrary"), false);
});

test("workspace destinations are server-owned and internal", () => {
  for (const id of demoWorkspaceIds) {
    assert.match(demoWorkspaces[id].destination, /^\/employee\/[a-z-]+$/);
    assert.ok(demoWorkspaces[id].permissions.length > 0);
  }
});

test("team manager demo receives only department-scoped view permissions", () => {
  const data = getEmployeeDemoData("team_manager");
  assert.equal(data.isDemo, true);
  assert.equal(data.defaultRoute, "/employee/team-performance");
  assert.deepEqual(data.permissions, [{ code: "projects.view", scope: "department" }, { code: "reports.view", scope: "department" }]);
  assert.equal(data.permissions.some((permission) => /create|update|delete|approve|assign|send/.test(permission.code)), false);
});

test("all employee demo fixtures contain fictional identifiers", () => {
  for (const id of demoWorkspaceIds) {
    const data = getEmployeeDemoData(id);
    assert.equal(data.user.employeeId, "WX-DEMO-001");
    assert.match(data.user.id, /^demo-/);
    assert.equal(data.user.name, "Demo Team Member");
  }
});
