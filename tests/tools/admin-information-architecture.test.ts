import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  adminNavigationGroups,
  getVisibleAdminNavigation
} from "../../lib/admin/navigation";

const expectedSections = [
  "Dashboard",
  "Employees",
  "Sales & Delivery",
  "Clients",
  "Hiring",
  "Verification",
  "Festival Studio",
  "System"
];

test("Super Admin navigation exposes the eight governed business sections", () => {
  const visible = getVisibleAdminNavigation({
    role: "super_admin",
    hiringEnabled: true
  });
  assert.deepEqual(visible.map((group) => group.label), expectedSections);
  assert.equal(new Set(visible.map((group) => group.href)).size, 8);
});

test("common Admin tasks stay at navigation depth two or less", () => {
  assert.equal(adminNavigationGroups.every((group) => group.items.length <= 6), true);
  assert.equal(
    adminNavigationGroups.every((group) =>
      [...group.items, ...(group.advancedItems || [])].every(
        (item) => !("items" in item) && !("children" in item)
      )
    ),
    true
  );
});

test("technical and maintenance destinations are retained under Advanced", () => {
  const advancedRoutes = new Set(
    adminNavigationGroups.flatMap((group) =>
      (group.advancedItems || []).map((item) => item.href.split(/[?#]/, 1)[0])
    )
  );
  for (const route of [
    "/admin/integration-logs",
    "/admin/storage",
    "/admin/sync-jobs",
    "/admin/system-health",
    "/admin/hiring/hrms-sync",
    "/admin/client-portal/temporary-testing"
  ]) {
    assert.equal(advancedRoutes.has(route), true, `${route} must remain reachable`);
  }
});

test("task-first dashboard and grouped record search cover the required work", async () => {
  const [dashboard, toolbar, shell] = await Promise.all([
    readFile(path.join(process.cwd(), "app/admin/dashboard/page.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/admin/AdminToolbar.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/admin/AdminShell.tsx"), "utf8")
  ]);
  for (const label of [
    "Leads needing action",
    "Follow-ups due",
    "Client requests pending",
    "Deliveries and issues",
    "Verification pending",
    "Candidates awaiting review",
    "Interviews due",
    "Festival status",
    "System alerts"
  ]) {
    assert.match(dashboard, new RegExp(label));
  }
  for (const group of [
    "Leads",
    "Clients",
    "Candidates",
    "Requests & orders",
    "Documents & references"
  ]) {
    assert.match(toolbar, new RegExp(group.replace(/[&]/g, "\\&")));
  }
  assert.match(shell, /AdminBackButton/);
  assert.match(shell, /aria-label="Breadcrumb"/);
});
