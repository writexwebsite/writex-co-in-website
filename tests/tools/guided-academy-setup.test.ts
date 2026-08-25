import assert from "node:assert/strict";
import { test } from "node:test";
import type { AcademyArea, AcademyInitialAdminBootstrap, AcademyRole, DeliveryOperationalRole, EmployeeDirectoryItem } from "@/lib/employees/domain";
import { evaluateAcademySetupJourney } from "@/lib/employees/guided-setup";

const bootstrap: AcademyInitialAdminBootstrap = {
  status: "CONSUMED",
  candidateEmployeeId: null,
  consumedByEmployeeId: "super",
  readyAt: null,
  consumedAt: new Date(0).toISOString(),
  backupReference: null,
  employeeCount: 9,
  primarySuperAdminEmployeeId: "super",
  requiresConfirmation: false
};

function employee(id: string, options: {
  role?: AcademyRole;
  area?: AcademyArea;
  managerEmployeeId?: string | null;
  primarySuperAdmin?: boolean;
  deliveryRole?: DeliveryOperationalRole | null;
  deliveryParentId?: string | null;
  deliveryTrainerId?: string | null;
  syncStatus?: EmployeeDirectoryItem["syncStatus"];
  academyUserId?: string | null;
  hierarchyAttention?: EmployeeDirectoryItem["deliveryHierarchyAttention"];
  assignmentStatus?: EmployeeDirectoryItem["learningAssignmentStatus"];
} = {}): EmployeeDirectoryItem {
  const role = options.role || "EMPLOYEE";
  const area = options.area || (role === "SUPER_ADMIN" ? "ACADEMY_WIDE" : "SALES");
  return {
    id,
    employeeCode: `WX-${id.toUpperCase()}`,
    displayName: id[0].toUpperCase() + id.slice(1),
    officialEmail: `${id}@example.test`,
    department: area === "DEVELOPMENT_OPERATIONS" ? "Development / Operations" : area === "ACADEMY_WIDE" ? "Management" : "Sales",
    designation: role,
    employmentStatus: "ACTIVE",
    primaryTeamId: null,
    teamName: null,
    managerEmployeeId: options.managerEmployeeId || null,
    managerName: null,
    academyEnabled: true,
    academyRole: role,
    primarySuperAdmin: options.primarySuperAdmin || false,
    employeeSegment: role === "EMPLOYEE" ? "NEW_BDE" : "SENIOR_BDE",
    academyArea: area,
    deliveryOperationalRole: options.deliveryRole || null,
    deliveryReportingParentEmployeeId: options.deliveryParentId || null,
    deliveryReportingParentName: null,
    deliveryTrainerEmployeeId: options.deliveryTrainerId || null,
    deliveryTrainerName: null,
    deliveryHierarchyAttention: options.hierarchyAttention || null,
    learningAssignmentId: options.assignmentStatus && options.assignmentStatus !== "NOT_ASSIGNED" ? `assignment-${id}` : null,
    learningPathKey: options.assignmentStatus && options.assignmentStatus !== "NOT_ASSIGNED" ? "DELIVERY_CORE" : null,
    learningPathTitle: options.assignmentStatus && options.assignmentStatus !== "NOT_ASSIGNED" ? "Delivery Core Learning Path" : null,
    learningAssignmentStatus: options.assignmentStatus || "NOT_ASSIGNED",
    learningAssignedAt: options.assignmentStatus && options.assignmentStatus !== "NOT_ASSIGNED" ? new Date(0).toISOString() : null,
    learningFirstLessonRoute: options.assignmentStatus && options.assignmentStatus !== "NOT_ASSIGNED" ? "/delivery/learn/core/1" : null,
    syncStatus: options.syncStatus || "SYNCED",
    lastSyncedAt: new Date(0).toISOString(),
    lastSyncError: options.syncStatus === "FAILED" ? "Academy sync failed." : null,
    academyUserId: options.academyUserId === undefined ? id : options.academyUserId,
    archivedAt: null,
    archivePreviousEmploymentStatus: null,
    archivePreviousAcademyEnabled: null,
    lifecycleVersion: 1,
    updatedAt: new Date(0).toISOString()
  };
}

