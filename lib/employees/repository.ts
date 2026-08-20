import "server-only";

import { randomUUID } from "node:crypto";
import type { AdminSession } from "@/lib/auth";
import { ApiError } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { AcademySyncError, syncEmployeeToAcademy } from "@/lib/employees/academy-client";
import {
  academyApplicationKey,
  type AcademyRole,
  type EmployeeDeletionAssessment,
  type EmployeeDirectoryItem,
  type EmployeeLifecycleFilter,
  type EmployeeStatus,
  type EmployeeTeam,
  isClearlyTemporaryEmployee
} from "@/lib/employees/domain";

type EmployeeRow = {
  id: string;
  employee_code: string;
  display_name: string;
  official_email: string;
  department: string;
  designation: string;
  employment_status: EmployeeStatus;
  primary_team_id: string | null;
  team_name: string | null;
  manager_employee_id: string | null;
  manager_name: string | null;
  academy_enabled: boolean;
  academy_role: AcademyRole;
  sync_status: "PENDING" | "SYNCED" | "FAILED";
  last_synced_at: Date | null;
  last_sync_error: string | null;
  external_application_user_id: string | null;
  archived_at: Date | null;
  archive_previous_employment_status: EmployeeStatus | null;
  archive_previous_academy_enabled: boolean | null;
  lifecycle_version: number;
  updated_at: Date;
};

const employeeSelect = `
  e.id, e.employee_code, e.display_name, e.official_email, e.department,
  e.designation, e.employment_status, e.primary_team_id, t.name as team_name,
  e.manager_employee_id, manager.display_name as manager_name,
  coalesce(a.enabled, false) as academy_enabled,
  coalesce(a.application_role, 'EMPLOYEE') as academy_role,
  coalesce(a.sync_status, 'SYNCED') as sync_status,
  a.last_synced_at, a.last_sync_error, a.external_application_user_id,
  e.archived_at, e.archive_previous_employment_status,
  e.archive_previous_academy_enabled, e.lifecycle_version,
  e.updated_at
`;

