import type { EmployeeDirectoryItem, EmployeeTeam } from "@/lib/employees/domain";

const salesTeamId = "10000000-0000-4000-8000-000000000001";
const deliveryTeamId = "10000000-0000-4000-8000-000000000002";

export const employeePreviewTeams: EmployeeTeam[] = [
  { id: salesTeamId, teamCode: "SALES-EAST", name: "Sales East", department: "Sales", status: "ACTIVE", employeeCount: 3 },
  { id: deliveryTeamId, teamCode: "DEV-OPS", name: "Development / Operations", department: "Development / Operations", status: "ACTIVE", employeeCount: 5 },
  { id: "10000000-0000-4000-8000-000000000003", teamCode: "UAT-EMPTY", name: "Empty UAT Team", department: "Sales", status: "INACTIVE", employeeCount: 0 }
];

function previewEmployee(overrides: Partial<EmployeeDirectoryItem> & Pick<EmployeeDirectoryItem, "id" | "employeeCode" | "displayName" | "officialEmail">): EmployeeDirectoryItem {
  return {
    department: "Sales",
    designation: "Employee",
    employmentStatus: "ACTIVE",
    primaryTeamId: salesTeamId,
    teamName: "Sales East",
    managerEmployeeId: null,
    managerName: null,
    academyEnabled: true,
    academyRole: "EMPLOYEE",
    primarySuperAdmin: false,
    employeeSegment: "SENIOR_BDE",
    academyArea: "SALES",
    deliveryOperationalRole: null,
    deliveryReportingParentEmployeeId: null,
    deliveryReportingParentName: null,
    deliveryTrainerEmployeeId: null,
    deliveryTrainerName: null,
    syncStatus: "SYNCED",
    lastSyncedAt: "2026-08-24T08:30:00.000Z",
    lastSyncError: null,
    academyUserId: `academy-${overrides.employeeCode.toLowerCase()}`,
    archivedAt: null,
    archivePreviousEmploymentStatus: null,
    archivePreviousAcademyEnabled: null,
    lifecycleVersion: 1,
    updatedAt: "2026-08-24T08:30:00.000Z",
    ...overrides
  };
}

const ids = {
  superAdmin: "20000000-0000-4000-8000-000000000001",
  salesManager: "20000000-0000-4000-8000-000000000002",
  salesTrainer: "20000000-0000-4000-8000-000000000003",
  salesEmployee: "20000000-0000-4000-8000-000000000004",
  deliveryManager: "20000000-0000-4000-8000-000000000005",
  deliveryTeamLeader: "20000000-0000-4000-8000-000000000006",
  deliveryTrainer: "20000000-0000-4000-8000-000000000007",
  seniorSme: "20000000-0000-4000-8000-000000000008",
  juniorSme: "20000000-0000-4000-8000-000000000009",
  inactive: "20000000-0000-4000-8000-000000000010",
  archived: "20000000-0000-4000-8000-000000000011"
} as const;

