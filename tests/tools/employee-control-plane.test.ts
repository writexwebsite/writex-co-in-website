import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { canManageEmployees } from "@/lib/admin/permissions";
import type { AdminSession } from "@/lib/auth";
import { isClearlyTemporaryEmployee } from "@/lib/employees/domain";

const read = (path: string) => readFile(path, "utf8");
const session = (role: AdminSession["role"]): AdminSession => ({
  kind: "admin",
  adminUserId: "00000000-0000-4000-8000-000000000001",
  email: "admin@example.test",
  role,
  mustChangePassword: false
});

test("only Super Admin manages employees and Academy access", () => {
  assert.equal(canManageEmployees(session("super_admin")), true);
  for (const role of ["sales", "support", "accounts", "viewer"] as const) {
    assert.equal(canManageEmployees(session(role)), false);
  }
});

test("employee schema uses stable generic identity and generic application access", async () => {
  const sql = await read("database/migrations/20260813_employee_control_plane.sql");
  assert.match(sql, /create table if not exists employees/);
  assert.match(sql, /id uuid primary key/);
  assert.match(sql, /employee_code text not null/);
  assert.match(sql, /manager_employee_id uuid references employees/);
  assert.match(sql, /create table if not exists employee_application_access/);
  assert.match(sql, /application_key text not null/);
  assert.match(sql, /sync_status in \('PENDING', 'SYNCED', 'FAILED'\)/);
});