function mapEmployee(row: EmployeeRow): EmployeeDirectoryItem {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    displayName: row.display_name,
    officialEmail: row.official_email,
    department: row.department,
    designation: row.designation,
    employmentStatus: row.employment_status,
    primaryTeamId: row.primary_team_id,
    teamName: row.team_name,
    managerEmployeeId: row.manager_employee_id,
    managerName: row.manager_name,
    academyEnabled: row.academy_enabled,
    academyRole: row.academy_role,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    lastSyncError: row.last_sync_error,
    academyUserId: row.external_application_user_id,
    archivedAt: row.archived_at?.toISOString() ?? null,
    archivePreviousEmploymentStatus: row.archive_previous_employment_status,
    archivePreviousAcademyEnabled: row.archive_previous_academy_enabled,
    lifecycleVersion: row.lifecycle_version,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listEmployeeTeams() {
  const result = await dbQuery<{
    id: string;
    team_code: string;
    name: string;
    department: string;
    status: EmployeeStatus;
  }>(
    `select id, team_code, name, department, status
     from employee_teams order by department, name`
  );
  return result.rows.map((row) => ({
    id: row.id,
    teamCode: row.team_code,
    name: row.name,
    department: row.department,
    status: row.status
  } satisfies EmployeeTeam));
}

export async function listEmployees({
  search = "",
  sync = "",
  lifecycle = "active"
}: {
  search?: string;
  sync?: string;
  lifecycle?: EmployeeLifecycleFilter;
} = {}) {
  const normalized = search.trim();
  const result = await dbQuery<EmployeeRow>(
    `select ${employeeSelect}
     from employees e
     left join employee_teams t on t.id = e.primary_team_id
     left join employees manager on manager.id = e.manager_employee_id
     left join employee_application_access a
       on a.employee_id = e.id and a.application_key = $1
     where ($2 = '' or concat_ws(' ', e.employee_code, e.display_name, e.official_email, e.department, e.designation, t.name) ilike '%' || $2 || '%')
       and ($3 <> 'attention' or a.sync_status in ('PENDING', 'FAILED'))
       and (
         $4 = 'all'
         or ($4 = 'active' and e.archived_at is null and e.employment_status = 'ACTIVE')
         or ($4 = 'inactive' and e.archived_at is null and e.employment_status = 'INACTIVE')
         or ($4 = 'archived' and e.archived_at is not null)
       )
     order by e.display_name, e.employee_code`,
    [academyApplicationKey, normalized, sync, lifecycle]
  );
  return result.rows.map(mapEmployee);
}

export async function getEmployee(employeeId: string) {
  const result = await dbQuery<EmployeeRow>(
    `select ${employeeSelect}
     from employees e
     left join employee_teams t on t.id = e.primary_team_id
     left join employees manager on manager.id = e.manager_employee_id
     left join employee_application_access a
       on a.employee_id = e.id and a.application_key = $1
     where e.id = $2 limit 1`,
    [academyApplicationKey, employeeId]
  );
  return result.rows[0] ? mapEmployee(result.rows[0]) : null;
}

export type EmployeeMutationInput = {
  employeeCode: string;
  displayName: string;
  officialEmail: string;
  department: string;
  designation: string;
  employmentStatus: EmployeeStatus;
  primaryTeamId: string | null;
  managerEmployeeId: string | null;
  academyEnabled: boolean;
  academyRole: AcademyRole;
};

async function validateRelationships(
  query: <R extends Record<string, unknown>>(text: string, values?: unknown[]) => Promise<R[]>,
  input: EmployeeMutationInput,
  employeeId?: string
) {
  if (input.primaryTeamId) {
    const team = await query<{ department: string; status: EmployeeStatus }>(
      "select department, status from employee_teams where id = $1",
      [input.primaryTeamId]
    );
    if (!team[0] || team[0].status !== "ACTIVE") {
      throw new ApiError(400, "BAD_REQUEST", "Select an active team.");
    }
    if (team[0].department.toLowerCase() !== input.department.toLowerCase()) {
      throw new ApiError(400, "BAD_REQUEST", "The selected team must belong to the employee department.");
    }
  }
  if (input.managerEmployeeId) {
    if (input.managerEmployeeId === employeeId) {
      throw new ApiError(400, "BAD_REQUEST", "An employee cannot be their own manager.");
    }
    const manager = await query<{ employment_status: EmployeeStatus; enabled: boolean; application_role: AcademyRole }>(
      `select e.employment_status,coalesce(a.enabled,false) enabled,
         coalesce(a.application_role,'EMPLOYEE') application_role
       from employees e left join employee_application_access a
         on a.employee_id=e.id and a.application_key=$2
       where e.id=$1`,
      [input.managerEmployeeId, academyApplicationKey]
    );
    if (!manager[0] || manager[0].employment_status !== "ACTIVE") {
      throw new ApiError(400, "BAD_REQUEST", "Select an active Academy supervisor.");
    }
    const expectedRole = input.academyRole === "EMPLOYEE" ? "TRAINER" : "MANAGER_TL";
    if (input.academyRole === "MANAGER_TL" || !manager[0].enabled || manager[0].application_role !== expectedRole) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        input.academyRole === "EMPLOYEE"
          ? "Assigned Trainer must be an active employee with Academy Trainer access."
          : input.academyRole === "TRAINER"
            ? "Reports To must be an active employee with Academy Manager / TL access."
            : "Manager / TL records do not use an Employee or Trainer as their Academy supervisor."
      );
    }
    if (employeeId) {
      const circular = await query<{ id: string }>(
        `with recursive chain as (
           select id,manager_employee_id from employees where id=$1
           union all
           select e.id,e.manager_employee_id from employees e join chain c on e.id=c.manager_employee_id
         ) select id from chain where id=$2 limit 1`,
        [input.managerEmployeeId, employeeId]
      );
      if (circular[0]) throw new ApiError(409, "BAD_REQUEST", "This change would create a circular reporting relationship.");
    }
  }
  if (input.academyEnabled && input.employmentStatus === "ACTIVE") {
    if (input.academyRole === "EMPLOYEE" && !input.managerEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", "Assign an active Trainer before enabling Academy access for this employee.");
    }
    if (input.academyRole === "TRAINER" && !input.managerEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", "Assign an active Manager / TL before enabling Academy access for this Trainer.");
    }
  }
  if (input.academyRole === "MANAGER_TL" && input.managerEmployeeId) {
    throw new ApiError(400, "BAD_REQUEST", "Manager / TL records cannot report to an Employee or Trainer in the Academy hierarchy.");
  }
}

