import type {
  AcademyArea,
  AcademyInitialAdminBootstrap,
  AcademyRole,
  DeliveryOperationalRole,
  EmployeeDirectoryItem
} from "@/lib/employees/domain";

export type AcademySetupStatus = "COMPLETE" | "NEEDS_ACTION" | "BLOCKED" | "ERROR";
export type AcademySetupTrackKey = "SALES" | "DEVELOPMENT_OPERATIONS";
export type AcademySetupStageKey =
  | "SUPER_ADMIN"
  | "SALES_MANAGER_TL"
  | "SALES_TRAINER"
  | "SALES_FIRST_EMPLOYEE"
  | "DELIVERY_MANAGER"
  | "DELIVERY_TEAM_MANAGER"
  | "DELIVERY_TEAM_LEADER"
  | "DELIVERY_SENIOR_SME"
  | "DELIVERY_JUNIOR_SME"
  | "DELIVERY_TRAINER"
  | "DELIVERY_FIRST_LEARNER";

export type AcademySetupCreatePreset = {
  academyArea: AcademyArea;
  academyRole: AcademyRole;
  deliveryResponsibility?: DeliveryOperationalRole | "TRAINER";
  deliveryReportingParentEmployeeId?: string;
};

export type AcademySetupStage = {
  key: AcademySetupStageKey;
  label: string;
  explanation: string;
  status: AcademySetupStatus;
  completedBy: string | null;
  issue: string | null;
};

export type AcademySetupAction = {
  kind: "CREATE_EMPLOYEE" | "OPEN_GOVERNANCE" | "OPEN_SYNC" | "OPEN_EMPLOYEE";
  label: string;
  explanation: string;
  href?: string;
  preset?: AcademySetupCreatePreset;
};

export type AcademySetupTrack = {
  key: AcademySetupTrackKey;
  label: string;
  complete: boolean;
  stages: AcademySetupStage[];
  action: AcademySetupAction | null;
  summary: string;
};

export type AcademySetupJourney = {
  complete: boolean;
  superAdmin: AcademySetupStage;
  tracks: AcademySetupTrack[];
  summary: string;
};

function activeAccess(employee: EmployeeDirectoryItem) {
  return !employee.archivedAt && employee.employmentStatus === "ACTIVE" && employee.academyEnabled;
}

function synced(employee: EmployeeDirectoryItem) {
  return activeAccess(employee) && employee.syncStatus === "SYNCED";
}

function stageStatus(candidate: EmployeeDirectoryItem | null, valid: EmployeeDirectoryItem | null, blocked: boolean): AcademySetupStatus {
  if (valid) return "COMPLETE";
  if (candidate) return "ERROR";
  return blocked ? "BLOCKED" : "NEEDS_ACTION";
}

function stage(
  key: AcademySetupStageKey,
  label: string,
  explanation: string,
  candidate: EmployeeDirectoryItem | null,
  valid: EmployeeDirectoryItem | null,
  blocked = false,
  issue?: string
): AcademySetupStage {
  const status = stageStatus(candidate, valid, blocked);
  return {
    key,
    label,
    explanation,
    status,
    completedBy: valid?.displayName || null,
    issue: status === "ERROR"
      ? candidate?.lastSyncError || issue || "The saved mapping is incomplete or has not synced successfully."
      : status === "BLOCKED"
        ? issue || "Complete the required earlier relationship first."
        : status === "NEEDS_ACTION"
          ? issue || "No valid employee is assigned yet."
          : null
  };
}

function createAction(label: string, explanation: string, preset: AcademySetupCreatePreset): AcademySetupAction {
  return { kind: "CREATE_EMPLOYEE", label, explanation, preset };
}

function errorAction(employee: EmployeeDirectoryItem, explanation: string): AcademySetupAction {
  return {
    kind: "OPEN_EMPLOYEE",
    label: `Repair ${employee.displayName}`,
    explanation,
    href: `/admin/employees/${employee.id}`
  };
}

