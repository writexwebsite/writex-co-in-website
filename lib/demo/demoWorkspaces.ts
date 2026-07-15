export const demoWorkspaceIds = [
  "subject_matter_expert",
  "senior_subject_matter_expert",
  "team_leader",
  "team_manager",
  "project_manager",
  "operations_manager",
  "business_development_associate",
  "business_development_executive",
  "accounts",
  "executives_admin",
  "hr"
] as const;

export type DemoWorkspaceId = (typeof demoWorkspaceIds)[number];

export type DemoWorkspace = {
  id: DemoWorkspaceId;
  label: string;
  description: string;
  destination: string;
  department: { code: string; name: string };
  designation: { code: string; name: string };
  permissions: Array<{ code: string; scope: "self" | "team" | "department" | "company" }>;
};

export const demoWorkspaces: Record<DemoWorkspaceId, DemoWorkspace> = {
  subject_matter_expert: {
    id: "subject_matter_expert", label: "Subject Matter Expert", description: "Assigned academic work, deadlines, and review handoffs.", destination: "/employee/my-projects",
    department: { code: "ACADEMIC", name: "Academic Delivery" }, designation: { code: "SME", name: "Subject Matter Expert" },
    permissions: [{ code: "projects.view", scope: "self" }]
  },
  senior_subject_matter_expert: {
    id: "senior_subject_matter_expert", label: "Senior Subject Matter Expert", description: "Senior review queue, complex briefs, and quality escalations.", destination: "/employee/review-queue",
    department: { code: "ACADEMIC", name: "Academic Delivery" }, designation: { code: "SENIOR_SME", name: "Senior Subject Matter Expert" },
    permissions: [{ code: "projects.view", scope: "team" }, { code: "qa.view", scope: "team" }]
  },
  team_leader: {
    id: "team_leader", label: "Team Leader", description: "Team workload, handoffs, deadlines, and daily exceptions.", destination: "/employee/team-performance",
    department: { code: "ACADEMIC", name: "Academic Delivery" }, designation: { code: "TEAM_LEADER", name: "Team Leader" },
    permissions: [{ code: "projects.view", scope: "team" }, { code: "reports.view", scope: "team" }]
  },
  team_manager: {
    id: "team_manager", label: "Team Manager", description: "Team capacity, delivery health, and performance oversight.", destination: "/employee/team-performance",
    department: { code: "ACADEMIC", name: "Academic Delivery" }, designation: { code: "TEAM_MANAGER", name: "Team Manager" },
    permissions: [{ code: "projects.view", scope: "department" }, { code: "reports.view", scope: "department" }]
  },
  project_manager: {
    id: "project_manager", label: "Project Manager", description: "Project coordination, milestones, files, and client dependencies.", destination: "/employee/projects",
    department: { code: "PROJECTS", name: "Project Management" }, designation: { code: "PROJECT_MANAGER", name: "Project Manager" },
    permissions: [{ code: "projects.view", scope: "self" }]
  },
  operations_manager: {
    id: "operations_manager", label: "Operations Manager", description: "Delivery capacity, blocked work, deadlines, and SLA risks.", destination: "/employee/operations",
    department: { code: "OPS", name: "Operations" }, designation: { code: "OPERATIONS_MANAGER", name: "Operations Manager" },
    permissions: [{ code: "operations.view", scope: "department" }, { code: "projects.view", scope: "department" }]
  },
  business_development_associate: {
    id: "business_development_associate", label: "Business Development Associate", description: "Assigned enquiries, follow-ups, and quote requests.", destination: "/employee/my-leads",
    department: { code: "BD", name: "Business Development" }, designation: { code: "BDA", name: "Business Development Associate" },
    permissions: [{ code: "leads.view", scope: "self" }]
  },
  business_development_executive: {
    id: "business_development_executive", label: "Business Development Executive", description: "Lead pipeline, active quotes, and conversion follow-ups.", destination: "/employee/my-leads",
    department: { code: "BD", name: "Business Development" }, designation: { code: "BDE", name: "Business Development Executive" },
    permissions: [{ code: "leads.view", scope: "self" }, { code: "reports.view", scope: "self" }]
  },
  accounts: {
    id: "accounts", label: "Accounts", description: "Payment proofs, outstanding balances, and reconciliation.", destination: "/employee/invoices",
    department: { code: "ACCOUNTS", name: "Accounts" }, designation: { code: "ACCOUNTS", name: "Accounts" },
    permissions: [{ code: "invoices.view", scope: "department" }, { code: "payments.view", scope: "department" }]
  },
  executives_admin: {
    id: "executives_admin", label: "Executives/Admin", description: "Company-level performance, risks, approvals, and priority actions.", destination: "/employee/executive-intelligence",
    department: { code: "EXEC_ADMIN", name: "Executive Administration" }, designation: { code: "EXEC_ADMIN", name: "Executives/Admin" },
    permissions: [{ code: "reports.view", scope: "company" }, { code: "dashboards.view", scope: "company" }]
  },
  hr: {
    id: "hr", label: "HR", description: "Workforce alerts, attendance, onboarding, and open people actions.", destination: "/employee/hr",
    department: { code: "HR", name: "Human Resources" }, designation: { code: "HR", name: "HR" },
    permissions: [{ code: "workforce.view", scope: "department" }, { code: "attendance.view", scope: "department" }]
  }
};

export function isDemoWorkspaceId(value: unknown): value is DemoWorkspaceId {
  return typeof value === "string" && demoWorkspaceIds.includes(value as DemoWorkspaceId);
}

export const publicDemoWorkspaces = demoWorkspaceIds.map((id) => {
  const workspace = demoWorkspaces[id];
  return { id, label: workspace.label, description: workspace.description, destination: workspace.destination };
});
