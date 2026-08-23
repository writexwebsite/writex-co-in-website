import "server-only";

import { randomUUID } from "node:crypto";
import type { AdminSession } from "@/lib/auth";
import { ApiError } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import {
  AcademySyncError,
  permanentlyPurgeAcademyEmployee,
  previewAcademyEmployeePurge,
  syncEmployeeToAcademy
} from "@/lib/employees/academy-client";
import {
  academyApplicationKey,
  type AcademyArea,
  type AcademyRole,
  type AcademyInitialAdminBootstrap,
  type EmployeeDeletionAssessment,
  type EmployeeDirectoryItem,
  type EmployeeLifecycleFilter,
  type DeliveryOperationalRole,
  type EmployeeSegment,
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
  primary_superadmin: boolean;
  employee_segment: EmployeeSegment;
  academy_area: AcademyArea;
  delivery_operational_role: DeliveryOperationalRole | null;
  delivery_reporting_parent_employee_id: string | null;
  delivery_reporting_parent_name: string | null;
  delivery_trainer_employee_id: string | null;
  delivery_trainer_name: string | null;
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
  exists(
    select 1 from ai_governance_products governance
    where governance.product_key = 'SALES_ACADEMY'
      and governance.primary_superadmin_employee_id = e.id
  ) as primary_superadmin,
  coalesce(a.employee_segment, 'NEW_BDE') as employee_segment,
  coalesce(a.academy_area, case when a.application_role='SUPER_ADMIN' then 'ACADEMY_WIDE' else 'SALES' end) as academy_area,
  a.delivery_operational_role,
  a.delivery_reporting_parent_employee_id,
  delivery_parent.display_name as delivery_reporting_parent_name,
  a.delivery_trainer_employee_id,
  delivery_trainer.display_name as delivery_trainer_name,
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
    primarySuperAdmin: row.primary_superadmin,
    employeeSegment: row.employee_segment,
    academyArea: row.academy_area,
    deliveryOperationalRole: row.delivery_operational_role,
    deliveryReportingParentEmployeeId: row.delivery_reporting_parent_employee_id,
    deliveryReportingParentName: row.delivery_reporting_parent_name,
    deliveryTrainerEmployeeId: row.delivery_trainer_employee_id,
    deliveryTrainerName: row.delivery_trainer_name,
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
    employee_count: string;
  }>(
    `select t.id, t.team_code, t.name, t.department, t.status,
        count(e.id)::text as employee_count
     from employee_teams t
     left join employees e on e.primary_team_id = t.id
     group by t.id, t.team_code, t.name, t.department, t.status
     order by t.department, t.name`
  );
  return result.rows.map((row) => ({
    id: row.id,
    teamCode: row.team_code,
    name: row.name,
    department: row.department,
    status: row.status,
    employeeCount: Number(row.employee_count)
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
     left join employees delivery_parent on delivery_parent.id = a.delivery_reporting_parent_employee_id
     left join employees delivery_trainer on delivery_trainer.id = a.delivery_trainer_employee_id
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
     left join employees delivery_parent on delivery_parent.id = a.delivery_reporting_parent_employee_id
     left join employees delivery_trainer on delivery_trainer.id = a.delivery_trainer_employee_id
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
  employeeSegment: EmployeeSegment;
  academyArea: AcademyArea;
  deliveryOperationalRole: DeliveryOperationalRole | null;
  deliveryReportingParentEmployeeId: string | null;
  deliveryTrainerEmployeeId: string | null;
  academyRoleChangeReason?: string;
  initialBootstrapConfirmed?: boolean;
};

type BootstrapRow = {
  status: AcademyInitialAdminBootstrap["status"];
  candidate_employee_id: string | null;
  consumed_by_employee_id: string | null;
  ready_at: Date | null;
  consumed_at: Date | null;
  backup_reference: string | null;
};

export async function getAcademyInitialAdminBootstrap(): Promise<AcademyInitialAdminBootstrap> {
  const result = await dbQuery<BootstrapRow & {
    employee_count: string;
    primary_superadmin_employee_id: string | null;
  }>(
    `select bootstrap.status,bootstrap.candidate_employee_id,bootstrap.consumed_by_employee_id,
        bootstrap.ready_at,bootstrap.consumed_at,bootstrap.backup_reference,
        (select count(*)::text from employees) employee_count,
        (select primary_superadmin_employee_id from ai_governance_products where product_key=$1) primary_superadmin_employee_id
     from academy_initial_admin_bootstrap bootstrap where bootstrap.singleton=true`,
    [academyApplicationKey]
  );
  const row = result.rows[0];
  if (!row) {
    return {
      status: "DISABLED",
      candidateEmployeeId: null,
      consumedByEmployeeId: null,
      readyAt: null,
      consumedAt: null,
      backupReference: null,
      employeeCount: 0,
      primarySuperAdminEmployeeId: null,
      requiresConfirmation: false
    };
  }
  const employeeCount = Number(row.employee_count);
  return {
    status: row.status,
    candidateEmployeeId: row.candidate_employee_id,
    consumedByEmployeeId: row.consumed_by_employee_id,
    readyAt: row.ready_at?.toISOString() || null,
    consumedAt: row.consumed_at?.toISOString() || null,
    backupReference: row.backup_reference,
    employeeCount,
    primarySuperAdminEmployeeId: row.primary_superadmin_employee_id,
    requiresConfirmation: row.status === "READY" && employeeCount === 0 && !row.primary_superadmin_employee_id
  };
}

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
  if (input.academyArea === "ACADEMY_WIDE") {
    if (input.academyRole !== "SUPER_ADMIN") {
      throw new ApiError(400, "BAD_REQUEST", "Academy-wide access is reserved for a SuperAdmin.");
    }
    if (input.managerEmployeeId || input.deliveryOperationalRole || input.deliveryReportingParentEmployeeId || input.deliveryTrainerEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", "Academy-wide SuperAdmins do not use department reporting or Trainer assignments.");
    }
    return;
  }

  if (input.academyArea === "DEVELOPMENT_OPERATIONS") {
    if (input.department.trim().toLowerCase() !== "development / operations") {
      throw new ApiError(400, "BAD_REQUEST", "Delivery Academy employees must use the Development / Operations department.");
    }
    if (input.managerEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", "Delivery uses a separate operational reporting parent and Trainer assignment.");
    }
    const deliveryTrainer = input.academyRole === "TRAINER";
    if (deliveryTrainer && input.deliveryOperationalRole) {
      throw new ApiError(400, "BAD_REQUEST", "Delivery Trainers are separate from the operational hierarchy.");
    }
    if (!deliveryTrainer && input.academyRole !== "EMPLOYEE") {
      throw new ApiError(400, "BAD_REQUEST", "Delivery operational roles use the employee identity permission; their responsibility is mapped separately.");
    }
    if (!deliveryTrainer && !input.deliveryOperationalRole) {
      throw new ApiError(400, "BAD_REQUEST", "Select the employee's Delivery operational role.");
    }
    if (deliveryTrainer && (input.deliveryReportingParentEmployeeId || input.deliveryTrainerEmployeeId)) {
      throw new ApiError(400, "BAD_REQUEST", "A Delivery Trainer does not sit inside the operational reporting chain.");
    }

    const expectedParentRole: Partial<Record<DeliveryOperationalRole, DeliveryOperationalRole>> = {
      TEAM_LEADER: "MANAGER",
      SENIOR_SME: "TEAM_LEADER",
      JUNIOR_SME: "SENIOR_SME"
    };
    const expectedParent = input.deliveryOperationalRole ? expectedParentRole[input.deliveryOperationalRole] : undefined;
    if (input.academyEnabled && input.employmentStatus === "ACTIVE" && expectedParent && !input.deliveryReportingParentEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", `Assign an active Delivery ${expectedParent.replaceAll("_", " ").toLowerCase()} as reporting parent.`);
    }
    if (input.deliveryOperationalRole === "MANAGER" && input.deliveryReportingParentEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", "A Delivery Manager is the root of the operational hierarchy and cannot have a Delivery reporting parent.");
    }
    if (input.deliveryReportingParentEmployeeId) {
      if (input.deliveryReportingParentEmployeeId === employeeId) {
        throw new ApiError(400, "BAD_REQUEST", "An employee cannot report to themselves.");
      }
      const parent = await query<{ employment_status: EmployeeStatus; enabled: boolean; academy_area: AcademyArea; delivery_operational_role: DeliveryOperationalRole | null }>(
        `select e.employment_status,coalesce(a.enabled,false) enabled,
           coalesce(a.academy_area,'SALES') academy_area,a.delivery_operational_role
         from employees e join employee_application_access a on a.employee_id=e.id and a.application_key=$2
         where e.id=$1`,
        [input.deliveryReportingParentEmployeeId, academyApplicationKey]
      );
      if (!parent[0] || parent[0].employment_status !== "ACTIVE" || !parent[0].enabled || parent[0].academy_area !== "DEVELOPMENT_OPERATIONS" || parent[0].delivery_operational_role !== expectedParent) {
        throw new ApiError(400, "BAD_REQUEST", `Select an active Delivery ${String(expectedParent || "parent").replaceAll("_", " ").toLowerCase()} from Development / Operations.`);
      }
      if (employeeId) {
        const circular = await query<{ employee_id: string }>(
          `with recursive chain as (
             select employee_id,delivery_reporting_parent_employee_id
             from employee_application_access where employee_id=$1 and application_key=$3
             union all
             select a.employee_id,a.delivery_reporting_parent_employee_id
             from employee_application_access a join chain c on a.employee_id=c.delivery_reporting_parent_employee_id
             where a.application_key=$3
           ) select employee_id from chain where employee_id=$2 limit 1`,
          [input.deliveryReportingParentEmployeeId, employeeId, academyApplicationKey]
        );
        if (circular[0]) throw new ApiError(409, "BAD_REQUEST", "This change would create a circular Delivery reporting relationship.");
      }
    }

    const trainerRequired = input.deliveryOperationalRole === "SENIOR_SME" || input.deliveryOperationalRole === "JUNIOR_SME";
    if (input.academyEnabled && input.employmentStatus === "ACTIVE" && trainerRequired && !input.deliveryTrainerEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", "Assign an active Delivery Trainer before enabling this SME.");
    }
    if (!trainerRequired && input.deliveryTrainerEmployeeId) {
      throw new ApiError(400, "BAD_REQUEST", "Trainer assignment is available only for Delivery Senior SME and Junior SME records.");
    }
    if (input.deliveryTrainerEmployeeId) {
      if (input.deliveryTrainerEmployeeId === employeeId) {
        throw new ApiError(400, "BAD_REQUEST", "An employee cannot be their own Trainer.");
      }
      const trainer = await query<{ employment_status: EmployeeStatus; enabled: boolean; application_role: AcademyRole; academy_area: AcademyArea }>(
        `select e.employment_status,coalesce(a.enabled,false) enabled,a.application_role,
           coalesce(a.academy_area,'SALES') academy_area
         from employees e join employee_application_access a on a.employee_id=e.id and a.application_key=$2
         where e.id=$1`,
        [input.deliveryTrainerEmployeeId, academyApplicationKey]
      );
      if (!trainer[0] || trainer[0].employment_status !== "ACTIVE" || !trainer[0].enabled || trainer[0].application_role !== "TRAINER" || trainer[0].academy_area !== "DEVELOPMENT_OPERATIONS") {
        throw new ApiError(400, "BAD_REQUEST", "Select an active Delivery Trainer from Development / Operations. Sales Trainers cannot be assigned to Delivery employees.");
      }
    }
    return;
  }

  if (input.deliveryOperationalRole || input.deliveryReportingParentEmployeeId || input.deliveryTrainerEmployeeId) {
    throw new ApiError(400, "BAD_REQUEST", "Delivery hierarchy fields can be used only for Development / Operations Academy access.");
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
  if (["MANAGER_TL", "SUPER_ADMIN"].includes(input.academyRole) && input.managerEmployeeId) {
    throw new ApiError(400, "BAD_REQUEST", "Manager / TL and SuperAdmin records sit outside the Trainer-to-Employee reporting relationship.");
  }
}

export async function createEmployee(input: EmployeeMutationInput, actor: AdminSession) {
  return withDbTransaction(async (query) => {
    const bootstrapRows = await query<BootstrapRow>(
      "select status,candidate_employee_id,consumed_by_employee_id,ready_at,consumed_at,backup_reference from academy_initial_admin_bootstrap where singleton=true for update"
    );
    const employeeCountRows = await query<{ count: string }>("select count(*)::text count from employees");
    const bootstrap = bootstrapRows[0];
    const initialBootstrap = bootstrap?.status === "READY" && Number(employeeCountRows[0]?.count || 0) === 0;
    if (initialBootstrap && !input.initialBootstrapConfirmed) {
      throw new ApiError(409, "BAD_REQUEST", "Confirm CREATE PRIMARY SUPERADMIN before creating the first real Academy employee.");
    }
    if (initialBootstrap && isClearlyTemporaryEmployee(input)) {
      throw new ApiError(409, "BAD_REQUEST", "A test, UAT, demo or temporary identity cannot consume the one-time Primary SuperAdmin bootstrap.");
    }
    const effectiveInput: EmployeeMutationInput = initialBootstrap ? {
      ...input,
      employmentStatus: "ACTIVE",
      academyEnabled: true,
      academyRole: "SUPER_ADMIN",
      academyArea: "ACADEMY_WIDE",
      managerEmployeeId: null,
      deliveryOperationalRole: null,
      deliveryReportingParentEmployeeId: null,
      deliveryTrainerEmployeeId: null
    } : input;
    await validateRelationships(query, effectiveInput);
    let employeeId: string;
    try {
      const rows = await query<{ id: string }>(
        `insert into employees
          (employee_code, display_name, official_email, department, designation,
           employment_status, primary_team_id, manager_employee_id, created_by_admin_id)
         values ($1, $2, lower($3), $4, $5, $6, $7, $8, $9) returning id`,
        [effectiveInput.employeeCode, effectiveInput.displayName, effectiveInput.officialEmail, effectiveInput.department,
          effectiveInput.designation, effectiveInput.employmentStatus, effectiveInput.primaryTeamId,
          effectiveInput.managerEmployeeId, actor.adminUserId]
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
        (employee_id, application_key, enabled, application_role, employee_segment, academy_area,
         delivery_operational_role, delivery_reporting_parent_employee_id, delivery_trainer_employee_id, granted_by_admin_id,
          granted_at, sync_status, sync_version)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, case when $3 then now() else null end,
          case when $3 then 'PENDING' else 'SYNCED' end, case when $3 then 1 else 0 end)`,
      [employeeId, academyApplicationKey, effectiveInput.academyEnabled, effectiveInput.academyRole, effectiveInput.employeeSegment,
        effectiveInput.academyArea, effectiveInput.deliveryOperationalRole, effectiveInput.deliveryReportingParentEmployeeId,
        effectiveInput.deliveryTrainerEmployeeId, actor.adminUserId]
    );
    if (initialBootstrap) {
      await query(
        `update academy_initial_admin_bootstrap
         set status='RESERVED',candidate_employee_id=$1,reserved_at=now(),updated_by_admin_id=$2,updated_at=now()
         where singleton=true and status='READY'`,
        [employeeId, actor.adminUserId]
      );
    }
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
      employee_segment: EmployeeSegment;
      academy_area: AcademyArea;
      delivery_operational_role: DeliveryOperationalRole | null;
      delivery_reporting_parent_employee_id: string | null;
      delivery_trainer_employee_id: string | null;
      external_application_user_id: string | null;
      archived_at: Date | null;
      primary_superadmin: boolean;
    }>(
      `select e.employment_status, e.primary_team_id, e.manager_employee_id,
          e.archived_at, a.enabled, a.application_role, a.employee_segment, a.academy_area,
          a.delivery_operational_role,a.delivery_reporting_parent_employee_id,a.delivery_trainer_employee_id,a.external_application_user_id
          , exists(select 1 from ai_governance_products p where p.product_key=$2 and p.primary_superadmin_employee_id=e.id) primary_superadmin
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
    const academyRole = input.academyRole;
    if (current[0].primary_superadmin && academyRole !== "SUPER_ADMIN") {
      throw new ApiError(409, "BAD_REQUEST", "Transfer Primary SuperAdmin before explicitly changing this employee's Academy role.");
    }
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
            employee_segment = $7, academy_area=$8, delivery_operational_role=$9,
            delivery_reporting_parent_employee_id=$10, delivery_trainer_employee_id=$11,
           granted_at = case when $3 and not enabled then now() else granted_at end,
           revoked_at = case when not $3 and enabled then now() when $3 then null else revoked_at end,
           sync_status = case when $6 then 'PENDING' else 'SYNCED' end,
           last_sync_error = null,
           sync_version = sync_version + case when $6 then 1 else 0 end
       where employee_id = $1 and application_key = $2`,
      [employeeId, academyApplicationKey, effectiveAcademyEnabled, academyRole,
        actor.adminUserId, shouldSync, input.employeeSegment, input.academyArea, input.deliveryOperationalRole,
        input.deliveryReportingParentEmployeeId, input.deliveryTrainerEmployeeId]
    );
  });
}

export type EmployeeLifecycleMutation =
  | { action: "DEACTIVATE"; reason: string }
  | { action: "ARCHIVE"; reason: string }
  | { action: "RESTORE"; reason: string }
  | { action: "SET_ACADEMY_ACCESS"; enabled: boolean; managerEmployeeId?: string | null }
  | { action: "SET_ACADEMY_ROLE"; role: AcademyRole; reason: string; managerEmployeeId?: string | null };

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
      primary_superadmin: boolean;
      employee_code: string;
      display_name: string;
      official_email: string;
      department: string;
      designation: string;
      primary_team_id: string | null;
      manager_employee_id: string | null;
      employee_segment: EmployeeSegment;
      academy_area: AcademyArea;
      delivery_operational_role: DeliveryOperationalRole | null;
      delivery_reporting_parent_employee_id: string | null;
      delivery_trainer_employee_id: string | null;
    }>(
       `select e.employee_code,e.display_name,e.official_email,e.department,e.designation,
           e.primary_team_id,e.manager_employee_id,e.employment_status, e.archived_at, e.archive_previous_employment_status,
           e.archive_previous_academy_enabled, e.lifecycle_version,
           a.enabled, a.application_role,a.employee_segment,a.academy_area,a.delivery_operational_role,
           a.delivery_reporting_parent_employee_id,a.delivery_trainer_employee_id,a.external_application_user_id,
          exists(select 1 from ai_governance_products p where p.product_key=$2 and p.primary_superadmin_employee_id=e.id) primary_superadmin
       from employees e
       join employee_application_access a on a.employee_id = e.id and a.application_key = $2
       where e.id = $1 for update`,
      [employeeId, academyApplicationKey]
    );
    const current = rows[0];
    if (!current) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");

    const protectsPrimarySuperAdmin = current.primary_superadmin;
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

    const removesSupervisor = input.action === "DEACTIVATE"
      || input.action === "ARCHIVE"
      || (input.action === "SET_ACADEMY_ACCESS" && !input.enabled)
      || (input.action === "SET_ACADEMY_ROLE" && input.role !== current.application_role);
    if (removesSupervisor && ["TRAINER", "MANAGER_TL"].includes(current.application_role)) {
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
    if (removesSupervisor && current.academy_area === "DEVELOPMENT_OPERATIONS") {
      const dependencies = await query<{ operational_reports: string; training_assignments: string }>(
        `select
           (select count(*)::text from employee_application_access a join employees e on e.id=a.employee_id
             where a.delivery_reporting_parent_employee_id=$1 and a.application_key=$2 and a.enabled and e.employment_status='ACTIVE') operational_reports,
           (select count(*)::text from employee_application_access a join employees e on e.id=a.employee_id
             where a.delivery_trainer_employee_id=$1 and a.application_key=$2 and a.enabled and e.employment_status='ACTIVE') training_assignments`,
        [employeeId, academyApplicationKey]
      );
      if (Number(dependencies[0]?.operational_reports || 0) > 0) {
        throw new ApiError(409, "BAD_REQUEST", "Reassign active Delivery reports before deactivating or archiving this employee.");
      }
      if (Number(dependencies[0]?.training_assignments || 0) > 0) {
        throw new ApiError(409, "BAD_REQUEST", "Reassign active Delivery learners before deactivating or archiving this Trainer.");
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
      await validateRelationships(query, {
        employeeCode: current.employee_code,
        displayName: current.display_name,
        officialEmail: current.official_email,
        department: current.department,
        designation: current.designation,
        employmentStatus: restoredStatus,
        primaryTeamId: current.primary_team_id,
        managerEmployeeId: current.manager_employee_id,
        academyEnabled: restoredAccess,
        academyRole: current.application_role,
        employeeSegment: current.employee_segment,
        academyArea: current.academy_area,
        deliveryOperationalRole: current.delivery_operational_role,
        deliveryReportingParentEmployeeId: current.delivery_reporting_parent_employee_id,
        deliveryTrainerEmployeeId: current.delivery_trainer_employee_id
      }, employeeId);
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
      const managerEmployeeId = input.managerEmployeeId === undefined ? current.manager_employee_id : input.managerEmployeeId;
      await validateRelationships(query, {
        employeeCode: current.employee_code,
        displayName: current.display_name,
        officialEmail: current.official_email,
        department: current.department,
        designation: current.designation,
        employmentStatus: current.employment_status,
        primaryTeamId: current.primary_team_id,
        managerEmployeeId,
        academyEnabled: input.enabled,
        academyRole: current.application_role,
        employeeSegment: current.employee_segment,
        academyArea: current.academy_area,
        deliveryOperationalRole: current.delivery_operational_role,
        deliveryReportingParentEmployeeId: current.delivery_reporting_parent_employee_id,
        deliveryTrainerEmployeeId: current.delivery_trainer_employee_id
      }, employeeId);
      await query("update employees set manager_employee_id=$2 where id=$1", [employeeId, managerEmployeeId]);
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
      if (current.academy_area !== "SALES") {
        throw new ApiError(409, "BAD_REQUEST", "Use View / Edit to change a Delivery or Academy-wide responsibility safely.");
      }
      if (current.archived_at) {
        throw new ApiError(409, "BAD_REQUEST", "Restore the employee before changing the Academy role.");
      }
      const managerEmployeeId = ["EMPLOYEE", "TRAINER"].includes(input.role)
        ? (input.managerEmployeeId === undefined ? current.manager_employee_id : input.managerEmployeeId)
        : null;
      await validateRelationships(query, {
        employeeCode: current.employee_code,
        displayName: current.display_name,
        officialEmail: current.official_email,
        department: current.department,
        designation: current.designation,
        employmentStatus: current.employment_status,
        primaryTeamId: current.primary_team_id,
        managerEmployeeId,
        academyEnabled: current.enabled,
        academyRole: input.role,
        employeeSegment: current.employee_segment,
        academyArea: current.academy_area,
        deliveryOperationalRole: current.delivery_operational_role,
        deliveryReportingParentEmployeeId: current.delivery_reporting_parent_employee_id,
        deliveryTrainerEmployeeId: current.delivery_trainer_employee_id
      }, employeeId);
      await query("update employees set manager_employee_id=$2 where id=$1", [employeeId, managerEmployeeId]);
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

export async function getEmployeeDeletionAssessment(employeeId: string, actor: AdminSession): Promise<EmployeeDeletionAssessment> {
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
  const protectedBlockers = [
    Number(counts.subordinate_count) ? { code: "REPORTING_LINE", label: "Employee reporting relationships", count: Number(counts.subordinate_count) } : null,
    Number(counts.primary_superadmin_count) ? { code: "PRIMARY_SUPERADMIN", label: "Current Primary Academy SuperAdmin assignment", count: Number(counts.primary_superadmin_count) } : null
  ].filter((item): item is { code: string; label: string; count: number } => Boolean(item));
  const localDependencies = [
    Number(counts.ai_usage_count) ? { code: "AI_USAGE", label: "Academy AI usage records", count: Number(counts.ai_usage_count) } : null,
    Number(counts.active_session_count) ? { code: "WEBSITE_SESSION", label: "Active employee sessions", count: Number(counts.active_session_count) } : null,
    Number(counts.meaningful_audit_count) ? { code: "AUDIT_HISTORY", label: "Meaningful employee lifecycle or role history", count: Number(counts.meaningful_audit_count) } : null
  ].filter((item): item is { code: string; label: string; count: number } => Boolean(item));
  let academyAvailable = true;
  let academyHasMeaningfulHistory = false;
  let academyDependencies: Array<{ code: string; label: string; count: number }> = [];
  try {
    const preview = await previewAcademyEmployeePurge(employeeId, { adminId: actor.adminUserId, email: actor.email });
    academyHasMeaningfulHistory = preview.hasMeaningfulHistory;
    academyDependencies = preview.categories.map((item) => ({
      code: `ACADEMY_${item.code}`,
      label: item.label,
      count: item.count
    }));
  } catch {
    academyAvailable = false;
    protectedBlockers.push({ code: "ACADEMY_UNAVAILABLE", label: "Academy dependency check is unavailable. Retry before deleting.", count: 1 });
  }
  const dependencies = [...localDependencies, ...academyDependencies];
  const temporaryIdentity = isClearlyTemporaryEmployee(employee);
  const meaningfulHistory = academyHasMeaningfulHistory || localDependencies.some((item) => item.code !== "WEBSITE_SESSION");
  const zeroHistoryAllowed = academyAvailable && protectedBlockers.length === 0 && !meaningfulHistory;
  const fullPurgeAllowed = academyAvailable && protectedBlockers.length === 0;
  return {
    allowed: fullPurgeAllowed,
    zeroHistoryAllowed,
    fullPurgeAllowed,
    recommendedMode: !fullPurgeAllowed ? "ARCHIVE" : meaningfulHistory ? "FULL_PURGE" : "ZERO_HISTORY",
    temporaryIdentity,
    blockers: protectedBlockers,
    dependencies,
    academyAvailable,
    academyHasMeaningfulHistory,
    totalDependencyCount: dependencies.reduce((sum, item) => sum + item.count, 0)
  };
}

export async function permanentlyDeleteEmployee(
  employeeId: string,
  input: {
    confirmation: string;
    reason: string;
    mode: "ZERO_HISTORY" | "FULL_PURGE";
    actor: AdminSession;
  }
) {
  const employee = await getEmployee(employeeId);
  if (!employee) throw new ApiError(404, "NOT_FOUND", "Employee was not found.");
  if (input.confirmation.trim().toUpperCase() !== `DELETE ${employee.employeeCode}`.toUpperCase()) {
    throw new ApiError(400, "BAD_REQUEST", `Type DELETE ${employee.employeeCode} to confirm permanent deletion.`);
  }
  const assessment = await getEmployeeDeletionAssessment(employeeId, input.actor);
  if (!assessment.fullPurgeAllowed || (input.mode === "ZERO_HISTORY" && !assessment.zeroHistoryAllowed)) {
    throw new ApiError(409, "BAD_REQUEST", "Permanent deletion is blocked. Resolve the protected relationship or choose Archive.");
  }
  const academy = await permanentlyPurgeAcademyEmployee(employeeId, {
    mode: input.mode,
    reason: input.reason,
    requestedBy: { adminId: input.actor.adminUserId, email: input.actor.email }
  });
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
    const protectedCounts = await query<{ reports: string; primary_count: string }>(
      `select (select count(*)::text from employees where manager_employee_id=$1) reports,
        (select count(*)::text from ai_governance_products where primary_superadmin_employee_id=$1) primary_count`,
      [employeeId]
    );
    if (Number(protectedCounts[0]?.reports || 0) || Number(protectedCounts[0]?.primary_count || 0)) {
      throw new ApiError(409, "BAD_REQUEST", "The employee became protected during deletion. Latest state has been loaded; retry after reassignment.");
    }
    await query("delete from employee_sessions where employee_id=$1::text", [employeeId]);
    await query("delete from ai_usage_ledger where employee_id=$1::text", [employeeId]);
    await query("delete from audit_logs where entity_type='employee' and entity_id=$1::text", [employeeId]);
    await query(
      "delete from employee_application_access where employee_id = $1 and application_key = $2",
      [employeeId, academyApplicationKey]
    );
    await query("delete from employees where id = $1", [employeeId]);
    await query(
      `insert into employee_deletion_tombstones(
         employee_reference,employee_code,deletion_mode,dependency_counts,reason,
         performed_by_admin_id,performed_by_email,academy_request_id
       ) values($1,$2,$3,$4::jsonb,$5,$6,$7,$8)`,
      [employeeId,current.employee_code,input.mode,JSON.stringify({
        website: assessment.dependencies,
        academy: academy.counts,
        total: assessment.totalDependencyCount
      }),input.reason,input.actor.adminUserId,input.actor.email,academy.requestId]
    );
    return { ...current, academy };
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

export async function getEmployeeTeam(teamId: string) {
  const teams = await listEmployeeTeams();
  return teams.find((team) => team.id === teamId) ?? null;
}

export async function updateEmployeeTeam(
  teamId: string,
  input: { teamCode: string; name: string; department: string; status: EmployeeStatus },
  actor: AdminSession
) {
  try {
    return await withDbTransaction(async (query) => {
      const current = await query<{ id: string; department: string }>(
        "select id, department from employee_teams where id = $1 for update",
        [teamId]
      );
      if (!current[0]) throw new ApiError(404, "NOT_FOUND", "Team was not found.");

      const incompatible = await query<{ employee_count: string }>(
        `select count(*)::text as employee_count
         from employees
         where primary_team_id = $1 and lower(department) <> lower($2)`,
        [teamId, input.department]
      );
      if (Number(incompatible[0]?.employee_count || 0) > 0) {
        throw new ApiError(
          409,
          "BAD_REQUEST",
          "This department change conflicts with assigned employees. Reassign those employees before changing the team department."
        );
      }

      await query(
        `update employee_teams
         set team_code = $2, name = $3, department = $4, status = $5
         where id = $1`,
        [teamId, input.teamCode, input.name, input.department, input.status]
      );
      const assigned = await query<{ employee_id: string }>(
        `select employee_id
         from employee_application_access
         where application_key = $2
           and employee_id in (select id from employees where primary_team_id = $1)`,
        [teamId, academyApplicationKey]
      );
      if (assigned.length) {
        await query(
          `update employee_application_access
           set sync_status = 'PENDING', last_sync_error = null
           where application_key = $2
             and employee_id in (select id from employees where primary_team_id = $1)`,
          [teamId, academyApplicationKey]
        );
      }
      return { employeeIds: assigned.map((row) => row.employee_id), actorId: actor.adminUserId };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new ApiError(409, "BAD_REQUEST", "A team already uses this code or name in the department.");
    }
    throw error;
  }
}

export async function permanentlyDeleteEmployeeTeam(
  teamId: string,
  input: { confirmation: string; reason: string }
) {
  return withDbTransaction(async (query) => {
    const current = await query<{ id: string; team_code: string; name: string; department: string; status: EmployeeStatus }>(
      "select id, team_code, name, department, status from employee_teams where id = $1 for update",
      [teamId]
    );
    const team = current[0];
    if (!team) throw new ApiError(404, "NOT_FOUND", "Team was not found.");
    if (input.confirmation.toUpperCase() !== `DELETE ${team.team_code}`.toUpperCase()) {
      throw new ApiError(400, "BAD_REQUEST", `Type DELETE ${team.team_code} to confirm permanent deletion.`);
    }
    const dependencies = await query<{ employee_count: string }>(
      "select count(*)::text as employee_count from employees where primary_team_id = $1",
      [teamId]
    );
    const employeeCount = Number(dependencies[0]?.employee_count || 0);
    if (employeeCount > 0) {
      throw new ApiError(
        409,
        "BAD_REQUEST",
        `This team is assigned to ${employeeCount} employee${employeeCount === 1 ? "" : "s"}. Reassign them before deleting the team.`
      );
    }
    await query("delete from employee_teams where id = $1", [teamId]);
    return { ...team, reason: input.reason };
  });
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
    employee_segment: EmployeeSegment;
    academy_area: AcademyArea;
    delivery_operational_role: DeliveryOperationalRole | null;
    delivery_reporting_parent_employee_id: string | null;
    delivery_trainer_employee_id: string | null;
    primary_superadmin: boolean;
    team_id: string | null;
    team_code: string | null;
    team_name: string | null;
    team_status: EmployeeStatus | null;
    team_manager_employee_id: string | null;
  }>(
    `select e.id, e.employee_code, e.display_name, e.official_email, e.department,
        e.designation, e.employment_status, e.manager_employee_id,
        a.enabled, a.application_role, a.employee_segment,a.academy_area,
        a.delivery_operational_role,a.delivery_reporting_parent_employee_id,a.delivery_trainer_employee_id,
        exists(select 1 from ai_governance_products governance where governance.product_key=$3 and governance.primary_superadmin_employee_id=e.id) primary_superadmin,
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
    [employeeId, academyApplicationKey, academyApplicationKey]
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
    access: {
      enabled: row.enabled,
      role: row.application_role,
      employeeSegment: row.employee_segment,
      primarySuperAdmin: row.primary_superadmin,
      area: row.academy_area
    },
    delivery: row.academy_area === "DEVELOPMENT_OPERATIONS" ? {
      departmentCode: "DEVELOPMENT_OPERATIONS" as const,
      operationalRole: row.delivery_operational_role,
      reportingParentEmployeeId: row.delivery_reporting_parent_employee_id,
      trainerEmployeeId: row.delivery_trainer_employee_id
    } : null,
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
    const bootstrapRows = await withDbTransaction(async (query) => {
      const bootstrap = await query<{ status: string; candidate_employee_id: string | null }>(
        "select status,candidate_employee_id from academy_initial_admin_bootstrap where singleton=true for update"
      );
      if (bootstrap[0]?.status !== "RESERVED" || bootstrap[0].candidate_employee_id !== employeeId) return [];
      const governanceProduct = await query<{ id: string }>(
        `update ai_governance_products
         set primary_superadmin_employee_id=$2,updated_by_admin_id=$3
         where product_key=$1
         returning id`,
        [academyApplicationKey, employeeId, actor.adminUserId]
      );
      if (!governanceProduct[0]) {
        throw new Error("Sales Academy governance is unavailable. The first SuperAdmin bootstrap remains reserved for retry.");
      }
      await query(
        `update academy_initial_admin_bootstrap
         set status='CONSUMED',consumed_by_employee_id=$1,consumed_at=now(),candidate_employee_id=null,
             updated_by_admin_id=$2,updated_at=now()
         where singleton=true and status='RESERVED' and candidate_employee_id=$1`,
        [employeeId, actor.adminUserId]
      );
      return [{ consumed: true }];
    });
    return {
      synced: true as const,
      requestId,
      initialPassword: result.initialPassword,
      sessionsRevoked: result.sessionsRevoked,
      bootstrapConsumed: Boolean(bootstrapRows[0])
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