function buildSalesTrack(employees: EmployeeDirectoryItem[], commonReady: boolean): AcademySetupTrack {
  const candidates = employees.filter((employee) => activeAccess(employee) && employee.academyArea === "SALES");
  const managerCandidates = candidates.filter((employee) => employee.academyRole === "MANAGER_TL");
  const manager = managerCandidates.find(synced) || null;
  const managerCandidate = manager || managerCandidates[0] || null;
  const trainerCandidates = candidates.filter((employee) => employee.academyRole === "TRAINER");
  const trainer = trainerCandidates.find((employee) => synced(employee) && Boolean(manager && employee.managerEmployeeId === manager.id)) || null;
  const trainerCandidate = trainer || trainerCandidates[0] || null;
  const employeeCandidates = candidates.filter((employee) => employee.academyRole === "EMPLOYEE");
  const firstEmployee = employeeCandidates.find((employee) => synced(employee)
    && Boolean(trainer && employee.managerEmployeeId === trainer.id)
    && Boolean(employee.academyUserId)) || null;
  const employeeCandidate = firstEmployee || employeeCandidates[0] || null;
  const stages = [
    stage("SALES_MANAGER_TL", "Manager / TL", "Owns the Sales team structure and performance follow-through.", managerCandidate, manager, !commonReady),
    stage("SALES_TRAINER", "Trainer", "Reports to the Manager / TL and supports employee development.", trainerCandidate, trainer, !manager, trainerCandidate ? "Assign an active Sales Manager / TL and retry Academy sync." : "Create the Sales Manager / TL first."),
    stage("SALES_FIRST_EMPLOYEE", "First employee", "Reports to the Trainer and receives working Academy credentials.", employeeCandidate, firstEmployee, !trainer, employeeCandidate ? "Assign the Sales Trainer, confirm credentials, and resolve Academy sync." : "Create the Sales Trainer first.")
  ];
  let action: AcademySetupAction | null = null;
  if (!commonReady) action = { kind: "OPEN_GOVERNANCE", label: "Complete Academy SuperAdmin", explanation: "The shared Academy authority must be healthy first.", href: "/admin/ai-governance#primary-superadmin" };
  else if (!manager) action = managerCandidate
    ? errorAction(managerCandidate, stages[0].issue || "Repair the Sales Manager / TL mapping.")
    : createAction("Add Sales Manager / TL", stages[0].explanation, { academyArea: "SALES", academyRole: "MANAGER_TL" });
  else if (!trainer) action = trainerCandidate
    ? errorAction(trainerCandidate, stages[1].issue || "Repair the Sales Trainer mapping.")
    : createAction("Add Sales Trainer", stages[1].explanation, { academyArea: "SALES", academyRole: "TRAINER" });
  else if (!firstEmployee) action = employeeCandidate
    ? errorAction(employeeCandidate, stages[2].issue || "Repair the first Sales employee mapping.")
    : createAction("Add first Sales employee", stages[2].explanation, { academyArea: "SALES", academyRole: "EMPLOYEE" });
  const complete = stages.every((item) => item.status === "COMPLETE");
  return {
    key: "SALES",
    label: "Sales",
    complete,
    stages,
    action,
    summary: complete
      ? `Sales is ready: ${manager?.displayName}, ${trainer?.displayName}, and ${firstEmployee?.displayName}.`
      : `${stages.filter((item) => item.status === "COMPLETE").length} of ${stages.length} Sales stages are complete.`
  };
}

