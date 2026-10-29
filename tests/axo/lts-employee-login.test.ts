import assert from "node:assert/strict";
import test from "node:test";
import {
  employeePasswordMinLength,
  LTS_EMPLOYEE_LOGIN_ACTION_URL,
  resolveLtsEmployeeLoginState
} from "../../lib/auth/ltsEmployeeLogin";

test("ordinary employee login establishes the signed LTS bootstrap", () => {
  assert.deepEqual(resolveLtsEmployeeLoginState({}), {
    ready: false,
    recoveryUrl: "https://lts.writex.co.in/__employee_login_start"
  });
});

test("LTS bootstrap marks the form ready for the exact protected LTS action", () => {
  const state = resolveLtsEmployeeLoginState({ lts_ready: "1" });
  assert.equal(state.ready, true);
  assert.equal(state.recoveryUrl, undefined);
  assert.equal(LTS_EMPLOYEE_LOGIN_ACTION_URL, "https://lts.writex.co.in/__employee_login");
});

test("LTS sign-in does not reject a valid legacy password by applying a new length policy", () => {
  assert.equal(employeePasswordMinLength(true), 1);
  assert.equal(employeePasswordMinLength(false), 8);
});

test("a consumed or missing LTS browser flow is renewed before credentials are submitted", () => {
  const state = resolveLtsEmployeeLoginState({ lts: "bootstrap-required" });
  assert.equal(state.ready, false);
  assert.equal(
    state.recoveryUrl,
    "https://lts.writex.co.in/__employee_login_start?reason=bootstrap-required"
  );
});

test("an LTS authentication failure keeps the renewed form ready and shows a safe error", () => {
  const state = resolveLtsEmployeeLoginState({ lts_ready: "1", lts: "auth-failed" });
  assert.equal(state.ready, true);
  assert.match(state.message || "", /Unable to sign in/);
});

test("unrecognised query values cannot create an external recovery redirect", () => {
  assert.deepEqual(resolveLtsEmployeeLoginState({ lts: "https://example.test" }), {
    ready: false,
    recoveryUrl: "https://lts.writex.co.in/__employee_login_start"
  });
});
