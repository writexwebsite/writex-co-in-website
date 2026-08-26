import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { scanFestivalZip } from "../../lib/holiday/festival-pack-scanner";

const root = process.cwd();
const libraryRoot = path.join(root, "artifacts", "festival-hero-pilot", "library");
const pilotIndex = JSON.parse(
  fs.readFileSync(path.join(libraryRoot, "pilot-index.json"), "utf8")
);

test("pilot preserves all supplied designs as distinct variants", () => {
  assert.equal(pilotIndex.groups.length, 3);
  const counts = Object.fromEntries(
    pilotIndex.groups.map((group: { slug: string; variantCount: number }) => [
      group.slug,
      group.variantCount
    ])
  );
  assert.deepEqual(counts, {
    "independence-day": 4,
    holi: 0,
    christmas: 12
  });
  assert.equal(
    pilotIndex.groups.reduce(
      (total: number, group: { variantCount: number }) => total + group.variantCount,
      0
    ),
    16
  );
});

test("Holi is source-blocked instead of receiving fabricated artwork", () => {
  const holi = pilotIndex.groups.find((group: { slug: string }) => group.slug === "holi");
  assert.equal(holi.sourceStatus, "source_required");
  assert.equal(holi.variants.length, 0);
  assert.match(holi.sourceMessage, /does not contain an approved Holi bitmap source/i);
});

test("each available pilot variant owns complete responsive assets and branding policy", () => {
  const required = [
    "master.webp",
    "desktop-large.webp",
    "desktop.webp",
    "tablet-landscape.webp",
    "tablet.webp",
    "tablet-820.webp",
    "tablet-768.webp",
    "mobile-large.webp",
    "mobile.webp",
    "mobile-compact.webp",
    "preview-desktop.webp",
    "preview-mobile.webp",
    "manifest.json"
  ];
  for (const group of pilotIndex.groups) {
    for (const variant of group.variants) {
      const variantRoot = path.join(libraryRoot, group.slug, variant.slug);
      for (const filename of required) {
        assert.equal(
          fs.existsSync(path.join(variantRoot, filename)),
          true,
          `${group.slug}/${variant.slug}/${filename}`
        );
      }
      const manifest = JSON.parse(
        fs.readFileSync(path.join(variantRoot, "manifest.json"), "utf8")
      );
      assert.equal(manifest.festivalSlug, group.slug);
      assert.equal(manifest.variantSlug, variant.slug);
      assert.equal(manifest.responsiveAssets.length, 12);
      assert.deepEqual(manifest.compatibleTargets, ["client", "employee", "both"]);
      assert.equal(manifest.brandingPolicy.embeddedUiRemoved, true);
      assert.equal(manifest.brandingPolicy.axoBrandingPreserved, true);
      assert.equal(manifest.brandingPolicy.physicalPropBrandingPreserved, true);
      assert.equal(manifest.activation.publicByDefault, false);
    }
  }
});

test("pilot variant ZIP maps to both login targets without embedded UI", async () => {
  const variant = pilotIndex.groups.find(
    (group: { slug: string }) => group.slug === "independence-day"
  ).variants[0];
  const zipPath = path.join(libraryRoot, "independence-day", variant.package);
  const scan = await scanFestivalZip({
    buffer: fs.readFileSync(zipPath),
    sourceFileName: path.basename(zipPath),
    requestedMode: "auto_detected"
  });
  assert.equal(scan.manualMappingCount, 0);
  assert.equal(scan.blockedEntryCount, 0);
  assert.equal(scan.files.filter((file) => file.kind === "image").length, 3);
  for (const file of scan.files.filter((entry) => entry.kind === "image")) {
    const mappings = new Set(file.suggestedMappings.map((mapping) => mapping.location));
    assert.equal(mappings.has("client_login_hero"), true);
    assert.equal(mappings.has("employee_login_hero"), true);
    assert.equal(file.embeddedUiState, "no_embedded_ui");
  }
});

test("Admin Hero Library implements festival then thumbnail variant selection", () => {
  const component = fs.readFileSync(
    path.join(root, "components", "admin", "FestivalHeroLibrary.tsx"),
    "utf8"
  );
  assert.match(component, /Festival hero groups/);
  assert.match(component, /Festival variants/);
  assert.match(component, /variantNameForPack/);
  assert.match(component, /Client Login Preview/);
  assert.match(component, /Employee Login Preview/);
  assert.match(component, /Apply to Both/);
  assert.match(component, /source required/i);
  assert.doesNotMatch(component, /<form\b/);
});
