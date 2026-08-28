import "server-only";

import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/response";
import type { AdminSession } from "@/lib/auth";
import { dbQuery } from "@/lib/db";
import {
  academyAreas,
  academyRoles,
  deliveryOperationalRoles,
  isValidDeliveryReportingEdge,
  type EmployeeDirectoryItem,
  type EmployeeLifecycleFilter
} from "@/lib/employees/domain";
import {
  applyEmployeeLifecycleMutation,
  attemptEmployeeAcademySync,
  createEmployee,
  getEmployee,
  listEmployees,
  listEmployeeTeams,
  updateEmployee,
  type EmployeeMutationInput
} from "@/lib/employees/repository";
import { resetAcademyEmployeePassword } from "@/lib/employees/academy-client";
import { employeeMutationSchema } from "@/lib/employees/validation";
import type { AxoRequestActor } from "@/lib/axo/control-auth";
import { createAxoWebhook, deleteAxoWebhook, listAxoWebhooks } from "@/lib/axo/control-store";

export type AxoCommand = { data?: Record<string, unknown>; expectedVersion?: number };

export type AdminAxoOperation = {
  operationId: string;
  scope: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  delegated: boolean;
  write: boolean;
  versionProtected?: boolean;
  params: Record<string, string>;
};

type RouteDefinition = Omit<AdminAxoOperation, "params"> & { method: string; pattern: RegExp; keys?: string[] };

const routes: RouteDefinition[] = [
  { method: "GET", pattern: /^\/health$/, operationId: "adminHealth", scope: "system.read", risk: "LOW", delegated: false, write: false },
  { method: "GET", pattern: /^\/version$/, operationId: "adminVersion", scope: "system.read", risk: "LOW", delegated: false, write: false },
  { method: "GET", pattern: /^\/employees$/, operationId: "listEmployees", scope: "admin.employee.read", risk: "LOW", delegated: false, write: false },
  { method: "POST", pattern: /^\/employees$/, operationId: "createEmployee", scope: "admin.employee.write", risk: "HIGH", delegated: true, write: true },
  { method: "GET", pattern: /^\/employees\/([^/]+)$/, keys: ["employeeId"], operationId: "getEmployee", scope: "admin.employee.read", risk: "LOW", delegated: false, write: false },
  { method: "PATCH", pattern: /^\/employees\/([^/]+)$/, keys: ["employeeId"], operationId: "updateEmployee", scope: "admin.employee.write", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "POST", pattern: /^\/employees\/([^/]+)\/deactivate$/, keys: ["employeeId"], operationId: "deactivateEmployee", scope: "admin.employee.lifecycle", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "POST", pattern: /^\/employees\/([^/]+)\/reactivate$/, keys: ["employeeId"], operationId: "reactivateEmployee", scope: "admin.employee.lifecycle", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "POST", pattern: /^\/employees\/([^/]+)\/archive$/, keys: ["employeeId"], operationId: "archiveEmployee", scope: "admin.employee.lifecycle", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "POST", pattern: /^\/employees\/([^/]+)\/password-reset$/, keys: ["employeeId"], operationId: "requestPasswordReset", scope: "admin.credential.reset", risk: "HIGH", delegated: true, write: true },
  { method: "GET", pattern: /^\/employees\/([^/]+)\/academy-profile$/, keys: ["employeeId"], operationId: "getEmployeeAcademyProfile", scope: "admin.employee.read", risk: "LOW", delegated: false, write: false },
  { method: "GET", pattern: /^\/employees\/([^/]+)\/sessions$/, keys: ["employeeId"], operationId: "getEmployeeSessions", scope: "admin.session.read", risk: "MEDIUM", delegated: true, write: false },
  { method: "POST", pattern: /^\/employees\/([^/]+)\/sessions\/revoke$/, keys: ["employeeId"], operationId: "revokeEmployeeSessions", scope: "admin.session.write", risk: "HIGH", delegated: true, write: true },
  { method: "GET", pattern: /^\/departments$/, operationId: "listDepartments", scope: "admin.reference.read", risk: "LOW", delegated: false, write: false },
  { method: "GET", pattern: /^\/roles$/, operationId: "listRoles", scope: "admin.reference.read", risk: "LOW", delegated: false, write: false },
  { method: "GET", pattern: /^\/hierarchy$/, operationId: "getHierarchy", scope: "admin.hierarchy.read", risk: "LOW", delegated: false, write: false },
  { method: "POST", pattern: /^\/hierarchy\/validate$/, operationId: "validateHierarchy", scope: "admin.hierarchy.write", risk: "MEDIUM", delegated: true, write: true },
  { method: "PUT", pattern: /^\/employees\/([^/]+)\/reporting-parent$/, keys: ["employeeId"], operationId: "setReportingParent", scope: "admin.hierarchy.write", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "PUT", pattern: /^\/employees\/([^/]+)\/trainer$/, keys: ["employeeId"], operationId: "setTrainer", scope: "admin.trainer.write", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "DELETE", pattern: /^\/employees\/([^/]+)\/trainer$/, keys: ["employeeId"], operationId: "removeTrainer", scope: "admin.trainer.write", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "GET", pattern: /^\/employees\/([^/]+)\/academy-entitlements$/, keys: ["employeeId"], operationId: "getAcademyEntitlements", scope: "admin.entitlement.read", risk: "LOW", delegated: false, write: false },
  { method: "PUT", pattern: /^\/employees\/([^/]+)\/academy-entitlements$/, keys: ["employeeId"], operationId: "setAcademyEntitlements", scope: "admin.entitlement.write", risk: "HIGH", delegated: true, write: true, versionProtected: true },
  { method: "GET", pattern: /^\/sync\/status$/, operationId: "getSyncStatus", scope: "admin.sync.read", risk: "LOW", delegated: false, write: false },
  { method: "POST", pattern: /^\/sync\/run$/, operationId: "runSync", scope: "admin.sync.execute", risk: "MEDIUM", delegated: true, write: true },
  { method: "GET", pattern: /^\/sync\/issues$/, operationId: "listSyncIssues", scope: "admin.sync.read", risk: "LOW", delegated: false, write: false },
  { method: "GET", pattern: /^\/superadmins$/, operationId: "listSuperAdmins", scope: "admin.superadmin.read", risk: "MEDIUM", delegated: true, write: false },
  { method: "GET", pattern: /^\/audit$/, operationId: "listAdminAudit", scope: "admin.audit.read", risk: "MEDIUM", delegated: true, write: false },
  { method: "GET", pattern: /^\/audit\/([^/]+)$/, keys: ["auditId"], operationId: "getAdminAuditEvent", scope: "admin.audit.read", risk: "MEDIUM", delegated: true, write: false },
  { method: "GET", pattern: /^\/webhooks$/, operationId: "listAdminWebhooks", scope: "admin.webhook.read", risk: "MEDIUM", delegated: true, write: false },
  { method: "POST", pattern: /^\/webhooks$/, operationId: "createAdminWebhook", scope: "admin.webhook.write", risk: "HIGH", delegated: true, write: true },
  { method: "DELETE", pattern: /^\/webhooks\/([^/]+)$/, keys: ["webhookId"], operationId: "deleteAdminWebhook", scope: "admin.webhook.write", risk: "HIGH", delegated: true, write: true }
];