export async function createEmployee(input: EmployeeMutationInput, actor: AdminSession) {
  return withDbTransaction(async (query) => {
    await validateRelationships(query, input);
    let employeeId: string;
    try {
      const rows = await query<{ id: string }>(
        `insert into employees
          (employee_code, display_name, official_email, department, designation,
           employment_status, primary_team_id, manager_employee_id, created_by_admin_id)
         values ($1, $2, lower($3), $4, $5, $6, $7, $8, $9) returning id`,
        [input.employeeCode, input.displayName, input.officialEmail, input.department,
          input.designation, input.employmentStatus, input.primaryTeamId,
          input.managerEmployeeId, actor.adminUserId]
      );
      employeeId = rows[0].id;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new ApiError(409, "BAD_REQUEST", "An employee already uses this employee code or official email.");
      }
      throw error;
    }
    await query(
      `insert into employee_application_access
        (employee_id, application_key, enabled, application_role, granted_by_admin_id,
         granted_at, sync_status, sync_version)
       values ($1, $2, $3, $4, $5, case when $3 then now() else null end,
         case when $3 then 'PENDING' else 'SYNCED' end, case when $3 then 1 else 0 end)`,
      [employeeId, academyApplicationKey, input.academyEnabled, input.academyRole, actor.adminUserId]
    );
    return employeeId;
  });
}

export async function updateEmployee(employeeId: string, input: EmployeeMutationInput, actor: AdminSession) {
  await withDbTransaction(async (query) => {
    await validateRelationships(query, input, employeeId);
    const current = await query<{
      employment_status: EmployeeStatus;
      primary_team_id: string | null;
      manager_employee_id: string | null;
      enabled: boolean;
      application_role: AcademyRole;
      external_application_user_id: string | null;
      archived_at: Date | null;
    }>(
      `select e.employment_status, e.primary_team_id, e.manager_employee_id,
          e.archived_at, a.enabled, a.application_role, a.external_application_user_id
       from employees e join employee_application_access a on a.employee_id = e.id
       where e.id = $1 and a.application_key = $2 for update`,
      [employeeId, academyApplicationKey]
    );
    if (!current[0]) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
    if (current[0].archived_at) {
      throw new ApiError(409, "BAD_REQUEST", "Restore the archived employee before editing their record.");
    }
    try {
      await query(
        `update employees set employee_code = $2, display_name = $3, official_email = lower($4),
          department = $5, designation = $6, employment_status = $7,
          primary_team_id = $8, manager_employee_id = $9 where id = $1`,
        [employeeId, input.employeeCode, input.displayName, input.officialEmail,
          input.department, input.designation, input.employmentStatus,
          input.primaryTeamId, input.managerEmployeeId]
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new ApiError(409, "BAD_REQUEST", "An employee already uses this employee code or official email.");
      }
      throw error;
    }
    const effectiveAcademyEnabled = input.employmentStatus === "ACTIVE" && input.academyEnabled;
    const shouldSync = effectiveAcademyEnabled || Boolean(current[0].external_application_user_id);
    const academyRole = current[0].application_role === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : input.academyRole;
    if (current[0].application_role !== academyRole && ["TRAINER", "MANAGER_TL"].includes(current[0].application_role)) {
      const reports = await query<{ count: string }>(
        `select count(*)::text count from employees e
         join employee_application_access a on a.employee_id=e.id and a.application_key=$2
         where e.manager_employee_id=$1 and e.employment_status='ACTIVE' and a.enabled`,
        [employeeId, academyApplicationKey]
      );
      if (Number(reports[0]?.count || 0) > 0) {
        throw new ApiError(409, "BAD_REQUEST", "Reassign active Academy reports before changing this employee's role.");
      }
    }
    await query(
      `update employee_application_access
       set enabled = $3, application_role = $4, granted_by_admin_id = $5,
           granted_at = case when $3 and not enabled then now() else granted_at end,
           revoked_at = case when not $3 and enabled then now() when $3 then null else revoked_at end,
           sync_status = case when $6 then 'PENDING' else 'SYNCED' end,
           last_sync_error = null,
           sync_version = sync_version + case when $6 then 1 else 0 end
       where employee_id = $1 and application_key = $2`,
      [employeeId, academyApplicationKey, effectiveAcademyEnabled, academyRole,
        actor.adminUserId, shouldSync]
    );
  });
}