function buildDeliveryTrack(employees: EmployeeDirectoryItem[], commonReady: boolean): AcademySetupTrack {
  const candidates = employees.filter((employee) => activeAccess(employee) && employee.academyArea === "DEVELOPMENT_OPERATIONS");
  const trainerCandidates = candidates.filter((employee) => employee.academyRole === "TRAINER" && !employee.deliveryOperationalRole);
  const trainer = trainerCandidates.find(synced) || null;
  const trainerCandidate = trainer || trainerCandidates[0] || null;
  const roleCandidates = (role: DeliveryOperationalRole) => candidates.filter((employee) => employee.academyRole === "EMPLOYEE" && employee.deliveryOperationalRole === role);
  const managerCandidates = roleCandidates("MANAGER");
  const manager = managerCandidates.find((employee) => synced(employee) && !employee.deliveryReportingParentEmployeeId) || null;
  const managerCandidate = manager || managerCandidates[0] || null;
  const teamManagerCandidates = roleCandidates("TEAM_MANAGER");
  const teamManager = teamManagerCandidates.find((employee) => synced(employee)
    && Boolean(manager && employee.deliveryReportingParentEmployeeId === manager.id)) || null;
  const teamManagerCandidate = teamManager || teamManagerCandidates[0] || null;
  const teamLeaderCandidates = roleCandidates("TEAM_LEADER");
  const teamLeader = teamLeaderCandidates.find((employee) => synced(employee)
    && !employee.deliveryHierarchyAttention
    && Boolean(teamManager && employee.deliveryReportingParentEmployeeId === teamManager.id)) || null;
  const transitionalTeamLeader = teamLeaderCandidates.find((employee) => Boolean(
    manager
    && employee.deliveryReportingParentEmployeeId === manager.id
    && employee.deliveryHierarchyAttention === "TEAM_MANAGER_ASSIGNMENT_REQUIRED"
  )) || null;
  const operationalTeamLeader = teamLeader || transitionalTeamLeader;
  const tlCandidate = operationalTeamLeader || teamLeaderCandidates[0] || null;
  const seniorCandidates = roleCandidates("SENIOR_SME");
  const senior = seniorCandidates.find((employee) => synced(employee)
    && Boolean(operationalTeamLeader && employee.deliveryReportingParentEmployeeId === operationalTeamLeader.id)
    && Boolean(trainer && employee.deliveryTrainerEmployeeId === trainer.id)) || null;
  const seniorCandidate = senior || seniorCandidates[0] || null;
  const juniorCandidates = roleCandidates("JUNIOR_SME");
  const junior = juniorCandidates.find((employee) => synced(employee)
    && Boolean(operationalTeamLeader && employee.deliveryReportingParentEmployeeId === operationalTeamLeader.id)
    && Boolean(trainer && employee.deliveryTrainerEmployeeId === trainer.id)) || null;
  const juniorCandidate = junior || juniorCandidates[0] || null;
  const learnerCandidate = seniorCandidate || juniorCandidate;
  const firstLearner = [senior, junior].find((employee) => Boolean(
    employee?.academyUserId
    && employee.learningAssignmentId
    && ["ASSIGNED", "ACTIVE", "PAUSED", "COMPLETED"].includes(employee.learningAssignmentStatus)
  )) || null;
  const teamManagerStage: AcademySetupStage = teamManager && teamLeader
    ? stage("DELIVERY_TEAM_MANAGER", "Team Manager", "Reports to the Delivery Manager and governs assigned Team Leaders.", teamManager, teamManager)
    : {
        key: "DELIVERY_TEAM_MANAGER",
        label: "Team Manager",
        explanation: "Reports to the Delivery Manager and governs assigned Team Leaders.",
        status: commonReady && manager ? "NEEDS_ACTION" : "BLOCKED",
        completedBy: teamManager?.displayName || null,
        issue: !commonReady || !manager
          ? "Create the Delivery Manager first."
          : !teamManager
            ? "Add a Team Manager under the Delivery Manager and assign the existing Team Leader."
            : transitionalTeamLeader
              ? `Assign ${transitionalTeamLeader.displayName} to ${teamManager.displayName}; the temporary direct Delivery Manager relationship remains active until then.`
              : "Assign an active Team Leader to this Team Manager."
      };
  const stages = [
    stage("DELIVERY_MANAGER", "Delivery Manager", "Creates the root of the Development / Operations reporting hierarchy.", managerCandidate, manager, !commonReady),
    teamManagerStage,
    stage("DELIVERY_TEAM_LEADER", "Team Leader", "Reports to the approved Team Manager.", tlCandidate, operationalTeamLeader, !manager, tlCandidate ? "Assign the Team Leader to the approved Team Manager and retry sync." : "Create the Team Manager first."),
    stage("DELIVERY_SENIOR_SME", "Senior SME", "Reports to the Team Leader and has a separate Delivery Trainer assignment.", seniorCandidate, senior, !operationalTeamLeader || !trainer, seniorCandidate ? "Correct the Team Leader, Delivery Trainer, or sync state." : !operationalTeamLeader ? "Complete the Team Manager and Team Leader relationship first." : !trainer ? "Assign a Delivery Trainer before enabling this learner." : "Add a Senior SME under the Team Leader and assign the Delivery Trainer."),
    stage("DELIVERY_JUNIOR_SME", "Junior SME", "Reports directly to the Team Leader and has a separate Delivery Trainer assignment.", juniorCandidate, junior, !operationalTeamLeader || !trainer, juniorCandidate ? "Correct the Team Leader, Delivery Trainer, or sync state." : !operationalTeamLeader ? "Complete the Team Manager and Team Leader relationship first." : !trainer ? "Assign a Delivery Trainer before enabling this learner." : "Add a Junior SME under the Team Leader and assign the Delivery Trainer."),
    stage("DELIVERY_TRAINER", "Delivery Trainer", "Supports learning without becoming the operational hierarchy parent.", trainerCandidate, trainer, !commonReady),
    stage("DELIVERY_FIRST_LEARNER", "First learner ready", "Confirms identity, hierarchy, Trainer, active learning assignment, credentials, and Academy sync are healthy.", learnerCandidate, firstLearner, !senior && !junior, learnerCandidate ? "Open the learner record and assign the Development Academy Core Learning Path." : "Create a Senior or Junior SME first.")
  ];
  let action: AcademySetupAction | null = null;
  if (!commonReady) action = { kind: "OPEN_GOVERNANCE", label: "Complete Academy SuperAdmin", explanation: "The shared Academy authority must be healthy first.", href: "/admin/ai-governance#primary-superadmin" };
  else if (!manager) action = managerCandidate
    ? errorAction(managerCandidate, stages[0].issue || "Repair the Delivery Manager mapping.")
    : createAction("Add Delivery Manager", stages[0].explanation, { academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "EMPLOYEE", deliveryResponsibility: "MANAGER" });
  else if (!teamManager) action = teamManagerCandidate
    ? errorAction(teamManagerCandidate, stages[1].issue || "Repair the Delivery Team Manager mapping.")
    : createAction("Add Team Manager", stages[1].explanation, { academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "EMPLOYEE", deliveryResponsibility: "TEAM_MANAGER", deliveryReportingParentEmployeeId: manager.id });
  else if (!teamLeader) action = transitionalTeamLeader
    ? { kind: "OPEN_EMPLOYEE", label: "Assign Team Leader", explanation: stages[1].issue || "Move the existing Team Leader under the Team Manager.", href: `/admin/employees/${transitionalTeamLeader.id}` }
    : tlCandidate
      ? errorAction(tlCandidate, stages[2].issue || "Repair the Delivery Team Leader mapping.")
      : createAction("Add Team Leader", stages[2].explanation, { academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "EMPLOYEE", deliveryResponsibility: "TEAM_LEADER", deliveryReportingParentEmployeeId: teamManager.id });
  else if (!trainer) action = trainerCandidate
    ? errorAction(trainerCandidate, stages[5].issue || "Repair the Delivery Trainer mapping.")
    : createAction("Add Delivery Trainer", stages[5].explanation, { academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "TRAINER", deliveryResponsibility: "TRAINER" });
  else if (!senior) action = seniorCandidate
    ? errorAction(seniorCandidate, stages[3].issue || "Repair the Senior SME mapping.")
    : createAction("Add Senior SME", stages[3].explanation, { academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "EMPLOYEE", deliveryResponsibility: "SENIOR_SME", deliveryReportingParentEmployeeId: operationalTeamLeader!.id });
  else if (!junior) action = juniorCandidate
    ? errorAction(juniorCandidate, stages[4].issue || "Repair the Junior SME mapping.")
    : createAction("Add Junior SME", stages[4].explanation, { academyArea: "DEVELOPMENT_OPERATIONS", academyRole: "EMPLOYEE", deliveryResponsibility: "JUNIOR_SME", deliveryReportingParentEmployeeId: operationalTeamLeader!.id });
  else if (!firstLearner) action = learnerCandidate
    ? { kind: "OPEN_EMPLOYEE", label: "Assign learning", explanation: stages[6].issue || "Assign the Development Academy Core Learning Path.", href: `/admin/employees/${learnerCandidate.id}#delivery-learning-assignment` }
    : { kind: "OPEN_SYNC", label: "Open Academy Sync Attention", explanation: stages[6].explanation, href: "/admin/employees?sync=attention&area=DEVELOPMENT_OPERATIONS" };
  const complete = stages.every((item) => item.status === "COMPLETE");
  return {
    key: "DEVELOPMENT_OPERATIONS",
    label: "Development / Operations",
    complete,
    stages,
    action,
    summary: complete
      ? `Development Academy is ready: ${manager?.displayName}, ${teamManager?.displayName}, ${teamLeader?.displayName}, ${senior?.displayName}, ${junior?.displayName}, and ${trainer?.displayName}.`
      : `${stages.filter((item) => item.status === "COMPLETE").length} of ${stages.length} Development stages are complete.`
  };
}