export function resolveAdminAxoOperation(method: string, path: string): AdminAxoOperation {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = path.match(route.pattern);
    if (!match) continue;
    const params = Object.fromEntries((route.keys || []).map((key, index) => [key, decodeURIComponent(match[index + 1])]));
    return { ...route, params };
  }
  throw new ApiError(404, "NOT_FOUND", "The AXO Website Admin operation was not found.");
}

function requireEmployee(employee: EmployeeDirectoryItem | null): asserts employee is EmployeeDirectoryItem {
  if (!employee) throw new ApiError(404, "EMPLOYEE_NOT_FOUND", "Employee was not found.");
}

function employeeInput(employee: EmployeeDirectoryItem, patch: Record<string, unknown> = {}): EmployeeMutationInput {
  return employeeMutationSchema.parse({
    employeeCode: employee.employeeCode,
    displayName: employee.displayName,
    officialEmail: employee.officialEmail,
    department: employee.department,
    designation: employee.designation,
    employmentStatus: employee.employmentStatus,
    primaryTeamId: employee.primaryTeamId,
    managerEmployeeId: employee.managerEmployeeId,
    academyEnabled: employee.academyEnabled,
    academyRole: employee.academyRole,
    employeeSegment: employee.employeeSegment,
    academyArea: employee.academyArea,
    deliveryOperationalRole: employee.deliveryOperationalRole,
    deliveryReportingParentEmployeeId: employee.deliveryReportingParentEmployeeId,
    deliveryTrainerEmployeeId: employee.deliveryTrainerEmployeeId,
    ...patch
  });
}

function assertVersion(employee: EmployeeDirectoryItem, expectedVersion: number | undefined) {
  if (!Number.isInteger(expectedVersion) || expectedVersion !== employee.lifecycleVersion) {
    throw new ApiError(412, "VERSION_CONFLICT", `The employee changed in another session. Reload version ${employee.lifecycleVersion}.`);
  }
}