export const employeePreviewItems: EmployeeDirectoryItem[] = [
  previewEmployee({ id: ids.superAdmin, employeeCode: "W0067", displayName: "Shibam Dutta", officialEmail: "shibam.dutta@example.test", department: "Management", designation: "CEO", primaryTeamId: null, teamName: null, academyRole: "SUPER_ADMIN", primarySuperAdmin: true, academyArea: "ACADEMY_WIDE" }),
  previewEmployee({ id: ids.salesManager, employeeCode: "WX-SALES-014", displayName: "Ananya Sen", officialEmail: "ananya.sen@example.test", designation: "Sales Team Lead", academyRole: "MANAGER_TL" }),
  previewEmployee({ id: ids.salesTrainer, employeeCode: "WX-SALES-021", displayName: "Kabir Bose", officialEmail: "kabir.bose@example.test", designation: "Sales Trainer", academyRole: "TRAINER", managerEmployeeId: ids.salesManager, managerName: "Ananya Sen" }),
  previewEmployee({ id: ids.salesEmployee, employeeCode: "WX-SALES-027", displayName: "Rohan Das", officialEmail: "rohan.das@example.test", designation: "Sales Executive", employeeSegment: "NEW_BDE", managerEmployeeId: ids.salesTrainer, managerName: "Kabir Bose" }),
  previewEmployee({ id: ids.deliveryManager, employeeCode: "WX-DEV-001", displayName: "Devika Rao", officialEmail: "devika.rao@example.test", department: "Development / Operations", designation: "Delivery Manager", primaryTeamId: deliveryTeamId, teamName: "Development / Operations", academyArea: "DEVELOPMENT_OPERATIONS", deliveryOperationalRole: "MANAGER" }),
  previewEmployee({ id: ids.deliveryTeamLeader, employeeCode: "WX-DEV-002", displayName: "Nikhil Shah", officialEmail: "nikhil.shah@example.test", department: "Development / Operations", designation: "Team Leader", primaryTeamId: deliveryTeamId, teamName: "Development / Operations", academyArea: "DEVELOPMENT_OPERATIONS", deliveryOperationalRole: "TEAM_LEADER", deliveryReportingParentEmployeeId: ids.deliveryManager, deliveryReportingParentName: "Devika Rao" }),
  previewEmployee({ id: ids.deliveryTrainer, employeeCode: "WX-DEV-003", displayName: "Farah Khan", officialEmail: "farah.khan@example.test", department: "Development / Operations", designation: "Delivery Trainer", primaryTeamId: deliveryTeamId, teamName: "Development / Operations", academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "TRAINER" }),
  previewEmployee({ id: ids.seniorSme, employeeCode: "WX-DEV-004", displayName: "Arjun Mehta", officialEmail: "arjun.mehta@example.test", department: "Development / Operations", designation: "Senior Subject Matter Expert", primaryTeamId: deliveryTeamId, teamName: "Development / Operations", academyArea: "DEVELOPMENT_OPERATIONS", deliveryOperationalRole: "SENIOR_SME", deliveryReportingParentEmployeeId: ids.deliveryTeamLeader, deliveryReportingParentName: "Nikhil Shah", deliveryTrainerEmployeeId: ids.deliveryTrainer, deliveryTrainerName: "Farah Khan" }),
  previewEmployee({ id: ids.juniorSme, employeeCode: "WX-DEV-005", displayName: "Ishita Roy", officialEmail: "ishita.roy@example.test", department: "Development / Operations", designation: "Junior Subject Matter Expert", primaryTeamId: deliveryTeamId, teamName: "Development / Operations", academyArea: "DEVELOPMENT_OPERATIONS", deliveryOperationalRole: "JUNIOR_SME", deliveryReportingParentEmployeeId: ids.deliveryTeamLeader, deliveryReportingParentName: "Nikhil Shah", deliveryTrainerEmployeeId: ids.deliveryTrainer, deliveryTrainerName: "Farah Khan" }),
  previewEmployee({ id: ids.inactive, employeeCode: "WX-DEV-INACTIVE", displayName: "Inactive Delivery UAT", officialEmail: "inactive-delivery-uat@example.test", department: "Development / Operations", designation: "Junior Subject Matter Expert", primaryTeamId: deliveryTeamId, teamName: "Development / Operations", employmentStatus: "INACTIVE", academyEnabled: false, academyArea: "DEVELOPMENT_OPERATIONS", deliveryOperationalRole: "JUNIOR_SME", academyUserId: null }),
  previewEmployee({ id: ids.archived, employeeCode: "WX-UAT-ARCHIVED", displayName: "Archived UAT Employee", officialEmail: "archived-uat@example.test", employmentStatus: "INACTIVE", academyEnabled: false, academyUserId: null, archivedAt: "2026-08-23T07:30:00.000Z", archivePreviousEmploymentStatus: "ACTIVE", archivePreviousAcademyEnabled: true, lifecycleVersion: 3 })
];

export const employeePreviewIds = ids;
