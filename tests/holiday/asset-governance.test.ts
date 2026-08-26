import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  defaultPlacementsForPurpose,
  placementPublicRole
} from "../../lib/holiday/asset-governance-types";

test("reference uploads are private by default", () => {
  assert.deepEqual(defaultPlacementsForPurpose("design_reference_only"), [
    "private_reference"
  ]);
  assert.equal(
    placementPublicRole({ placement: "private_reference", route: "/" }),
    null
  );
});

test("client and employee login placements resolve independently", () => {
  assert.equal(
    placementPublicRole({
      placement: "client_login_desktop",
      route: "/client-login"
    }),
    "login_desktop"
  );
  assert.equal(
    placementPublicRole({
      placement: "client_login_desktop",
      route: "/employee-login"
    }),
    null
  );
  assert.equal(
    placementPublicRole({
      placement: "employee_login_mobile",
      route: "/employee-login"
    }),
    "login_mobile"
  );
  assert.equal(
    placementPublicRole({
      placement: "employee_login_mobile",
      route: "/client-login"
    }),
    null
  );
});

test("website placements are explicit and route scoped", () => {
  assert.equal(
    placementPublicRole({ placement: "homepage_hero", route: "/" }),
    "hero_art"
  );
  assert.equal(
    placementPublicRole({ placement: "homepage_hero", route: "/about-us" }),
    null
  );
  assert.equal(
    placementPublicRole({
      placement: "inner_page_accent",
      route: "/about-us"
    }),
    "inner_page"
  );
  assert.equal(
    placementPublicRole({ placement: "footer_accent", route: "/pricing" }),
    "footer"
  );
});

test("migration preserves versions and implements retention-aware deletion", () => {
  const migration = readFileSync(
    "database/migrations/20260729_festival_asset_governance.sql",
    "utf8"
  );
  assert.match(migration, /create table if not exists festival_asset_library/i);
  assert.match(migration, /create table if not exists festival_asset_assignments/i);
  assert.match(migration, /create table if not exists festival_asset_audit/i);
  assert.match(migration, /previous_asset_id/i);
  assert.match(migration, /retention_until/i);
  assert.match(migration, /legacy_asset_recovered/i);
  assert.doesNotMatch(migration, /delete\s+from\s+holiday_theme_assets/i);
});

test("normal archive no longer deletes private storage", () => {
  const route = readFileSync(
    "app/api/admin/website-experience/assets/route.ts",
    "utf8"
  );
  const deleteHandler = route.slice(route.indexOf("export async function DELETE"));
  assert.match(deleteHandler, /setFestivalAssetLifecycle/);
  assert.doesNotMatch(deleteHandler, /await deleteFile/);
});

test("expired administrators are rejected before private storage writes", () => {
  const route = readFileSync(
    "app/api/admin/website-experience/assets/route.ts",
    "utf8"
  );
  const postHandler = route.slice(
    route.indexOf("export async function POST"),
    route.indexOf("export async function PATCH")
  );
  assert.ok(
    postHandler.indexOf("await assertActiveAdminActor") <
      postHandler.indexOf("await uploadFile")
  );

  const libraryRoute = readFileSync(
    "app/api/admin/website-experience/asset-library/route.ts",
    "utf8"
  );
  assert.match(libraryRoute, /await assertActiveAdminActor/);
});

test("asset library exposes assignment, replacement and recovery controls", () => {
  const component = readFileSync(
    "components/admin/FestivalAssetLibrary.tsx",
    "utf8"
  );
  const labels = readFileSync(
    "lib/holiday/asset-governance-types.ts",
    "utf8"
  );
  for (const label of [
    "Design Reference Only",
    "Assign Asset",
    "Replace Everywhere",
    "Replace Only Selected Assignments",
    "Keep Both as Separate Assets",
    "Version History",
    "Move to Trash",
    "Permanently Delete",
    "Client → Employee",
    "Employee → Client"
  ]) {
    assert.match(
      `${component}\n${labels}`,
      new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }
  assert.match(component, /PERMANENTLY DELETE FESTIVAL ASSET/);
  assert.match(component, /I authorise deletion before the retention date/);
});

test("public rendering requires governance assignments", () => {
  const publicMapper = readFileSync("lib/holiday/public.ts", "utf8");
  assert.match(publicMapper, /asset\.libraryAssetId/);
  assert.match(publicMapper, /placementPublicRole/);
  assert.match(publicMapper, /mappedRoles\.length === 0/);
});
