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

test("deletion assessment blocks Academy and meaningful operational history", async () => {
  const repository = await read("lib/employees/repository.ts");
  assert.match(repository, /ACADEMY_HISTORY/);
  assert.match(repository, /REPORTING_LINE/);
  assert.match(repository, /PRIMARY_SUPERADMIN/);
  assert.match(repository, /AI_USAGE/);
  assert.match(repository, /AUDIT_HISTORY/);
  assert.match(repository, /Archive the employee instead/);
});

test("Website Admin exposes one-time Academy credentials and signed password reset", async () => {
  const ui = await read("components/admin/EmployeeControlPlane.tsx");
  const client = await read("lib/employees/academy-client.ts");
  const route = await read("app/api/admin/employees/[employeeId]/academy-password/route.ts");
  assert.match(ui, /Sales Academy Access Ready/);
  assert.match(ui, /Copy Email/);
  assert.match(ui, /Copy Password/);
  assert.match(ui, /Copy Login Details/);
  assert.match(ui, /Reset Academy Password/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
  assert.match(client, /credentials\/reset/);
  assert.match(route, /assertSameOrigin/);
  assert.match(route, /assertCanManageEmployees/);
  assert.match(route, /academy_password_reset/);
  assert.doesNotMatch(route, /metadata:\s*\{[^}\n]*(?:initialPassword|password)/i);
});
