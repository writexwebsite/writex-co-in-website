import type { AdminSession } from "@/lib/auth";
import { forbidden } from "@/lib/api/response";

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
  return toolPermissionsByRole[session.role].includes(permission);
}