async function updateAndSync(employeeId: string, patch: Record<string, unknown>, admin: AdminSession) {
  const before = await getEmployee(employeeId);
  requireEmployee(before);
  await updateEmployee(employeeId, employeeInput(before, patch), admin);
  const sync = await attemptEmployeeAcademySync(employeeId, admin);
  return { employee: await getEmployee(employeeId), sync };
}

function pagination(request: NextRequest) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 100), 1), 250);
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || 0), 0);
  return { limit, offset };
}

export async function executeAdminAxoOperation(input: {
  operation: AdminAxoOperation;
  command: AxoCommand;
  actor: AxoRequestActor;
  request: NextRequest;
}) {
  const { operation, command, actor, request } = input;
  const data = command.data || {};
  const admin = actor.admin;
  switch (operation.operationId) {
    case "adminHealth": {
      const result = await dbQuery<{ now: Date }>("select now() as now");
      return { service: "writex-website-admin", status: "healthy", database: "healthy", checkedAt: result.rows[0].now.toISOString() };
    }
    case "adminVersion":
      return { service: "writex-website-admin", release: process.env.WRITEX_RELEASE || process.env.NEXT_PUBLIC_RELEASE || "unknown", apiVersion: "v1" };
    case "listEmployees": {
      const lifecycle = (request.nextUrl.searchParams.get("lifecycle") || "active") as EmployeeLifecycleFilter;
      return { employees: await listEmployees({
        search: request.nextUrl.searchParams.get("search") || "",
        sync: request.nextUrl.searchParams.get("sync") || "",
        lifecycle: ["active", "inactive", "archived", "all"].includes(lifecycle) ? lifecycle : "active",
        academyArea: academyAreas.includes(request.nextUrl.searchParams.get("academyArea") as never)
          ? request.nextUrl.searchParams.get("academyArea") as never
          : ""
      }) };
    }
    case "createEmployee": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const employeeId = await createEmployee(employeeMutationSchema.parse(data), admin);
      const sync = await attemptEmployeeAcademySync(employeeId, admin);
      return { employee: await getEmployee(employeeId), sync };
    }
    case "getEmployee": {
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      return { employee, etag: `\"${employee.lifecycleVersion}\"` };
    }
    case "updateEmployee": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      assertVersion(employee, command.expectedVersion);
      return updateAndSync(employee.id, data, admin);
    }
    case "deactivateEmployee":
    case "archiveEmployee": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      assertVersion(employee, command.expectedVersion);
      await applyEmployeeLifecycleMutation(employee.id, {
        action: operation.operationId === "deactivateEmployee" ? "DEACTIVATE" : "ARCHIVE",
        reason: String(data.reason || request.headers.get("x-writex-change-reason") || "AXO lifecycle action")
      }, admin);
      const sync = await attemptEmployeeAcademySync(employee.id, admin);
      return { employee: await getEmployee(employee.id), sync };
    }
    case "reactivateEmployee": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      assertVersion(employee, command.expectedVersion);
      if (employee.archivedAt) {
        await applyEmployeeLifecycleMutation(employee.id, { action: "RESTORE", reason: String(data.reason || "AXO reactivation") }, admin);
      } else {
        await updateEmployee(employee.id, employeeInput(employee, { employmentStatus: "ACTIVE" }), admin);
      }
      const sync = await attemptEmployeeAcademySync(employee.id, admin);
      return { employee: await getEmployee(employee.id), sync };
    }
    case "requestPasswordReset": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      const credential = await resetAcademyEmployeePassword(employee.id, { adminId: admin.adminUserId, email: admin.email });
      return {
        employeeId: employee.id,
        loginEmail: credential.loginEmail,
        password: credential.initialPassword,
        academyUrl: process.env.SALES_ACADEMY_APP_URL || "https://academy.writex.co.in",
        sessionsRevoked: credential.sessionsRevoked,
        shownOnce: true
      };
    }
    case "getEmployeeAcademyProfile":
    case "getAcademyEntitlements": {
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      const isDeliveryTrainer = employee.academyArea === "DEVELOPMENT_OPERATIONS" && employee.academyRole === "TRAINER";
      return {
        employeeId: employee.id,
        academyUserId: employee.academyUserId,
        enabled: employee.academyEnabled,
        role: employee.academyRole,
        area: employee.academyArea,
        employeeSegment: employee.employeeSegment,
        deliveryOperationalRole: employee.deliveryOperationalRole,
        reportingParentEmployeeId: employee.deliveryReportingParentEmployeeId,
        trainerEmployeeId: employee.deliveryTrainerEmployeeId,
        syncStatus: employee.syncStatus,
        learningAssignment: isDeliveryTrainer ? null : {
          id: employee.learningAssignmentId,
          pathKey: employee.learningPathKey,
          status: employee.learningAssignmentStatus,
          firstLessonRoute: employee.learningFirstLessonRoute
        },
        trainerRoleModel: isDeliveryTrainer ? {
          academyRole: "TRAINER_EVALUATOR",
          learningRole: "NONE",
          lessonAccess: "ALL_26_DEVELOPMENT_LESSONS_READ_ONLY",
          assessmentReviewScope: "ALL_DEVELOPMENT_OPERATIONS_LEARNER_ASSESSMENTS",
          reportingRelationship: employee.deliveryReportingParentEmployeeId || null,
          trainerAssignment: null,
          allowedWrites: ["CLAIM_REVIEW", "SAVE_REVIEW_DRAFT", "COMPLETE_ASSESSMENT_REVIEW", "ESCALATE_ASSESSMENT_REVIEW"]
        } : null
      };
    }
    case "getEmployeeSessions": {
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      const sessions = await dbQuery<{ id: string; created_at: Date; expires_at: Date; revoked_at: Date | null; ip_address: string | null; user_agent: string | null }>(
        `select id, created_at, expires_at, revoked_at, ip_address, user_agent
         from employee_sessions where employee_id=$1::text order by created_at desc limit 100`,
        [employee.id]
      );
      return { employeeId: employee.id, sessions: sessions.rows.map((row) => ({ ...row, created_at: row.created_at.toISOString(), expires_at: row.expires_at.toISOString(), revoked_at: row.revoked_at?.toISOString() || null })) };
    }
    case "revokeEmployeeSessions": {
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      const result = await dbQuery(
        "update employee_sessions set revoked_at=now() where employee_id=$1::text and revoked_at is null",
        [employee.id]
      );
      return { employeeId: employee.id, sessionsRevoked: result.rowCount || 0, scope: "WEBSITE_EMPLOYEE_SESSIONS" };
    }
    case "listDepartments": {
      const teams = await listEmployeeTeams();
      const employees = await listEmployees({ lifecycle: "all" });
      const departments = [...new Set([...teams.map((team) => team.department), ...employees.map((employee) => employee.department)])].filter(Boolean).sort();
      return { departments: departments.map((name) => ({ key: name.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), name })) };
    }
    case "listRoles":
      return { academyRoles, academyAreas, deliveryOperationalRoles, reportingRules: { TEAM_MANAGER: "MANAGER", TEAM_LEADER: "TEAM_MANAGER", SENIOR_SME: "TEAM_LEADER", JUNIOR_SME: "TEAM_LEADER", trainerRelationship: "SEPARATE" } };
    case "getHierarchy": {
      const employees = await listEmployees({ lifecycle: "all" });
      return { nodes: employees.map((employee) => ({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.displayName,
        area: employee.academyArea,
        role: employee.deliveryOperationalRole || employee.academyRole,
        reportingParentEmployeeId: employee.deliveryReportingParentEmployeeId || employee.managerEmployeeId,
        trainerEmployeeId: employee.deliveryTrainerEmployeeId
      })), rules: { hierarchy: "Delivery Manager -> Team Manager -> Team Leader -> Senior SME / Junior SME", trainer: "Separate assignment relationship" } };
    }
    case "validateHierarchy": {
      const subjectId = typeof data.employeeId === "string" ? data.employeeId : null;
      const parentId = typeof data.reportingParentEmployeeId === "string" ? data.reportingParentEmployeeId : null;
      if (!subjectId || !parentId) throw new ApiError(400, "BAD_REQUEST", "employeeId and reportingParentEmployeeId are required.");
      const [subject, parent] = await Promise.all([getEmployee(subjectId), getEmployee(parentId)]);
      requireEmployee(subject);
      requireEmployee(parent);
      const valid = Boolean(subject.deliveryOperationalRole && parent.deliveryOperationalRole
        && isValidDeliveryReportingEdge(subject.deliveryOperationalRole, parent.deliveryOperationalRole));
      return { valid, subjectRole: subject.deliveryOperationalRole, parentRole: parent.deliveryOperationalRole, code: valid ? "VALID" : "INVALID_DELIVERY_REPORTING_RELATIONSHIP" };
    }
    case "setReportingParent":
    case "setTrainer":
    case "removeTrainer": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      assertVersion(employee, command.expectedVersion);
      const patch = operation.operationId === "setReportingParent"
        ? { deliveryReportingParentEmployeeId: data.reportingParentEmployeeId }
        : { deliveryTrainerEmployeeId: operation.operationId === "removeTrainer" ? null : data.trainerEmployeeId };
      return updateAndSync(employee.id, patch, admin);
    }
    case "setAcademyEntitlements": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const employee = await getEmployee(operation.params.employeeId);
      requireEmployee(employee);
      assertVersion(employee, command.expectedVersion);
      return updateAndSync(employee.id, {
        academyEnabled: data.enabled ?? employee.academyEnabled,
        academyRole: data.role ?? employee.academyRole,
        academyArea: data.area ?? employee.academyArea,
        employeeSegment: data.employeeSegment ?? employee.employeeSegment,
        deliveryOperationalRole: data.deliveryOperationalRole ?? employee.deliveryOperationalRole,
        academyRoleChangeReason: data.role !== undefined && data.role !== employee.academyRole
          ? String(data.reason || request.headers.get("x-writex-change-reason") || "AXO entitlement change")
          : undefined
      }, admin);
    }
    case "getSyncStatus": {
      const employees = await listEmployees({ lifecycle: "all" });
      const counts = { SYNCED: 0, PENDING: 0, FAILED: 0 };
      for (const employee of employees) counts[employee.syncStatus] += 1;
      return { counts, total: employees.length, checkedAt: new Date().toISOString() };
    }
    case "listSyncIssues": {
      const employees = await listEmployees({ lifecycle: "all", sync: "attention" });
      return { issues: employees.map((employee) => ({ employeeId: employee.id, employeeCode: employee.employeeCode, syncStatus: employee.syncStatus, error: employee.lastSyncError, updatedAt: employee.updatedAt })) };
    }
    case "runSync": {
      if (!admin) throw new ApiError(403, "DELEGATED_USER_REQUIRED", "A delegated Website Admin is required.");
      const requested = Array.isArray(data.employeeIds) ? data.employeeIds.filter((id): id is string => typeof id === "string") : [];
      const candidates = requested.length
        ? (await Promise.all(requested.map((id) => getEmployee(id)))).filter((employee): employee is EmployeeDirectoryItem => Boolean(employee))
        : await listEmployees({ lifecycle: "all", sync: "attention" });
      const results = [];
      for (const employee of candidates.slice(0, 100)) {
        try {
          results.push({ employeeId: employee.id, ...(await attemptEmployeeAcademySync(employee.id, admin)) });
        } catch (error) {
          results.push({ employeeId: employee.id, synced: false, error: error instanceof Error ? error.message : "Sync failed." });
        }
      }
      return { requested: candidates.length, results };
    }
    case "listSuperAdmins": {
      const employees = await listEmployees({ lifecycle: "all", responsibility: "SUPER_ADMIN" });
      return { superadmins: employees.map((employee) => ({ employeeId: employee.id, employeeCode: employee.employeeCode, name: employee.displayName, active: employee.employmentStatus === "ACTIVE" && employee.academyEnabled, primary: employee.primarySuperAdmin })) };
    }
    case "listAdminAudit": {
      const { limit, offset } = pagination(request);
      const result = await dbQuery<{ id: string; actor_type: string; actor_id: string | null; actor_email: string | null; entity_type: string; entity_id: string | null; action: string; metadata: unknown; created_at: Date }>(
        `select id, actor_type, actor_id, actor_email, entity_type, entity_id, action, metadata, created_at
         from audit_logs order by created_at desc limit $1 offset $2`,
        [limit, offset]
      );
      return { audit: result.rows.map((row) => ({ ...row, created_at: row.created_at.toISOString() })), limit, offset };
    }
    case "getAdminAuditEvent": {
      const result = await dbQuery<{ id: string; actor_type: string; actor_id: string | null; actor_email: string | null; entity_type: string; entity_id: string | null; action: string; metadata: unknown; created_at: Date }>(
        `select id, actor_type, actor_id, actor_email, entity_type, entity_id, action, metadata, created_at from audit_logs where id=$1 limit 1`,
        [operation.params.auditId]
      );
      if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Audit event was not found.");
      return { audit: { ...result.rows[0], created_at: result.rows[0].created_at.toISOString() } };
    }
    case "listAdminWebhooks":
      return { webhooks: await listAxoWebhooks() };
    case "createAdminWebhook":
      return createAxoWebhook(command, actor);
    case "deleteAdminWebhook":
      return deleteAxoWebhook(operation.params.webhookId);
    default:
      throw new ApiError(501, "NOT_IMPLEMENTED", "The AXO Website Admin operation is not implemented.");
  }
}