export type EmployeeLifecycleMutation =
  | { action: "DEACTIVATE"; reason: string }
  | { action: "ARCHIVE"; reason: string }
  | { action: "RESTORE"; reason: string }
  | { action: "SET_ACADEMY_ACCESS"; enabled: boolean }
  | { action: "SET_ACADEMY_ROLE"; role: Exclude<AcademyRole, "SUPER_ADMIN"> };

export async function applyEmployeeLifecycleMutation(
  employeeId: string,
  input: EmployeeLifecycleMutation,
  actor: AdminSession
) {
  return withDbTransaction(async (query) => {
    const rows = await query<{
      employment_status: EmployeeStatus;
      archived_at: Date | null;
      archive_previous_employment_status: EmployeeStatus | null;
      archive_previous_academy_enabled: boolean | null;
      enabled: boolean;
      application_role: AcademyRole;
      external_application_user_id: string | null;
      lifecycle_version: number;
    }>(
      `select e.employment_status, e.archived_at, e.archive_previous_employment_status,
          e.archive_previous_academy_enabled, e.lifecycle_version,
          a.enabled, a.application_role, a.external_application_user_id
       from employees e
       join employee_application_access a on a.employee_id = e.id and a.application_key = $2
       where e.id = $1 for update`,
      [employeeId, academyApplicationKey]
    );
    const current = rows[0];
    if (!current) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");

    const protectsPrimarySuperAdmin = current.application_role === "SUPER_ADMIN";
    if (protectsPrimarySuperAdmin && (
      input.action === "DEACTIVATE"
      || input.action === "ARCHIVE"
      || (input.action === "SET_ACADEMY_ACCESS" && !input.enabled)
      || input.action === "SET_ACADEMY_ROLE"
    )) {
      throw new ApiError(
        409,
        "BAD_REQUEST",
        "Assign another Primary Academy Super Admin before changing this employee's access."
      );
    }

    if ((input.action === "DEACTIVATE" || input.action === "ARCHIVE") && ["TRAINER", "MANAGER_TL"].includes(current.application_role)) {
      const reports = await query<{ count: string }>(
        `select count(*)::text count from employees e
         join employee_application_access a on a.employee_id=e.id and a.application_key=$2
         where e.manager_employee_id=$1 and e.employment_status='ACTIVE' and a.enabled`,
        [employeeId, academyApplicationKey]
      );
      if (Number(reports[0]?.count || 0) > 0) {
        throw new ApiError(409, "BAD_REQUEST", "Reassign active Academy reports before deactivating or archiving this employee.");
      }
    }

    if (input.action === "DEACTIVATE") {
      if (current.archived_at) {
        throw new ApiError(409, "BAD_REQUEST", "Restore the archived employee before changing employment status.");
      }
      await query(
        `update employees set employment_status = 'INACTIVE', lifecycle_version = lifecycle_version + 1
         where id = $1`,
        [employeeId]
      );
      await query(
        `update employee_application_access
         set enabled = false, revoked_at = case when enabled then now() else revoked_at end,
             sync_status = case when external_application_user_id is not null then 'PENDING' else 'SYNCED' end,
             last_sync_error = null,
             sync_version = sync_version + case when external_application_user_id is not null then 1 else 0 end
         where employee_id = $1 and application_key = $2`,
        [employeeId, academyApplicationKey]
      );
    } else if (input.action === "ARCHIVE") {
      if (!current.archived_at) {
        await query(
          `update employees
           set archived_at = now(), archived_by_admin_id = $2,
               archive_previous_employment_status = employment_status,
               archive_previous_academy_enabled = $3,
               employment_status = 'INACTIVE', lifecycle_version = lifecycle_version + 1
           where id = $1`,
          [employeeId, actor.adminUserId, current.enabled]
        );
        await query(
          `update employee_application_access
           set enabled = false, revoked_at = case when enabled then now() else revoked_at end,
               sync_status = case when external_application_user_id is not null then 'PENDING' else 'SYNCED' end,
               last_sync_error = null,
               sync_version = sync_version + case when external_application_user_id is not null then 1 else 0 end
           where employee_id = $1 and application_key = $2`,
          [employeeId, academyApplicationKey]
        );
      }
    } else if (input.action === "RESTORE") {
      if (!current.archived_at) {
        throw new ApiError(409, "BAD_REQUEST", "This employee is not archived.");
      }
      const restoredStatus = current.archive_previous_employment_status || "INACTIVE";
      const restoredAccess = restoredStatus === "ACTIVE" && Boolean(current.archive_previous_academy_enabled);
      await query(
        `update employees
         set archived_at = null, archived_by_admin_id = null,
             employment_status = $2, archive_previous_employment_status = null,
             archive_previous_academy_enabled = null, lifecycle_version = lifecycle_version + 1
         where id = $1`,
        [employeeId, restoredStatus]
      );
      const shouldSync = restoredAccess || Boolean(current.external_application_user_id);
      await query(
        `update employee_application_access
         set enabled = $3,
             granted_at = case when $3 then coalesce(granted_at, now()) else granted_at end,
             revoked_at = case when $3 then null else revoked_at end,
             sync_status = case when $4 then 'PENDING' else 'SYNCED' end,
             last_sync_error = null,
             sync_version = sync_version + case when $4 then 1 else 0 end
         where employee_id = $1 and application_key = $2`,
        [employeeId, academyApplicationKey, restoredAccess, shouldSync]
      );
    } else if (input.action === "SET_ACADEMY_ACCESS") {
      if (current.archived_at) {
        throw new ApiError(409, "BAD_REQUEST", "Restore the employee before changing Academy access.");
      }
      if (input.enabled && current.employment_status !== "ACTIVE") {
        throw new ApiError(409, "BAD_REQUEST", "Activate employment before enabling Academy access.");
      }
      const shouldSync = input.enabled || Boolean(current.external_application_user_id);
      await query(
        `update employee_application_access
         set enabled = $3, granted_by_admin_id = $4,
             granted_at = case when $3 and not enabled then now() else granted_at end,
             revoked_at = case when not $3 and enabled then now() when $3 then null else revoked_at end,
             sync_status = case when $5 then 'PENDING' else 'SYNCED' end,
             last_sync_error = null,
             sync_version = sync_version + case when $5 then 1 else 0 end
         where employee_id = $1 and application_key = $2`,
        [employeeId, academyApplicationKey, input.enabled, actor.adminUserId, shouldSync]
      );
    } else {
      if (current.archived_at) {
        throw new ApiError(409, "BAD_REQUEST", "Restore the employee before changing the Academy role.");
      }
      const shouldSync = current.enabled || Boolean(current.external_application_user_id);
      await query(
        `update employee_application_access
         set application_role = $3, granted_by_admin_id = $4,
             sync_status = case when $5 then 'PENDING' else 'SYNCED' end,
             last_sync_error = null,
             sync_version = sync_version + case when $5 then 1 else 0 end
         where employee_id = $1 and application_key = $2`,
        [employeeId, academyApplicationKey, input.role, actor.adminUserId, shouldSync]
      );
    }

    return {
      before: current,
      reason: "reason" in input ? input.reason : null
    };
  });
}

