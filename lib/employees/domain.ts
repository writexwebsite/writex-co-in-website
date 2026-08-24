export const academyApplicationKey = "SALES_ACADEMY" as const;
export const employeeStatuses = ["ACTIVE", "INACTIVE"] as const;
export const academyRoles = ["EMPLOYEE", "TRAINER", "MANAGER_TL", "SUPER_ADMIN"] as const;
export const assignableAcademyRoles = academyRoles;
export const employeeSyncStatuses = ["PENDING", "SYNCED", "FAILED"] as const;
export const employeeSegments = ["NEW_BDE", "SENIOR_BDE"] as const;
export const academyAreas = ["SALES", "DEVELOPMENT_OPERATIONS", "ACADEMY_WIDE"] as const;
export const deliveryOperationalRoles = ["MANAGER", "TEAM_LEADER", "SENIOR_SME", "JUNIOR_SME"] as const;
export const employeeLifecycleFilters = ["active", "inactive", "archived", "all"] as const;

export type EmployeeStatus = (typeof employeeStatuses)[number];
export type AcademyRole = (typeof academyRoles)[number];
export type EmployeeSyncStatus = (typeof employeeSyncStatuses)[number];
export type EmployeeSegment = (typeof employeeSegments)[number];
export type AcademyArea = (typeof academyAreas)[number];
export type DeliveryOperationalRole = (typeof deliveryOperationalRoles)[number];

export const deliveryReportingParent: Record<Exclude<DeliveryOperationalRole, "MANAGER">, DeliveryOperationalRole> = {
  TEAM_LEADER: "MANAGER",
  SENIOR_SME: "TEAM_LEADER",
  JUNIOR_SME: "TEAM_LEADER"
};

export function isValidDeliveryReportingEdge(subject: DeliveryOperationalRole, supervisor: DeliveryOperationalRole) {
  if (subject === "MANAGER") return false;
  return deliveryReportingParent[subject] === supervisor;
}
export type EmployeeLifecycleFilter = (typeof employeeLifecycleFilters)[number];

export type EmployeeTeam = {
  id: string;
  teamCode: string;
  name: string;
  department: string;
  status: EmployeeStatus;
  employeeCount: number;
};

export type EmployeeDirectoryItem = {
  id: string;
  employeeCode: string;
  displayName: string;
  officialEmail: string;
  department: string;
  designation: string;
  employmentStatus: EmployeeStatus;
  primaryTeamId: string | null;
  teamName: string | null;
  managerEmployeeId: string | null;
  managerName: string | null;
  academyEnabled: boolean;
  academyRole: AcademyRole;
  primarySuperAdmin: boolean;
  employeeSegment: EmployeeSegment;
  academyArea: AcademyArea;
  deliveryOperationalRole: DeliveryOperationalRole | null;
  deliveryReportingParentEmployeeId: string | null;
  deliveryReportingParentName: string | null;
  deliveryTrainerEmployeeId: string | null;
  deliveryTrainerName: string | null;
  syncStatus: EmployeeSyncStatus;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  academyUserId: string | null;
  archivedAt: string | null;
  archivePreviousEmploymentStatus: EmployeeStatus | null;
  archivePreviousAcademyEnabled: boolean | null;
  lifecycleVersion: number;
  updatedAt: string;
};

export type EmployeeDeletionBlocker = {
  code: string;
  label: string;
  count: number;
};

export type EmployeeDeletionAssessment = {
  allowed: boolean;
  zeroHistoryAllowed: boolean;
  fullPurgeAllowed: boolean;
  recommendedMode: "ZERO_HISTORY" | "FULL_PURGE" | "ARCHIVE";
  temporaryIdentity: boolean;
  blockers: EmployeeDeletionBlocker[];
  dependencies: EmployeeDeletionBlocker[];
  academyAvailable: boolean;
  academyHasMeaningfulHistory: boolean;
  totalDependencyCount: number;
};

export type AcademyInitialAdminBootstrap = {
  status: "DISABLED" | "READY" | "RESERVED" | "CONSUMED";
  candidateEmployeeId: string | null;
  consumedByEmployeeId: string | null;
  readyAt: string | null;
  consumedAt: string | null;
  backupReference: string | null;
  employeeCount: number;
  primarySuperAdminEmployeeId: string | null;
  requiresConfirmation: boolean;
};

export function isClearlyTemporaryEmployee(employee: Pick<EmployeeDirectoryItem, "employeeCode" | "displayName" | "officialEmail">) {
  const identity = `${employee.employeeCode} ${employee.displayName} ${employee.officialEmail}`.toLowerCase();
  return ["test", "uat", "demo", "temp", "temporary", "duplicate"].some((marker) => identity.includes(marker));
}