export function evaluateAcademySetupJourney(employees: EmployeeDirectoryItem[], bootstrap: AcademyInitialAdminBootstrap): AcademySetupJourney {
  const primaryCandidates = employees.filter((employee) => activeAccess(employee) && employee.academyRole === "SUPER_ADMIN" && employee.primarySuperAdmin);
  const primary = primaryCandidates.length === 1
    ? primaryCandidates.find((employee) => employee.academyArea === "ACADEMY_WIDE" && synced(employee)) || null
    : null;
  const superAdminCandidate = primary || primaryCandidates[0]
    || employees.find((employee) => activeAccess(employee) && employee.academyRole === "SUPER_ADMIN")
    || null;
  const superAdmin = stage(
    "SUPER_ADMIN",
    "Academy SuperAdmin",
    "One Academy-wide authority governs both Sales and Development / Operations.",
    superAdminCandidate,
    primary,
    false,
    primaryCandidates.length > 1
      ? "Multiple Primary SuperAdmins are active. Keep exactly one Academy-wide Primary authority."
      : superAdminCandidate
        ? "Set Academy area to Academy-wide, resolve sync, and keep exactly one Primary authority."
        : bootstrap.requiresConfirmation ? "Create the real first Academy administrator." : "Assign the existing synced SuperAdmin as Primary."
  );
  const commonReady = superAdmin.status === "COMPLETE";
  const tracks = [buildSalesTrack(employees, commonReady), buildDeliveryTrack(employees, commonReady)];
  const complete = commonReady && tracks.every((track) => track.complete);
  return {
    complete,
    superAdmin,
    tracks,
    summary: complete
      ? `Academy operating structure is ready across Sales and Development / Operations under ${primary?.displayName}.`
      : `Shared governance is ${commonReady ? "complete" : "not ready"}. ${tracks.filter((track) => track.complete).length} of ${tracks.length} department tracks are complete.`
  };
}
