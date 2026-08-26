import type { HiringStage } from "@/lib/hiring/domain";

export type HiringHrmsSyncResult = {
  status:
    | "not_ready"
    | "ready_for_hrms"
    | "sync_pending"
    | "synced"
    | "sync_failed"
    | "manual_review";
  employeeReference?: string;
  safeFailureReason?: string;
};

export interface HiringHrmsProvider {
  createEmployeeFromCandidate(candidateReference: string): Promise<HiringHrmsSyncResult>;
  updateEmployeeFromCandidate(candidateReference: string): Promise<HiringHrmsSyncResult>;
  getEmployeeSyncStatus(candidateReference: string): Promise<HiringHrmsSyncResult>;
  retryEmployeeSync(candidateReference: string): Promise<HiringHrmsSyncResult>;
  deactivateEmployee(candidateReference: string): Promise<HiringHrmsSyncResult>;
}

class UnavailableHiringHrmsProvider implements HiringHrmsProvider {
  private unavailable(): HiringHrmsSyncResult {
    return {
      status: "not_ready",
      safeFailureReason: "HRMS integration is not connected."
    };
  }
  async createEmployeeFromCandidate() { return this.unavailable(); }
  async updateEmployeeFromCandidate() { return this.unavailable(); }
  async getEmployeeSyncStatus() { return this.unavailable(); }
  async retryEmployeeSync() { return this.unavailable(); }
  async deactivateEmployee() { return this.unavailable(); }
}

export function getHiringHrmsProvider(): HiringHrmsProvider {
  // The API adapter intentionally remains unavailable until its contract and
  // credentials have been approved. No mock-success provider is permitted.
  return new UnavailableHiringHrmsProvider();
}

export function evaluateTrustPublishingEligibility(input: {
  stage: HiringStage;
  hrmsStatus: string;
  employeeReference?: string | null;
  officialMobileAvailable: boolean;
  department: string;
  designation: string;
  publicVerificationApproved: boolean;
}) {
  const approvedDepartments = new Set(["Sales", "Management"]);
  const approvedDesignations = new Set([
    "Business Development Associate",
    "Business Development Executive",
    "Senior Business Development Executive",
    "Team Leader",
    "Team Manager",
    "Chief Executive Officer",
    "Director",
    "Founder"
  ]);
  const blockers: string[] = [];
  if (input.stage !== "joined") blockers.push("candidate_not_joined");
  if (input.hrmsStatus !== "Active") blockers.push("hrms_employee_not_active");
  if (!input.employeeReference) blockers.push("employee_reference_missing");
  if (!input.officialMobileAvailable) blockers.push("official_mobile_missing");
  if (!approvedDepartments.has(input.department)) blockers.push("department_not_approved");
  if (!approvedDesignations.has(input.designation)) blockers.push("designation_not_approved");
  if (!input.publicVerificationApproved) blockers.push("management_approval_missing");

  return { eligible: blockers.length === 0, blockers };
}

