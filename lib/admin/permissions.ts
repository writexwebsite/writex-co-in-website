import type { AdminSession } from "@/lib/auth";
import { forbidden } from "@/lib/api/response";

function getEffectiveHiringRole(session: AdminSession) {
  return session.role === "super_admin" ? "super_admin" : session.hiringRole || session.role;
}

export function assertCanMutateAdmin(session: AdminSession) {
  if (session.role === "viewer") {
    throw forbidden("Viewer admins cannot change internal records.");
  }
}

export function assertCanExport(session: AdminSession) {
  if (!["super_admin", "sales"].includes(session.role)) {
    throw forbidden("This export is restricted.");
  }
}

export function canManageRepresentativeDirectory(session: AdminSession) {
  return session.role === "super_admin";
}

export function assertCanManageRepresentativeDirectory(session: AdminSession) {
  if (!canManageRepresentativeDirectory(session)) {
    throw forbidden("Only a Super Admin can manage the representative directory.");
  }
}

export function canManageClientPortal(session: AdminSession) {
  return session.role === "super_admin";
}

export function assertCanManageClientPortal(session: AdminSession) {
  if (!canManageClientPortal(session)) {
    throw forbidden("Only a Super Admin can manage Client Portal Operations.");
  }
}

export function canManageEmployees(session: AdminSession) {
  return session.role === "super_admin";
}

export function assertCanManageEmployees(session: AdminSession) {
  if (!canManageEmployees(session)) {
    throw forbidden("Only a Super Admin can manage employee lifecycle and application access.");
  }
}

export function canManageAiGovernance(session: AdminSession) {
  return session.role === "super_admin";
}

export function assertCanManageAiGovernance(session: AdminSession) {
  if (!canManageAiGovernance(session)) {
    throw forbidden("Only a Super Admin can manage AI usage, budgets and Academy governance.");
  }
}

export function canManageWebsiteExperience(session: AdminSession) {
  return ["super_admin", "website_experience_admin"].includes(session.role);
}

export function canViewWebsiteExperience(session: AdminSession) {
  return [
    "super_admin",
    "website_experience_admin",
    "read_only_auditor"
  ].includes(session.role);
}

export function canActivateWebsiteExperience(session: AdminSession) {
  if (session.role === "super_admin") return true;
  return (
    session.role === "website_experience_admin" &&
    process.env.WEBSITE_EXPERIENCE_ADMIN_CAN_ACTIVATE === "true"
  );
}

export function assertCanViewWebsiteExperience(session: AdminSession) {
  if (!canViewWebsiteExperience(session)) {
    throw forbidden("This Website Experience workspace is restricted.");
  }
}

export function assertCanActivateWebsiteExperience(session: AdminSession) {
  if (!canActivateWebsiteExperience(session)) {
    throw forbidden("This account can preview Website Experience but cannot activate it.");
  }
}

export function assertCanManageWebsiteExperience(session: AdminSession) {
  if (!canManageWebsiteExperience(session)) {
    throw forbidden(
      "Only a Super Admin or Website Experience Admin can manage Website Experience."
    );
  }
}

export function canManageConnectedCandidateReviews(session: AdminSession) {
  return session.role === "super_admin";
}

export function assertCanManageConnectedCandidateReviews(
  session: AdminSession
) {
  if (!canManageConnectedCandidateReviews(session)) {
    throw forbidden(
      "Only a Super Admin can manage Connected Candidate Reviews."
    );
  }
}

export function canManageSmartHiring(session: AdminSession) {
  return [
    "super_admin",
    "hr_admin",
    "hiring_manager",
    "assessor",
    "interviewer",
    "read_only_auditor"
  ].includes(getEffectiveHiringRole(session));
}

export function canViewHiringCandidateIdentity(session: AdminSession) {
  return ["super_admin", "hr_admin", "hiring_manager"].includes(getEffectiveHiringRole(session));
}

export type HiringPermission =
  | "hiring.applications.view"
  | "hiring.applications.manage"
  | "hiring.applications.export"
  | "hiring.assessments.review"
  | "hiring.interviews.manage"
  | "hiring.verification.review"
  | "hiring.offers.approve"
  | "hiring.question_bank.manage"
  | "hiring.settings.manage"
  | "hiring.audit.view";

const hiringPermissionsByRole: Record<string, HiringPermission[]> = {
  super_admin: ["hiring.applications.view","hiring.applications.manage","hiring.applications.export","hiring.assessments.review","hiring.interviews.manage","hiring.verification.review","hiring.offers.approve","hiring.question_bank.manage","hiring.settings.manage","hiring.audit.view"],
  hr_admin: ["hiring.applications.view","hiring.applications.manage","hiring.applications.export","hiring.assessments.review","hiring.interviews.manage","hiring.verification.review","hiring.question_bank.manage","hiring.settings.manage","hiring.audit.view"],
  hiring_manager: ["hiring.applications.view","hiring.applications.manage","hiring.applications.export","hiring.assessments.review","hiring.interviews.manage","hiring.question_bank.manage","hiring.audit.view"],
  assessor: ["hiring.applications.view","hiring.assessments.review"],
  interviewer: ["hiring.applications.view","hiring.interviews.manage"],
  read_only_auditor: ["hiring.applications.view","hiring.audit.view"]
};

export function canUseHiringPermission(session: AdminSession, permission: HiringPermission) {
  return (hiringPermissionsByRole[getEffectiveHiringRole(session)] ?? []).includes(permission);
}

export function assertHiringPermission(session: AdminSession, permission: HiringPermission) {
  if (!canUseHiringPermission(session, permission)) throw forbidden("This hiring action is restricted.");
}

export function assertCanManageSmartHiring(session: AdminSession) {
  if (!canManageSmartHiring(session)) {
    throw forbidden("This Smart Hiring operation requires an authorised hiring role.");
  }
}

export type ToolPermission =
  | "tools.leads.view"
  | "tools.leads.assign"
  | "tools.analytics.view"
  | "term_plans.interest.view";

const toolPermissionsByRole: Record<AdminSession["role"], ToolPermission[]> = {
  super_admin: ["tools.leads.view", "tools.leads.assign", "tools.analytics.view", "term_plans.interest.view"],
  sales: ["tools.leads.view", "tools.leads.assign", "tools.analytics.view", "term_plans.interest.view"],
  support: ["tools.leads.view", "term_plans.interest.view"],
  accounts: [],
  viewer: []
};

export function canUseToolPermission(session: AdminSession, permission: ToolPermission) {
  return (toolPermissionsByRole[session.role] ?? []).includes(permission);
}