test("browser APIs delegate Academy changes through the Website backend only", async () => {
  const client = await read("lib/employees/academy-client.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(client, /\/api\/internal\/employees\/sync/);
  assert.match(client, /x-writex-signature/);
  assert.match(client, /createHmac\("sha256"/);
  assert.doesNotMatch(ui, /ACADEMY_INTERNAL|\/api\/internal\/employees/);
});

test("sync failure remains visible and manually retryable", async () => {
  const repository = await read("lib/employees/repository.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(repository, /sync_status = 'FAILED'/);
  assert.match(repository, /last_sync_error/);
  assert.match(ui, /Retry Academy Sync/);
  assert.match(ui, /Security attention/);
});

test("employee UI separates employment and application access with confirmed revocation", async () => {
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(ui, />Employment</);
  assert.match(ui, />Application access</);
  assert.match(ui, /Stable employee ID/);
  assert.match(ui, /Last Academy sync/);
  assert.match(ui, /Confirm and revoke access/);
});

test("employee lifecycle schema is additive and reversible", async () => {
  const migration = await read("database/migrations/20260818_employee_lifecycle.sql");
  const rollback = await read("database/migrations/20260818_employee_lifecycle.rollback.sql");
  assert.match(migration, /add column if not exists archived_at/);
  assert.match(migration, /archive_previous_employment_status/);
  assert.match(migration, /archive_previous_academy_enabled/);
  assert.match(migration, /lifecycle_version/);
  assert.match(rollback, /drop column if exists archived_at/);
  assert.doesNotMatch(migration, /drop table|delete from employees/i);
});

test("directory exposes filtered lifecycle management without row delete buttons", async () => {
  const page = await read("app/admin/employees/page.tsx");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(page, /requestedLifecycle.*active/);
  assert.match(ui, /Employee directory filters/);
  assert.match(ui, /Manage \$\{employee\.displayName\}/);
  assert.match(ui, /Deactivate Employee/);
  assert.match(ui, /Archive Employee/);
  assert.match(ui, /Restore Employee/);
  assert.match(ui, /Permanently Delete/);
  assert.match(ui, /Checking Website and Academy dependencies/);
});

test("team directory exposes governed edit, status and dependency-protected deletion", async () => {
  const domain = await read("lib/employees/domain.ts");
  const validation = await read("lib/employees/validation.ts");
  const repository = await read("lib/employees/repository.ts");
  const route = await read("app/api/admin/employee-teams/[teamId]/route.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(domain, /employeeCount: number/);
  assert.match(validation, /employeeTeamUpdateSchema/);
  assert.match(validation, /employeeTeamDeleteSchema/);
  assert.match(repository, /count\(e\.id\)::text as employee_count/);
  assert.match(repository, /Reassign them before deleting the team/);
  assert.match(repository, /This department change conflicts with assigned employees/);
  assert.match(route, /employee_team_updated/);
  assert.match(route, /employee_team_status_changed/);
  assert.match(route, /employee_team_deleted/);
  assert.match(route, /assertSameOrigin/);
  assert.match(route, /assertCanManageEmployees/);
  assert.match(ui, /Manage \$\{team\.name\}/);
  assert.match(ui, /Edit team/);
  assert.match(ui, /Deactivate team/);
  assert.match(ui, /Activate team/);
  assert.match(ui, /Permanent deletion is blocked/);
});

test("permanent purge eligibility is limited to clearly temporary identities", () => {
  assert.equal(isClearlyTemporaryEmployee({
    employeeCode: "WP-UAT-DELETE",
    displayName: "Lifecycle UAT",
    officialEmail: "lifecycle-uat@example.test"
  }), true);
  assert.equal(isClearlyTemporaryEmployee({
    employeeCode: "E0219",
    displayName: "Ankur Pal",
    officialEmail: "operations@writex.co.in"
  }), false);
});

test("deletion assessment distinguishes protected relationships from authorisable governed history", async () => {
  const repository = await read("lib/employees/repository.ts");
  assert.match(repository, /REPORTING_LINE/);
  assert.match(repository, /PRIMARY_SUPERADMIN/);
  assert.match(repository, /AI_USAGE/);
  assert.match(repository, /AUDIT_HISTORY/);
  assert.match(repository, /previewAcademyEmployeePurge/);
  assert.match(repository, /fullPurgeAllowed/);
  assert.match(repository, /zeroHistoryAllowed/);
  assert.match(repository, /permanentlyPurgeAcademyEmployee/);
});

test("Website Admin exposes one-time Academy credentials and signed password reset", async () => {
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  const client = await read("lib/employees/academy-client.ts");
  const route = await read("app/api/admin/employees/[employeeId]/academy-password/route.ts");
  const lifecycleRoute = await read("app/api/admin/employees/[employeeId]/lifecycle/route.ts");
  assert.match(ui, /Sales Academy Access Ready/);
  assert.match(ui, /Copy Email/);
  assert.match(ui, /Copy Password/);
  assert.match(ui, /Copy Login Details/);
  assert.match(ui, /Reset Academy Password/);
  assert.match(ui, /if \(!password\) return null/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
  assert.match(client, /credentials\/reset/);
  assert.match(route, /assertSameOrigin/);
  assert.match(route, /assertCanManageEmployees/);
  assert.match(route, /academy_password_reset/);
  assert.doesNotMatch(route, /metadata:\s*\{[^}\n]*(?:initialPassword|password)/i);
  assert.match(lifecycleRoute, /const credentials = employee && initialPassword/);
  assert.doesNotMatch(lifecycleRoute, /metadata:\s*\{[^}\n]*(?:initialPassword|password)/i);
});

test("Website Admin enforces the Manager TL to Trainer to Employee hierarchy", async () => {
  const repository = await read("lib/employees/repository.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(repository, /Assigned Trainer must be an active employee with Academy Trainer access/);
  assert.match(repository, /Reports To must be an active employee with Academy Manager \/ TL access/);
  assert.match(repository, /Assign an active Trainer before enabling Academy access/);
  assert.match(repository, /Assign an active Manager \/ TL before enabling Academy access/);
  assert.match(repository, /This change would create a circular reporting relationship/);
  assert.match(repository, /when a\.application_role='EMPLOYEE' then supervisor\.manager_employee_id/);
  assert.match(ui, /Assigned Trainer/);
  assert.match(ui, /Reports To Manager \/ TL/);
  assert.match(ui, /The Manager \/ TL resolves automatically through the selected Trainer/);
});

test("hierarchy lifecycle actions validate a complete proposed state before sync", async () => {
  const repository = await read("lib/employees/repository.ts");
  const validation = await read("lib/employees/validation.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(validation, /managerEmployeeId: optionalUuid\.optional\(\)/);
  assert.match(repository, /await validateRelationships\(query, \{/);
  assert.match(repository, /const removesSupervisor/);
  assert.match(ui, /Academy setup incomplete/i);
  assert.match(ui, /Save & Retry Academy Sync/);
  assert.match(ui, /No active Academy/);
});

test("employee purge uses exact impact, strong confirmation and non-sensitive tombstones", async () => {
  const domain = await read("lib/employees/domain.ts");
  const validation = await read("lib/employees/validation.ts");
  const repository = await read("lib/employees/repository.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  const migration = await read("database/migrations/20260821_employee_hierarchy_purge_bootstrap.sql");
  assert.match(domain, /recommendedMode: "ZERO_HISTORY" \| "FULL_PURGE" \| "ARCHIVE"/);
  assert.match(validation, /acknowledged: z\.literal\(true\)/);
  assert.match(repository, /DELETE \$\{employee\.employeeCode\}/);
  assert.match(repository, /employee_deletion_tombstones/);
  assert.match(ui, /Delete impact/);
  assert.match(ui, /Permanently Purge Employee/);
  assert.match(migration, /dependency_counts jsonb/);
  assert.doesNotMatch(migration, /password|secret/i);
});

test("one-time first real employee bootstrap is explicit and cannot re-arm from an empty directory", async () => {
  const repository = await read("lib/employees/repository.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  const migration = await read("database/migrations/20260821_employee_hierarchy_purge_bootstrap.sql");
  assert.match(migration, /status in \('DISABLED','READY','RESERVED','CONSUMED'\)/);
  assert.match(migration, /default 'DISABLED'/);
  assert.match(repository, /initialBootstrapConfirmed/);
  assert.match(repository, /isClearlyTemporaryEmployee\(input\)/);
  assert.match(repository, /status='CONSUMED'/);
  assert.match(ui, /Create Primary SuperAdmin/);
  assert.match(ui, /not a test, UAT, demo or temporary identity/);
  assert.doesNotMatch(repository, /update academy_initial_admin_bootstrap\s+set status='READY'/);
});

test("Website Admin treats Senior BDE as an audited employee segment rather than an RBAC role", async () => {
  const domain = await read("lib/employees/domain.ts");
  const validation = await read("lib/employees/validation.ts");
  const repository = await read("lib/employees/repository.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  const route = await read("app/api/admin/employees/[employeeId]/route.ts");
  const migration = await read("database/migrations/20260820_senior_bde_employee_segment.sql");
  assert.match(domain, /employeeSegments = \["NEW_BDE", "SENIOR_BDE"\]/);
  assert.doesNotMatch(domain, /academyRoles = \[[^\]]*SENIOR_BDE/);
  assert.match(validation, /employeeSegment: z\.enum\(employeeSegments\)/);
  assert.match(repository, /employeeSegment: row\.employee_segment/);
  assert.match(repository, /access: \{ enabled: row\.enabled, role: row\.application_role, employeeSegment:/);
  assert.match(ui, /Employee segment/);
  assert.match(ui, /Changing it preserves the employee identity and all history/);
  assert.match(route, /academy_employee_segment_changed/);
  assert.match(route, /identityPreserved: true/);
  assert.match(migration, /check \(employee_segment in \('NEW_BDE','SENIOR_BDE'\)\)/);
});

test("Website Admin keeps Academy role, segment, hierarchy and Primary status independent", async () => {
  const domain = await read("lib/employees/domain.ts");
  const validation = await read("lib/employees/validation.ts");
  const repository = await read("lib/employees/repository.ts");
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  const route = await read("app/api/admin/employees/[employeeId]/route.ts");
  assert.match(domain, /assignableAcademyRoles = academyRoles/);
  assert.match(domain, /primarySuperAdmin: boolean/);
  assert.match(validation, /academyRoleChangeReason/);
  assert.match(repository, /const academyRole = input\.academyRole/);
  assert.match(repository, /current\[0\]\.primary_superadmin/);
  assert.match(repository, /role: row\.application_role/);
  assert.match(ui, /<option value="SUPER_ADMIN">SuperAdmin<\/option>/);
  assert.match(ui, /Role, employee segment, and reporting hierarchy are separate controls/);
  assert.match(ui, /Primary SuperAdmin/);
  assert.match(route, /actionSource: "WEBSITE_ADMIN_EMPLOYEE_EDIT"/);
});