function completeRecords() {
  return [
    employee("super", { role: "SUPER_ADMIN", primarySuperAdmin: true }),
    employee("sales-manager", { role: "MANAGER_TL" }),
    employee("sales-trainer", { role: "TRAINER", managerEmployeeId: "sales-manager" }),
    employee("sales-bde", { managerEmployeeId: "sales-trainer" }),
    employee("delivery-manager", { area: "DEVELOPMENT_OPERATIONS", deliveryRole: "MANAGER" }),
    employee("delivery-team-manager", { area: "DEVELOPMENT_OPERATIONS", deliveryRole: "TEAM_MANAGER", deliveryParentId: "delivery-manager" }),
    employee("delivery-tl", { area: "DEVELOPMENT_OPERATIONS", deliveryRole: "TEAM_LEADER", deliveryParentId: "delivery-team-manager" }),
    employee("delivery-trainer", { role: "TRAINER", area: "DEVELOPMENT_OPERATIONS" }),
    employee("senior-sme", { area: "DEVELOPMENT_OPERATIONS", deliveryRole: "SENIOR_SME", deliveryParentId: "delivery-tl", deliveryTrainerId: "delivery-trainer", assignmentStatus: "ACTIVE" }),
    employee("junior-sme", { area: "DEVELOPMENT_OPERATIONS", deliveryRole: "JUNIOR_SME", deliveryParentId: "delivery-tl", deliveryTrainerId: "delivery-trainer" })
  ];
}

test("unified Academy setup exposes deterministic actions for both tracks", () => {
  const state = evaluateAcademySetupJourney([employee("super", { role: "SUPER_ADMIN", primarySuperAdmin: true })], bootstrap);
  assert.equal(state.complete, false);
  assert.equal(state.superAdmin.status, "COMPLETE");
  assert.equal(state.tracks[0].action?.kind, "CREATE_EMPLOYEE");
  assert.deepEqual(state.tracks[0].action?.preset, { academyArea: "SALES", academyRole: "MANAGER_TL" });
  assert.equal(state.tracks[1].action?.kind, "CREATE_EMPLOYEE");
  assert.deepEqual(state.tracks[1].action?.preset, { academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "EMPLOYEE", deliveryResponsibility: "MANAGER" });
});

test("unified setup completes only after Sales and Delivery data are both valid and synced", () => {
  const state = evaluateAcademySetupJourney(completeRecords(), bootstrap);
  assert.equal(state.complete, true);
  assert.equal(state.superAdmin.completedBy, "Super");
  assert.equal(state.tracks.every((track) => track.complete && track.action === null), true);
  assert.deepEqual(state.tracks[1].stages.map((stage) => stage.status), ["COMPLETE", "COMPLETE", "COMPLETE", "COMPLETE", "COMPLETE", "COMPLETE", "COMPLETE"]);
});

test("existing direct Manager to Team Leader remains a guided transition requiring Team Manager assignment", () => {
  const records = completeRecords().filter((item) => item.id !== "delivery-team-manager");
  const teamLeaderIndex = records.findIndex((item) => item.id === "delivery-tl");
  records[teamLeaderIndex] = {
    ...records[teamLeaderIndex],
    deliveryReportingParentEmployeeId: "delivery-manager",
    deliveryHierarchyAttention: "TEAM_MANAGER_ASSIGNMENT_REQUIRED"
  };
  const state = evaluateAcademySetupJourney(records, bootstrap);
  const delivery = state.tracks.find((track) => track.key === "DEVELOPMENT_OPERATIONS")!;
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_TEAM_MANAGER")?.status, "NEEDS_ACTION");
  assert.equal(delivery.stages.filter((stage) => stage.status === "COMPLETE").length, 6);
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_TEAM_LEADER")?.status, "COMPLETE");
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_SENIOR_SME")?.status, "COMPLETE");
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_JUNIOR_SME")?.status, "COMPLETE");
  assert.equal(delivery.action?.label, "Add Team Manager");
});

