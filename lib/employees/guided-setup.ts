import type { AcademyInitialAdminBootstrap, AcademyRole, EmployeeDirectoryItem } from "@/lib/employees/domain";

export type AcademySetupStageKey = "SUPER_ADMIN" | "MANAGER_TL" | "TRAINER" | "EMPLOYEE";

export type AcademySetupStage = {
  key: AcademySetupStageKey;
  label: string;
  explanation: string;
  status: "COMPLETE" | "CURRENT" | "PENDING";
  completedBy: string | null;
};

export type AcademySetupAction = {
  kind: "CREATE_EMPLOYEE" | "OPEN_GOVERNANCE";
  academyRole?: AcademyRole;
  label: string;
  explanation: string;
  href?: string;
};

export type AcademySetupJourney = {
  complete: boolean;
  stages: AcademySetupStage[];
  action: AcademySetupAction | null;
  summary: string;
};

function operational(employee: EmployeeDirectoryItem) {
  return !employee.archivedAt
    && employee.employmentStatus === "ACTIVE"
    && employee.academyEnabled
    && employee.syncStatus === "SYNCED";
}

export function evaluateAcademySetupJourney(
  employees: EmployeeDirectoryItem[],
  bootstrap: AcademyInitialAdminBootstrap
): AcademySetupJourney {
  const active = employees.filter(operational);
  const superAdmins = active.filter((employee) => employee.academyRole === "SUPER_ADMIN");
  const primary = superAdmins.find((employee) => employee.primarySuperAdmin) || null;
  const managers = active.filter((employee) => employee.academyRole === "MANAGER_TL");
  const managerIds = new Set(managers.map((employee) => employee.id));
  const trainers = active.filter((employee) => employee.academyRole === "TRAINER" && Boolean(employee.managerEmployeeId && managerIds.has(employee.managerEmployeeId)));
  const trainerIds = new Set(trainers.map((employee) => employee.id));
  const firstEmployee = active.find((employee) => employee.academyRole === "EMPLOYEE" && Boolean(employee.managerEmployeeId && trainerIds.has(employee.managerEmployeeId))) || null;
  const completed = {
    SUPER_ADMIN: primary,
    MANAGER_TL: managers[0] || null,
    TRAINER: trainers[0] || null,
    EMPLOYEE: firstEmployee
  } satisfies Record<AcademySetupStageKey, EmployeeDirectoryItem | null>;
  const definitions: Array<Pick<AcademySetupStage, "key" | "label" | "explanation">> = [
    { key: "SUPER_ADMIN", label: "Primary SuperAdmin", explanation: "Owns Academy governance and operational control." },
    { key: "MANAGER_TL", label: "Manager / TL", explanation: "Owns the team structure and performance follow-through." },
    { key: "TRAINER", label: "Trainer", explanation: "Reports to the Manager / TL and supports employee development." },
    { key: "EMPLOYEE", label: "First employee", explanation: "Reports to the Trainer and receives working Academy credentials." }
  ];
  const currentIndex = definitions.findIndex((stage) => !completed[stage.key]);
  const stages = definitions.map((stage, index): AcademySetupStage => ({
    ...stage,
    status: completed[stage.key] ? "COMPLETE" : index === currentIndex ? "CURRENT" : "PENDING",
    completedBy: completed[stage.key]?.displayName || null
  }));
  if (currentIndex < 0) {
    return {
      complete: true,
      stages,
      action: null,
      summary: `Academy operating structure is ready: ${primary?.displayName}, ${managers[0]?.displayName}, ${trainers[0]?.displayName}, and ${firstEmployee?.displayName}.`
    };
  }

  const missing = definitions[currentIndex].key;
  let action: AcademySetupAction;
  if (missing === "SUPER_ADMIN" && superAdmins.length > 0 && !bootstrap.requiresConfirmation) {
    action = {
      kind: "OPEN_GOVERNANCE",
      label: "Assign Primary SuperAdmin",
      explanation: "A synced SuperAdmin exists, but Website governance has not assigned the single Primary authority.",
      href: "/admin/ai-governance#primary-superadmin"
    };
  } else {
    action = {
      kind: "CREATE_EMPLOYEE",
      academyRole: missing,
      label: missing === "SUPER_ADMIN"
        ? "Create Primary SuperAdmin"
        : missing === "MANAGER_TL"
          ? "Create Manager / TL"
          : missing === "TRAINER"
            ? "Create Trainer"
            : "Create first employee",
      explanation: definitions[currentIndex].explanation
    };
  }
  return {
    complete: false,
    stages,
    action,
    summary: `${currentIndex} of ${definitions.length} setup stages are complete. ${action.label} is the next required action.`
  };
}