const baselineEmployeeAuditActions = [
  "employee_created",
  "academy_access_synced",
  "academy_access_sync_failed"
] as const;

export async function getEmployeeDeletionAssessment(employeeId: string): Promise<EmployeeDeletionAssessment> {
  const employee = await getEmployee(employeeId);
  if (!employee) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
  const result = await dbQuery<{
    subordinate_count: string;
    primary_superadmin_count: string;
    ai_usage_count: string;
    active_session_count: string;
    meaningful_audit_count: string;
  }>(
    `select
       (select count(*)::text from employees where manager_employee_id = $1) as subordinate_count,
       (select count(*)::text from ai_governance_products where primary_superadmin_employee_id = $1) as primary_superadmin_count,
       (select count(*)::text from ai_usage_ledger where employee_id = $1::text) as ai_usage_count,
       (select count(*)::text from employee_sessions where employee_id = $1::text and revoked_at is null) as active_session_count,
       (select count(*)::text from audit_logs
         where entity_type = 'employee' and entity_id = $1::text
           and action <> all($2::text[])) as meaningful_audit_count`,
    [employeeId, baselineEmployeeAuditActions]
  );
  const counts = result.rows[0];
  const blockers = [
    employee.academyUserId ? { code: "ACADEMY_HISTORY", label: "Academy identity or learning history", count: 1 } : null,
    Number(counts.subordinate_count) ? { code: "REPORTING_LINE", label: "Employee reporting relationships", count: Number(counts.subordinate_count) } : null,
    Number(counts.primary_superadmin_count) ? { code: "PRIMARY_SUPERADMIN", label: "Primary Academy Super Admin assignment", count: Number(counts.primary_superadmin_count) } : null,
    Number(counts.ai_usage_count) ? { code: "AI_USAGE", label: "Academy AI usage records", count: Number(counts.ai_usage_count) } : null,
    Number(counts.active_session_count) ? { code: "WEBSITE_SESSION", label: "Active employee sessions", count: Number(counts.active_session_count) } : null,
    Number(counts.meaningful_audit_count) ? { code: "AUDIT_HISTORY", label: "Meaningful employee lifecycle or role history", count: Number(counts.meaningful_audit_count) } : null
  ].filter((item): item is { code: string; label: string; count: number } => Boolean(item));
  const temporaryIdentity = isClearlyTemporaryEmployee(employee);
  if (!temporaryIdentity) {
    blockers.unshift({ code: "NOT_TEMPORARY", label: "Employee is not clearly marked as a test, UAT, demo, temporary or duplicate identity", count: 1 });
  }
  return { allowed: temporaryIdentity && blockers.length === 0, temporaryIdentity, blockers };
}