test("existing Team Manager guides the same Team Leader transition without breaking downstream readiness", () => {
  const records = completeRecords();
  const teamLeaderIndex = records.findIndex((item) => item.id === "delivery-tl");
  records[teamLeaderIndex] = {
    ...records[teamLeaderIndex],
    deliveryReportingParentEmployeeId: "delivery-manager",
    deliveryHierarchyAttention: "TEAM_MANAGER_ASSIGNMENT_REQUIRED"
  };
  const state = evaluateAcademySetupJourney(records, bootstrap);
  const delivery = state.tracks.find((track) => track.key === "DEVELOPMENT_OPERATIONS")!;
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_TEAM_MANAGER")?.status, "NEEDS_ACTION");
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_TEAM_LEADER")?.status, "COMPLETE");
  assert.equal(delivery.action?.label, "Assign Team Leader");
  assert.equal(delivery.action?.href, "/admin/employees/delivery-tl");
});

test("Delivery hierarchy regression returns to error with an exact repair action", () => {
  const records = completeRecords();
  const teamLeaderIndex = records.findIndex((item) => item.id === "delivery-tl");
  records[teamLeaderIndex] = { ...records[teamLeaderIndex], deliveryReportingParentEmployeeId: "senior-sme" };
  const state = evaluateAcademySetupJourney(records, bootstrap);
  const delivery = state.tracks.find((track) => track.key === "DEVELOPMENT_OPERATIONS")!;
  assert.equal(delivery.complete, false);
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_TEAM_LEADER")?.status, "ERROR");
  assert.equal(delivery.action?.kind, "OPEN_EMPLOYEE");
  assert.equal(delivery.action?.href, "/admin/employees/delivery-tl");
});

test("Junior SME must report directly to the Team Leader, not the Senior SME", () => {
  const records = completeRecords();
  const juniorIndex = records.findIndex((item) => item.id === "junior-sme");
  records[juniorIndex] = { ...records[juniorIndex], deliveryReportingParentEmployeeId: "senior-sme" };
  const state = evaluateAcademySetupJourney(records, bootstrap);
  const delivery = state.tracks.find((track) => track.key === "DEVELOPMENT_OPERATIONS")!;
  const juniorStage = delivery.stages.find((stage) => stage.key === "DELIVERY_JUNIOR_SME")!;
  assert.equal(juniorStage.status, "ERROR");
  assert.match(juniorStage.issue || "", /Team Leader/);
});

test("Delivery Trainer remains separate from the operational hierarchy", () => {
  const records = completeRecords();
  const trainer = records.find((item) => item.id === "delivery-trainer")!;
  assert.equal(trainer.deliveryOperationalRole, null);
  assert.equal(trainer.deliveryReportingParentEmployeeId, null);
  const state = evaluateAcademySetupJourney(records, bootstrap);
  const delivery = state.tracks.find((track) => track.key === "DEVELOPMENT_OPERATIONS")!;
  assert.equal(delivery.stages.find((stage) => stage.key === "DELIVERY_TRAINER")?.status, "COMPLETE");
});

test("multiple active Primary SuperAdmins are never reported as complete", () => {
  const records = completeRecords();
  records.push(employee("second-super", { role: "SUPER_ADMIN", primarySuperAdmin: true }));
  const state = evaluateAcademySetupJourney(records, bootstrap);
  assert.equal(state.complete, false);
  assert.equal(state.superAdmin.status, "ERROR");
  assert.match(state.superAdmin.issue || "", /Multiple Primary SuperAdmins/);
});
