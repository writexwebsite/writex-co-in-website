import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCanManageRepresentativeDirectory,
  canManageRepresentativeDirectory
} from "../../lib/admin/permissions";
import type { AdminSession } from "../../lib/auth";
import { getNextRepresentativeSyncAt } from "../../lib/trust/representative-sync-schedule";

function session(role: string): AdminSession {
  return {
    kind: "admin",
    adminUserId: `fixture-${role}`,
    email: `${role}@example.invalid`,
    role,
    mustChangePassword: false
  };
}

test("only Super Admin can manage the representative directory", () => {
  assert.equal(canManageRepresentativeDirectory(session("super_admin")), true);
  for (const role of ["sales", "support", "accounts", "viewer"]) {
    assert.equal(canManageRepresentativeDirectory(session(role)), false);
    assert.throws(() => assertCanManageRepresentativeDirectory(session(role)));
  }
});

test("calculates the next daily 10:30 AM Asia/Kolkata execution", () => {
  assert.equal(
    getNextRepresentativeSyncAt(new Date("2026-07-23T04:59:00.000Z"), true),
    "2026-07-23T05:00:00.000Z"
  );
  assert.equal(
    getNextRepresentativeSyncAt(new Date("2026-07-23T05:00:00.000Z"), true),
    "2026-07-24T05:00:00.000Z"
  );
  assert.equal(
    getNextRepresentativeSyncAt(new Date("2026-07-23T04:59:00.000Z"), false),
    null
  );
});