export async function permanentlyDeleteEmployee(
  employeeId: string,
  confirmation: string
) {
  const assessment = await getEmployeeDeletionAssessment(employeeId);
  if (!assessment.allowed) {
    throw new ApiError(409, "BAD_REQUEST", "Permanent deletion is blocked because this employee has protected history. Archive the employee instead.");
  }
  return withDbTransaction(async (query) => {
    const rows = await query<{
      employee_code: string;
      display_name: string;
      official_email: string;
      external_application_user_id: string | null;
    }>(
      `select e.employee_code, e.display_name, e.official_email, a.external_application_user_id
       from employees e
       join employee_application_access a on a.employee_id = e.id and a.application_key = $2
       where e.id = $1 for update`,
      [employeeId, academyApplicationKey]
    );
    const current = rows[0];
    if (!current) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
    const matches = [current.employee_code, current.display_name]
      .some((value) => value.toLowerCase() === confirmation.trim().toLowerCase());
    if (!matches) {
      throw new ApiError(400, "BAD_REQUEST", "Type the exact employee name or code to confirm permanent deletion.");
    }
    if (current.external_application_user_id) {
      throw new ApiError(409, "BAD_REQUEST", "This employee has Academy history and must be archived instead.");
    }
    await query(
      "delete from employee_application_access where employee_id = $1 and application_key = $2",
      [employeeId, academyApplicationKey]
    );
    await query("delete from employees where id = $1", [employeeId]);
    return current;
  });
}

export async function createEmployeeTeam(
  input: { teamCode: string; name: string; department: string },
  actor: AdminSession
) {
  try {
    const result = await dbQuery<{ id: string }>(
      `insert into employee_teams (team_code, name, department, created_by_admin_id)
       values ($1, $2, $3, $4) returning id`,
      [input.teamCode, input.name, input.department, actor.adminUserId]
    );
    return result.rows[0].id;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new ApiError(409, "BAD_REQUEST", "A team already uses this code or name in the department.");
    }
    throw error;
  }
}

