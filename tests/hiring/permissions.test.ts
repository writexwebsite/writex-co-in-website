import assert from "node:assert/strict";
import test from "node:test";
import type { AdminSession } from "../../lib/auth";
import { canViewHiringCandidateIdentity } from "../../lib/admin/permissions";

function session(role: string): AdminSession {
  return {
    kind: "admin",
    adminUserId: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.invalid",
    role,
    mustChangePassword: false
  };
}

test("candidate identity is visible only to authorised hiring managers", () => {
  for (const role of ["super_admin", "hr_admin", "hiring_manager"]) {
    assert.equal(canViewHiringCandidateIdentity(session(role)), true, role);
  }

  for (const role of ["assessor", "interviewer", "read_only_auditor"]) {
    assert.equal(canViewHiringCandidateIdentity(session(role)), false, role);
  }
});
