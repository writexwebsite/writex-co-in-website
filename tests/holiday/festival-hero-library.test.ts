import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { scanFestivalZip } from "../../lib/holiday/festival-pack-scanner";

const root = process.cwd();
const libraryRoot = path.join(root, "artifacts", "festival-hero-packs", "library");
const indexPath = path.join(libraryRoot, "index.json");

test("batch hero library accounts for all supplied events and source designs", () => {
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  assert.equal(index.packs.length, 28);
  const sourceCount = index.packs.reduce(
    (total: number, pack: { sourceImageCount: number }) => total + pack.sourceImageCount,
    0,
  );
  assert.equal(sourceCount, 175);
});

test("every hero pack has the mandatory responsive assets and branding policy", () => {
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const required = [
    "master-original.png",
    "master.webp",
    "desktop-2560.webp",
    "desktop-1440.webp",
    "tablet.webp",
    "tablet-landscape.webp",
    "tablet-portrait.webp",
    "mobile-430.webp",
    "mobile-390.webp",
    "mobile-360.webp",
    "preview-desktop.webp",
    "preview-mobile.webp",
    "manifest.json",
  ];
  for (const pack of index.packs) {
    const packDir = path.join(libraryRoot, pack.slug);
    for (const filename of required) {
      assert.equal(fs.existsSync(path.join(packDir, filename)), true, `${pack.slug}/${filename}`);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(packDir, "manifest.json"), "utf8"));
    assert.equal(manifest.packType, "responsive_festival_hero");
    assert.equal(manifest.brandingPolicy.axoBrandingPreserved, true);
    assert.equal(manifest.brandingPolicy.physicalPropBrandingPreserved, true);
    assert.equal(manifest.brandingPolicy.bakedLoginUiRemoved, true);
    assert.equal(manifest.clientCompatible, true);
    assert.equal(manifest.employeeCompatible, true);
    assert.equal(manifest.activation.publicByDefault, false);
  }
});

test("generated standard pack maps one hero family to Client and Employee Login", async () => {
  const zipPath = path.join(
    libraryRoot,
    "diwali",
    "diwali-festival-hero-pack-v1.zip",
  );
  const scan = await scanFestivalZip({
    buffer: fs.readFileSync(zipPath),
    sourceFileName: path.basename(zipPath),
    requestedMode: "auto_detected",
  });
  assert.equal(scan.mode, "standard_writex");
  assert.equal(scan.manualMappingCount, 0);
  assert.equal(scan.blockedEntryCount, 0);
  assert.equal(scan.files.filter((file) => file.kind === "image").length, 3);
  for (const file of scan.files.filter((entry) => entry.kind === "image")) {
    const locations = new Set(file.suggestedMappings.map((mapping) => mapping.location));
    assert.equal(locations.has("client_login_hero"), true);
    assert.equal(locations.has("employee_login_hero"), true);
    assert.equal(file.embeddedUiState, "no_embedded_ui");
  }
  assert.equal(scan.completenessFlags.includes("ready_to_activate"), true);
});

test("Hero Library exposes explicit targets without introducing a second form", () => {
  const component = fs.readFileSync(
    path.join(root, "components", "admin", "FestivalHeroLibrary.tsx"),
    "utf8",
  );
  const route = fs.readFileSync(
    path.join(
      root,
      "app",
      "api",
      "admin",
      "website-experience",
      "festival-packs",
      "[packId]",
      "route.ts",
    ),
    "utf8",
  );
  const renderer = fs.readFileSync(
    path.join(root, "components", "auth", "DesignerLoginThemeRenderer.tsx"),
    "utf8",
  );
  assert.match(component, /Client Login/);
  assert.match(component, /Employee Login/);
  assert.match(component, /Apply to Both/);
  assert.match(component, /Restore Default Hero/);
  assert.match(component, /Repeat yearly/);
  assert.doesNotMatch(component, /<form\b/);
  assert.match(route, /targets:/);
  assert.doesNotMatch(renderer, /<form\b/);
});