async function academySyncPayload(employeeId: string, actor: AdminSession, requestId: string) {
  const result = await dbQuery<{
    id: string;
    employee_code: string;
    display_name: string;
    official_email: string;
    department: string;
    designation: string;
    employment_status: EmployeeStatus;
    manager_employee_id: string | null;
    enabled: boolean;
    application_role: AcademyRole;
    team_id: string | null;
    team_code: string | null;
    team_name: string | null;
    team_status: EmployeeStatus | null;
    team_manager_employee_id: string | null;
  }>(
    `select e.id, e.employee_code, e.display_name, e.official_email, e.department,
        e.designation, e.employment_status, e.manager_employee_id,
        a.enabled, a.application_role,
        t.id as team_id, t.team_code, t.name as team_name, t.status as team_status,
        case
          when a.application_role='MANAGER_TL' then e.id
          when a.application_role='TRAINER' then e.manager_employee_id
          when a.application_role='EMPLOYEE' then supervisor.manager_employee_id
          else null
        end as team_manager_employee_id
     from employees e
     join employee_application_access a on a.employee_id = e.id and a.application_key = $2
     left join employee_teams t on t.id = e.primary_team_id
     left join employees supervisor on supervisor.id=e.manager_employee_id
     where e.id = $1`,
    [employeeId, academyApplicationKey]
  );
  const row = result.rows[0];
  if (!row) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
  return {
    requestId,
    employee: {
      id: row.id,
      employeeCode: row.employee_code,
      displayName: row.display_name,
      officialEmail: row.official_email,
      department: row.department,
      designation: row.designation,
      employmentStatus: row.employment_status,
      managerEmployeeId: row.manager_employee_id
    },
    access: { enabled: row.enabled, role: row.application_role },
    team: row.team_id ? {
      id: row.team_id,
      code: row.team_code!,
      name: row.team_name!,
      status: row.team_status!,
      managerEmployeeId: row.team_manager_employee_id
    } : null,
    requestedBy: { adminId: actor.adminUserId, email: actor.email }
  };
}

export async function attemptEmployeeAcademySync(employeeId: string, actor: AdminSession) {
  const requestId = randomUUID();
  const current = await getEmployee(employeeId);
  if (!current) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
  if (!current.academyEnabled && !current.academyUserId) {
    await dbQuery(
      `update employee_application_access set sync_status = 'SYNCED', last_sync_error = null
       where employee_id = $1 and application_key = $2`,
      [employeeId, academyApplicationKey]
    );
    return { synced: true as const, requestId, initialPassword: undefined };
  }
  await dbQuery(
    `update employee_application_access
     set sync_status = 'PENDING', last_sync_error = null, last_sync_request_id = $3
     where employee_id = $1 and application_key = $2`,
    [employeeId, academyApplicationKey, requestId]
  );
  try {
    const result = await syncEmployeeToAcademy(await academySyncPayload(employeeId, actor, requestId));
    await dbQuery(
      `update employee_application_access
       set sync_status = 'SYNCED', last_synced_at = now(), last_sync_error = null,
           external_application_user_id = $4
       where employee_id = $1 and application_key = $2 and last_sync_request_id = $3`,
      [employeeId, academyApplicationKey, requestId, result.academyUserId]
    );
    return {
      synced: true as const,
      requestId,
      initialPassword: result.initialPassword,
      sessionsRevoked: result.sessionsRevoked
    };
  } catch (error) {
    const syncError = error instanceof AcademySyncError
      ? error
      : new AcademySyncError("Academy sync failed. Retry from the employee record.", "ACADEMY_SYNC_FAILED", requestId, 503);
    await dbQuery(
      `update employee_application_access
       set sync_status = 'FAILED', last_sync_error = $4
       where employee_id = $1 and application_key = $2 and last_sync_request_id = $3`,
      [employeeId, academyApplicationKey, requestId, `${syncError.code}: ${syncError.message}`]
    );
    return { synced: false as const, requestId, error: syncError.message };
  }
}

export async function auditEmployeeMutation({
  actor,
  employeeId,
  action,
  metadata,
  request
}: {
  actor: AdminSession;
  employeeId: string;
  action: string;
  metadata?: Record<string, unknown>;
  request?: Parameters<typeof logAuditEvent>[0]["request"];
}) {
  await logAuditEvent({
    actorType: "admin",
    actorId: actor.adminUserId,
    actorEmail: actor.email,
    entityType: "employee",
    entityId: employeeId,
    action,
    metadata,
    request
  });
}
