import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { canManageAiGovernance } from "@/lib/admin/permissions";
import type { AdminSession } from "@/lib/auth";

const read = (path: string) => readFile(path, "utf8");
const session = (role: AdminSession["role"]): AdminSession => ({ kind: "admin", adminUserId: "00000000-0000-4000-8000-000000000001", email: "admin@example.test", role, mustChangePassword: false });

test("only Website Super Admin controls the AI governance master", () => {
  assert.equal(canManageAiGovernance(session("super_admin")), true);
  for (const role of ["sales", "support", "accounts", "viewer"] as const) assert.equal(canManageAiGovernance(session(role)), false);
});

test("Sales Academy governance migration locks all monetary ceilings", async () => {
  const sql = await read("database/migrations/20260818_ai_governance_control_plane.sql");
  assert.match(sql, /4000, 4500, 5000, 50/);
  assert.match(sql, /master_ceiling_inr <= 5000/);
  assert.match(sql, /provider_hard_limit_usd <= 50/);
  assert.match(sql, /higher_capability_fallback_enabled = false/);
  assert.match(sql, /gpt-5\.6-luna/);
  assert.match(sql, /reasoning_effort = 'none'/);
  assert.match(sql, /max_primary_calls_per_event = 1/);
  assert.doesNotMatch(sql, /gpt-4\.1-mini|gpt-5\.4-mini|gpt-5\.6-(terra|sol)/);
  assert.match(sql, /array\[70,85,95,100\]/);
});

test("central usage ingestion stores metadata without prompts or secrets", async () => {
  const repository = await read("lib/ai-governance/repository.ts");
  const client = await read("lib/employees/academy-client.ts");
  assert.match(client, /signedAcademyRequest/);
  assert.match(client, /x-writex-signature/);
  assert.match(repository, /ai_usage_ledger/);
  assert.match(repository, /application_session_id/);
  assert.match(repository, /visible_customer_bubbles/);
  assert.doesNotMatch(repository + client, /prompt_text|response_text|OPENAI_API_KEY/);
});

test("the Founder-approved model is centralised while versioned pricing stays outside code policy", async () => {
  const policy = await read("lib/ai-governance/policy.ts");
  const repository = await read("lib/ai-governance/repository.ts");
  const pricingMigration = await read("database/migrations/20260818_ai_pricing_capacity.sql");
  assert.match(policy, /gpt-5\.6-luna/);
  assert.match(policy, /reasoningEffort: "none"/);
  assert.match(policy, /maxPrimaryCallsPerEvent: 1/);
  assert.doesNotMatch(policy, /UsdPerMillionTokens/);
  assert.match(pricingMigration, /select 'SHORT'::text context_tier, 0\.20::numeric input_rate, 0\.02::numeric cached_rate/);
  assert.match(pricingMigration, /select 'LONG', 0\.40, 0\.04, 0\.50, 1\.80/);
  assert.match(pricingMigration, /long_context_threshold_tokens/);
  assert.match(pricingMigration, /272000/);
  assert.doesNotMatch(policy, /gpt-5\.4-mini|gpt-5\.6-(terra|sol)|modelId: "gpt-5\.6"/);
  assert.match(repository, /salesAcademyAiPolicy/);
  assert.match(repository, /provider: "OPENAI"/);
  assert.match(repository, /product\.provider !== "OPENAI"/);
  assert.match(repository, /as usage_day/);
  assert.doesNotMatch(repository, /::text day,/);
  assert.match(repository, /occurred_at = excluded\.occurred_at/);
  assert.match(repository, /to_char\(max\(occurred_at\) at time zone 'UTC'/);
  assert.doesNotMatch(repository, /occurred_at\?\.toISOString/);
});

test("pricing correction preserves raw telemetry and separates local from provider cost", async () => {
  const migration = await read("database/migrations/20260818_ai_pricing_capacity.sql");
  const repository = await read("lib/ai-governance/repository.ts");
  assert.match(migration, /local_estimated_cost_usd/);
  assert.match(migration, /provider_reported_cost_usd/);
  assert.match(migration, /reconciliation_variance_usd/);
  assert.match(repository, /pricingForInput/);
  assert.match(repository, /providerCostUsd === null/);
  assert.doesNotMatch(repository, /provider_reported_cost_usd\s*=\s*excluded\.estimated/);
});

test("training capacity planner distinguishes messages, paid events and visible bubbles", async () => {
  const migration = await read("database/migrations/20260818_ai_pricing_capacity.sql");
  const ui = await read("components/admin/AiGovernanceControlPlane.tsx");
  assert.match(migration, /25, 26, 2, 45, 60, 50, 75, 100/);
  assert.match(ui, /AI Training Capacity/);
  assert.match(ui, /BDE messages sent/);
  assert.match(ui, /Paid AI response events/);
  assert.match(ui, /Visible customer bubbles/);
  assert.match(ui, /confidence estimate/);
});

test("multiple SuperAdmins are assignable while the unique Primary uses the central audited workflow", async () => {
  const repository = await read("lib/ai-governance/repository.ts");
  const employeeUi = await read("components/admin/EmployeeControlPlane.tsx");
  assert.match(repository, /application_role='SUPER_ADMIN'/);
  assert.match(repository, /academy_primary_superadmin_assigned/);
  assert.match(repository, /academy_primary_superadmin_transferred/);
  assert.doesNotMatch(repository, /set application_role='EMPLOYEE'.*oldId/);
  assert.match(employeeUi, /<option value="SUPER_ADMIN">SuperAdmin<\/option>/);
  assert.match(employeeUi, /Multiple SuperAdmins are allowed/);
  assert.match(employeeUi, /Primary SuperAdmin/);
});

test("primary Academy administrator change requires an explicit confirmation", async () => {
  const ui = await read("components/admin/AiGovernanceControlPlane.tsx");
  const route = await read("app/api/admin/ai-governance/primary-superadmin/route.ts");
  assert.match(ui, /PRIMARY SUPERADMIN ALREADY ASSIGNED/);
  assert.match(ui, /Transfer Primary SuperAdmin/);
  assert.match(ui, /old Primary remains a SuperAdmin/);
  assert.match(route, /confirmTransfer/);
  assert.match(route, /reason/);
  assert.match(ui, /Confirm change/);
  assert.match(ui, /Cancel/);
});
