import { demoWorkspaces, type DemoWorkspaceId } from "./demoWorkspaces";

type DashboardView = {
  heading: string;
  description: string;
  metrics: Array<{ label: string; value: string; note: string }>;
  listTitle: string;
  columns: [string, string, string];
  rows: Array<[string, string, string]>;
  alertTitle: string;
  alertBody: string;
  primaryAction: string;
};

const academicRows: Array<[string, string, string]> = [
  ["WX-DEMO-P11", "In progress", "Today"],
  ["WX-DEMO-P12", "Awaiting files", "Tomorrow"],
  ["WX-DEMO-P13", "Review ready", "Friday"]
];

const leadRows: Array<[string, string, string]> = [
  ["WX-DEMO-L11", "Scope review", "Request rubric"],
  ["WX-DEMO-L12", "Quote shared", "Follow up"],
  ["WX-DEMO-L13", "New enquiry", "Review brief"]
];

const views: Record<DemoWorkspaceId, DashboardView> = {
  subject_matter_expert: {
    heading: "My Academic Work", description: "Assigned briefs, active work, deadlines, and review handoffs.",
    metrics: [{ label: "Assigned work", value: "8", note: "Fictional projects" }, { label: "Due today", value: "2", note: "Priority deadlines" }, { label: "Awaiting review", value: "3", note: "Completed drafts" }],
    listTitle: "My work queue", columns: ["Project", "Stage", "Deadline"], rows: academicRows,
    alertTitle: "Deadline approaching", alertBody: "One academic review is due within the next two hours.", primaryAction: "Open assigned work"
  },
  senior_subject_matter_expert: {
    heading: "Senior Academic Review", description: "Complex briefs, review requests, quality escalations, and urgent deadlines.",
    metrics: [{ label: "Review queue", value: "9", note: "Fictional files" }, { label: "Complex briefs", value: "3", note: "Senior review" }, { label: "Escalations", value: "2", note: "Needs attention" }],
    listTitle: "Senior review queue", columns: ["File", "Review type", "Deadline"], rows: [["WX-DEMO-R01", "Methodology", "1 hour"], ["WX-DEMO-R02", "Final review", "Today"], ["WX-DEMO-R03", "Rework check", "Tomorrow"]],
    alertTitle: "Quality escalation", alertBody: "One complex dissertation requires a senior methodology review.", primaryAction: "Open review"
  },
  team_leader: {
    heading: "Team Delivery Today", description: "Team workload, handoffs, approaching deadlines, and daily exceptions.",
    metrics: [{ label: "Active work", value: "18", note: "Fictional team queue" }, { label: "Due today", value: "5", note: "Team deadlines" }, { label: "Blocked", value: "2", note: "Needs intervention" }],
    listTitle: "Team work requiring attention", columns: ["Project", "Owner", "Next step"], rows: [["WX-DEMO-T01", "Demo SME A", "Submit review"], ["WX-DEMO-T02", "Demo SME B", "Resolve query"], ["WX-DEMO-T03", "Unassigned", "Allocate owner"]],
    alertTitle: "Unassigned work", alertBody: "One urgent brief still needs an available subject expert.", primaryAction: "Review team queue"
  },
  team_manager: {
    heading: "Team Performance", description: "Capacity, delivery health, quality movement, and management priorities.",
    metrics: [{ label: "Team capacity", value: "82%", note: "Fictional utilisation" }, { label: "On-time delivery", value: "94%", note: "Demo period" }, { label: "Open risks", value: "4", note: "Needs management" }, { label: "QA returns", value: "3", note: "This week" }],
    listTitle: "Management priorities", columns: ["Area", "Issue", "Impact"], rows: [["Capacity", "Two experts at limit", "Medium"], ["Delivery", "Three deadlines at risk", "High"], ["Quality", "Repeated reference errors", "Medium"]],
    alertTitle: "Capacity risk", alertBody: "The next 24-hour delivery window is nearing full team capacity.", primaryAction: "Review capacity"
  },
  project_manager: {
    heading: "Project Coordination", description: "Active projects, milestones, files, and client dependencies.",
    metrics: [{ label: "Active projects", value: "12", note: "Fictional assignments" }, { label: "Due this week", value: "5", note: "Upcoming deadlines" }, { label: "Waiting on client", value: "3", note: "Missing inputs" }],
    listTitle: "Project queue", columns: ["Project", "Current stage", "Deadline"], rows: academicRows,
    alertTitle: "Client input needed", alertBody: "One project is blocked while waiting for supervisor comments.", primaryAction: "Open project"
  },
  operations_manager: {
    heading: "Operations Overview", description: "Delivery capacity, deadlines, blocked work, and SLA exposure.",
    metrics: [{ label: "Active projects", value: "34", note: "Fictional workload" }, { label: "Deadlines today", value: "7", note: "Delivery queue" }, { label: "Blocked work", value: "5", note: "Needs intervention" }, { label: "SLA risks", value: "3", note: "Priority review" }],
    listTitle: "Priority delivery queue", columns: ["Project", "Stage", "Deadline"], rows: [["WX-DEMO-P01", "Expert review", "Today, 4 PM"], ["WX-DEMO-P02", "Blocked", "Today, 7 PM"], ["WX-DEMO-P03", "QA handoff", "Tomorrow"]],
    alertTitle: "Operational risk", alertBody: "Two scoped briefs are still waiting for expert assignment.", primaryAction: "Review blocked work"
  },
  business_development_associate: {
    heading: "My Enquiries", description: "Assigned leads, follow-ups, quote requests, and the next conversations due.",
    metrics: [{ label: "New enquiries", value: "11", note: "Fictional assignments" }, { label: "Due today", value: "4", note: "Follow-ups" }, { label: "Quotes pending", value: "3", note: "Awaiting client" }],
    listTitle: "My lead queue", columns: ["Lead", "Stage", "Next step"], rows: leadRows,
    alertTitle: "Due next", alertBody: "One urgent dissertation enquiry needs a response within the next hour.", primaryAction: "Open lead"
  },
  business_development_executive: {
    heading: "Business Development", description: "Active pipeline, follow-ups, pending quotes, and conversion opportunities.",
    metrics: [{ label: "Active pipeline", value: "24", note: "Fictional opportunities" }, { label: "Overdue follow-ups", value: "6", note: "Needs action" }, { label: "Quotes pending", value: "5", note: "Awaiting response" }, { label: "Conversions", value: "7", note: "This month" }],
    listTitle: "Priority opportunities", columns: ["Lead", "Stage", "Next step"], rows: leadRows,
    alertTitle: "Follow-up risk", alertBody: "Two high-intent opportunities have had no response for 24 hours.", primaryAction: "Open pipeline"
  },
  accounts: {
    heading: "Accounts Overview", description: "Payment proofs, outstanding balances, reconciliation, and blocked settlements.",
    metrics: [{ label: "Proofs pending", value: "7", note: "Fictional queue" }, { label: "Outstanding", value: "INR 1.9L", note: "Open balances" }, { label: "Reconciliation", value: "4", note: "Needs matching" }, { label: "Blocked payments", value: "2", note: "Needs clarification" }],
    listTitle: "Payment verification queue", columns: ["Invoice", "Status", "Amount"], rows: [["WX-DEMO-I01", "Proof received", "INR 24,000"], ["WX-DEMO-I02", "Needs matching", "INR 18,500"], ["WX-DEMO-I03", "Partially paid", "INR 12,000"]],
    alertTitle: "Reconciliation issue", alertBody: "Two payment references do not match their invoice records.", primaryAction: "Review payment"
  },
  executives_admin: {
    heading: "Executive Administration", description: "Company performance, pipeline health, operational risks, and priority actions.",
    metrics: [{ label: "Confirmed revenue", value: "INR 8.4L", note: "Fictional month-to-date" }, { label: "Open pipeline", value: "INR 12.8L", note: "Qualified opportunities" }, { label: "Revenue at risk", value: "INR 1.6L", note: "Payment or delivery" }, { label: "Critical alerts", value: "4", note: "Needs review" }],
    listTitle: "Top actions", columns: ["Area", "Issue", "Impact"], rows: [["Payments", "7 proofs awaiting review", "INR 92K"], ["Delivery", "3 deadlines at risk", "High"], ["Pipeline", "6 quotes need follow-up", "INR 2.1L"]],
    alertTitle: "Biggest leakage", alertBody: "Unverified payment proofs are delaying three final deliveries.", primaryAction: "Review priority item"
  },
  hr: {
    heading: "People Operations", description: "Workforce alerts, attendance, onboarding, and open HR actions.",
    metrics: [{ label: "Workforce alerts", value: "4", note: "Fictional notices" }, { label: "Attendance actions", value: "6", note: "Needs review" }, { label: "Onboarding", value: "3", note: "In progress" }, { label: "Open actions", value: "8", note: "This week" }],
    listTitle: "HR actions", columns: ["Item", "Status", "Due"], rows: [["Demo Employee A", "Onboarding", "Today"], ["Attendance review", "Pending", "Tomorrow"], ["Policy acknowledgement", "Open", "Friday"]],
    alertTitle: "Onboarding action", alertBody: "One new team member is waiting for workspace access approval.", primaryAction: "Open HR action"
  }
};

export function getEmployeeDemoData(workspaceId: DemoWorkspaceId) {
  const workspace = demoWorkspaces[workspaceId];
  return {
    isDemo: true,
    workspace: workspaceId,
    user: {
      id: `demo-${workspaceId.replaceAll("_", "-")}`,
      employeeId: "WX-DEMO-001",
      name: "Demo Team Member",
      department: workspace.department,
      designation: workspace.designation,
      roles: [{ code: `demo_${workspaceId}`, name: `Demo ${workspace.label}`, isPrimary: true }]
    },
    permissions: workspace.permissions,
    navigation: [{ key: workspaceId, label: workspace.label, route: workspace.destination }],
    defaultRoute: workspace.destination,
    availableWorkspaces: [{ key: workspaceId, label: workspace.label, defaultRoute: workspace.destination, role: workspace.designation.name, description: workspace.description }],
    metrics: views[workspaceId].metrics,
    view: views[workspaceId]
  };
}
