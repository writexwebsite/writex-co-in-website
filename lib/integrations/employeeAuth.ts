import "server-only";
import { ApiError, notConfigured, unauthorized } from "@/lib/api/response";

export type EmployeeBootstrap = {
  user: { id: string; employeeId: string; name: string; email?: string; department?: { id: string; code: string; name: string }; designation?: { id: string; code: string; name: string; level?: number }; roles: Array<{ code: string; name: string; isPrimary: boolean }>; managerId?: string | null };
  permissions: Array<{ code: string; scope: "self" | "team" | "department" | "business_unit" | "company" }>;
  navigation: Array<{ key: string; label: string; route: string; icon?: string; children?: unknown[] }>;
  defaultRoute: string;
  availableWorkspaces: Array<{ key: string; label: string; defaultRoute: string; role?: string; description?: string }>;
};

function baseUrl() { const value = process.env.EMPLOYEE_AUTH_API_BASE_URL || process.env.EMPLOYEE_DIRECTORY_API_BASE_URL; if (!value) throw notConfigured("Employee authentication service is not configured."); return value.replace(/\/$/, ""); }
async function requestEmployee(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl()}${path}`, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, signal: AbortSignal.timeout(10000) });
  if (response.status === 401 || response.status === 403) throw unauthorized("Unable to sign in with those details. Please try again or contact WriteX IT Support.");
  if (!response.ok) throw new ApiError(503, "EMPLOYEE_DIRECTORY_UNAVAILABLE", "Employee workspace service is temporarily unavailable.");
  return response.json();
}
export async function authenticateEmployee(identifier: string, password: string): Promise<EmployeeBootstrap> { return requestEmployee("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }); }
export async function getEmployeeBootstrap(employeeId: string): Promise<EmployeeBootstrap> { return requestEmployee(`/employees/${encodeURIComponent(employeeId)}/bootstrap`); }
export async function getEmployeeProfile(employeeId: string) { return (await getEmployeeBootstrap(employeeId)).user; }
export async function getEmployeeDepartment(employeeId: string) { return (await getEmployeeProfile(employeeId)).department; }
export async function getEmployeeDesignation(employeeId: string) { return (await getEmployeeProfile(employeeId)).designation; }
export async function getEmployeeRoles(employeeId: string) { return (await getEmployeeProfile(employeeId)).roles; }
export async function getEmployeePermissions(employeeId: string) { return (await getEmployeeBootstrap(employeeId)).permissions; }
export async function getEmployeeHierarchy(employeeId: string) { const user = await getEmployeeProfile(employeeId); return { managerId: user.managerId }; }
export async function getEmployeeNavigation(employeeId: string) { return (await getEmployeeBootstrap(employeeId)).navigation; }
export async function getEmployeeDefaultRoute(employeeId: string) { return (await getEmployeeBootstrap(employeeId)).defaultRoute; }
