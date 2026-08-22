import assert from "node:assert/strict";
import { test } from "node:test";
import type { AcademyInitialAdminBootstrap, AcademyRole, EmployeeDirectoryItem } from "@/lib/employees/domain";
import { evaluateAcademySetupJourney } from "@/lib/employees/guided-setup";

const bootstrap: AcademyInitialAdminBootstrap = {
  status: "CONSUMED",
  candidateEmployeeId: null,
  consumedByEmployeeId: "super",
  readyAt: null,
  consumedAt: new Date(0).toISOString(),
  backupReference: null,
  employeeCount: 4,
  primarySuperAdminEmployeeId: "super",
  requiresConfirmation: false
};

function employee(id: string, role: AcademyRole, managerEmployeeId: string | null = null, primarySuperAdmin = false): EmployeeDirectoryItem {
  return {
    id,
    employeeCode: `WX-${id.toUpperCase()}`,
    displayName: id[0].toUpperCase() + id.slice(1),
    officialEmail: `${id}@example.test`,
    department: "Sales",
    designation: role,
    employmentStatus: "ACTIVE",
    primaryTeamId: null,
    teamName: null,
    managerEmployeeId,
    managerName: null,
    academyEnabled: true,
    academyRole: role,
    primarySuperAdmin,
    employeeSegment: role === "EMPLOYEE" ? "NEW_BDE" : "SENIOR_BDE",
    syncStatus: "SYNCED",
    lastSyncedAt: new Date(0).toISOString(),
    lastSyncError: null,
    academyUserId: id,
    archivedAt: null,
    archivePreviousEmploymentStatus: null,
    archivePreviousAcademyEnabled: null,
    lifecycleVersion: 1,
    updatedAt: new Date(0).toISOString()
  };
}

test("Academy setup exposes one deterministic next action", () => {
  const state = evaluateAcademySetupJourney([employee("super", "SUPER_ADMIN", null, true)], bootstrap);
  assert.equal(state.complete, false);
  assert.equal(state.action?.kind, "CREATE_EMPLOYEE");
  assert.equal(state.action?.academyRole, "MANAGER_TL");
  assert.deepEqual(state.stages.map((stage) => stage.status), ["COMPLETE", "CURRENT", "PENDING", "PENDING"]);
});

test("Academy setup completes only after the synced reporting chain exists", () => {
  const records = [
    employee("super", "SUPER_ADMIN", null, true),
    employee("manager", "MANAGER_TL"),
    employee("trainer", "TRAINER", "manager"),
    employee("bde", "EMPLOYEE", "trainer")
  ];
  const complete = evaluateAcademySetupJourney(records, bootstrap);
  assert.equal(complete.complete, true);
  assert.equal(complete.action, null);

  records[2] = { ...records[2], managerEmployeeId: null };
  const broken = evaluateAcademySetupJourney(records, bootstrap);
  assert.equal(broken.complete, false);
  assert.equal(broken.action?.academyRole, "TRAINER");
});

test("existing SuperAdmin without Primary routes to governance instead of replaying bootstrap", () => {
  const state = evaluateAcademySetupJourney([employee("super", "SUPER_ADMIN")], { ...bootstrap, primarySuperAdminEmployeeId: null });
  assert.equal(state.action?.kind, "OPEN_GOVERNANCE");
  assert.equal(state.action?.href, "/admin/ai-governance#primary-superadmin");
});
