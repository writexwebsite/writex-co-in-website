import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  APPROVED_FESTIVAL_MOTIFS,
  FESTIVAL_MOTIF_LIBRARY,
  festivalMotifAuditSummary,
  getFestivalMotif
} from "../../lib/holiday/motif-library";
import {
  DEFAULT_EXPERIENCE_PACK,
  STARTER_EXPERIENCE_PACKS
} from "../../lib/holiday/packs";
import {
  HOLIDAY_STUDIO_REGIONS,
  type HolidayThemeAsset
} from "../../lib/holiday/types";
import { assetAvailabilityForPack } from "../../lib/holiday/packs";

test("professional motif library is fixed, unique and source controlled", () => {
  assert.ok(
    FESTIVAL_MOTIF_LIBRARY.length >= 40,
    "Expected a broad fixed motif library."
  );
  assert.equal(
    new Set(FESTIVAL_MOTIF_LIBRARY.map((asset) => asset.id)).size,
    FESTIVAL_MOTIF_LIBRARY.length,
    "Motif IDs must be unique."
  );
  for (const asset of FESTIVAL_MOTIF_LIBRARY) {
    assert.ok(existsSync(`public${asset.path}`), `${asset.id} is missing.`);
    assert.ok(asset.intendedObject.length >= 8);
    assert.ok(asset.supportedMotions.length >= 1);
    assert.notEqual(asset.qualityStatus, "ambiguous");
    assert.notEqual(asset.qualityStatus, "needs_replacement");
  }
  assert.equal(APPROVED_FESTIVAL_MOTIFS.length, FESTIVAL_MOTIF_LIBRARY.length);
});

test("marigolds use dense ruffled layers without an eye-like centre", () => {
  for (const id of [
    "marigold-yellow",
    "marigold-orange",
    "marigold-saffron"
  ]) {
    const asset = getFestivalMotif(id);
    assert.ok(asset);
    const source = readFileSync(`public${asset.path}`, "utf8");
    assert.ok(
      (source.match(/<ellipse/g) || []).length >= 50,
      `${id} must contain dense layered petals.`
    );
    assert.doesNotMatch(source, /fill="#(?:000|000000|111|111111)"/i);
    assert.doesNotMatch(source, /<circle[^>]+cx="120"[^>]+cy="120"/i);
  }
});

test("flower species retain their identifying anatomy", () => {
  const lotus = readFileSync(
    `public${getFestivalMotif("lotus-pink")?.path}`,
    "utf8"
  );
  const mandala = readFileSync(
    `public${getFestivalMotif("mandala-gold")?.path}`,
    "utf8"
  );
  const jasmine = readFileSync(
    `public${getFestivalMotif("jasmine-cluster")?.path}`,
    "utf8"
  );
  const hibiscus = readFileSync(
    `public${getFestivalMotif("hibiscus-red")?.path}`,
    "utf8"
  );
  const chrysanthemum = readFileSync(
    `public${getFestivalMotif("chrysanthemum-gold")?.path}`,
    "utf8"
  );
  const marigold = readFileSync(
    `public${getFestivalMotif("marigold-orange")?.path}`,
    "utf8"
  );

  assert.notEqual(lotus, mandala);
  assert.match(lotus, /natural bowl form|pink lotus/i);
  assert.match(jasmine, /leaves and buds/i);
  assert.doesNotMatch(jasmine, /snowflake/i);
  assert.match(hibiscus, /projecting stamen/i);
  assert.match(hibiscus, /stroke-linecap="round"/);
  assert.notEqual(chrysanthemum, marigold);
  assert.ok((chrysanthemum.match(/<ellipse/g) || []).length >= 70);
});

test("ceremonial objects remain structurally recognisable", () => {
  const diya = readFileSync(
    `public${getFestivalMotif("diya-brass")?.path}`,
    "utf8"
  );
  const bell = readFileSync(
    `public${getFestivalMotif("temple-bell")?.path}`,
    "utf8"
  );
  const conch = readFileSync(
    `public${getFestivalMotif("conch-shell")?.path}`,
    "utf8"
  );
  assert.match(diya, /traditional brass diya with flame/i);
  assert.doesNotMatch(diya, /<ellipse[^>]+cx="120"[^>]+cy="120"/i);
  assert.match(bell, /crown and clapper/i);
  assert.match(conch, /spiral conch/i);
});

test("Christmas characters are fixed assets with declared restrictions", () => {
  for (const id of [
    "christmas-santa-sleigh",
    "christmas-reindeer",
    "christmas-snowman"
  ]) {
    const asset = getFestivalMotif(id);
    assert.ok(asset);
    assert.equal(asset.visualStyle, "soft_dimensional");
    assert.equal(asset.qualityStatus, "approved_with_size_restrictions");
    assert.ok(asset.sizeRestrictions);
    const source = readFileSync(`public${asset.path}`, "utf8");
    assert.doesNotMatch(source, /<script|foreignObject|javascript:/i);
  }
});

test("every studio region and assigned motion resolves safely", () => {
  for (const pack of Object.values(STARTER_EXPERIENCE_PACKS)) {
    for (const region of HOLIDAY_STUDIO_REGIONS) {
      assert.ok(pack.studio.regions[region], `${region} is not configured.`);
      assert.ok(pack.studio.regions[region].safeFallback);
    }
    for (const assignment of pack.studio.motifAssignments) {
      const asset = getFestivalMotif(assignment.assetId);
      assert.ok(asset, `${assignment.assetId} is not in the motif library.`);
      assert.ok(
        asset.supportedMotions.includes(assignment.motion),
        `${assignment.motion} is not valid for ${assignment.assetId}.`
      );
    }
    assert.equal(pack.studio.qualityGate.approvedAssetsOnly, true);
    assert.equal(pack.studio.qualityGate.ambiguityReviewRequired, true);
  }
});

test("uploaded asset availability rejects ambiguous quality states", () => {
  const baseAsset: HolidayThemeAsset = {
    id: "asset-1",
    role: "hero_art",
    variant: "default",
    safeFileName: "hero.svg",
    mimeType: "image/svg+xml",
    fileSize: 1024,
    checksumSha256: null,
    durationSeconds: null,
    status: "active",
    reviewStatus: "approved",
    qualityStatus: "ambiguous",
    versionNumber: 1,
    previousAssetId: null,
    intendedObject: "Hero ornament",
    intendedFestival: "Custom",
    assetCategory: "decorative",
    visualStyle: "Founder uploaded",
    sizeRestrictions: null,
    usageLocations: ["hero"],
    isFallback: false,
    approvedAt: null,
    createdAt: new Date(0).toISOString()
  };
  const states = assetAvailabilityForPack({
    assets: [baseAsset],
    level: "enhanced",
    soundAvailable: false
  });
  assert.ok(states.includes("awaiting_approval"));
  assert.ok(states.includes("fallback_only"));
  assert.ok(!states.includes("ready_to_activate"));
});

test("public and admin code enforce quality review and twelve studio tabs", () => {
  const publicSerializer = readFileSync("lib/holiday/public.ts", "utf8");
  const repository = readFileSync("lib/holiday/repository.ts", "utf8");
  const admin = readFileSync(
    "components/admin/HolidayThemeCommandCentre.tsx",
    "utf8"
  );
  assert.match(publicSerializer, /approved_with_size_restrictions/);
  assert.match(repository, /clarity_confirmation_at/);
  assert.match(repository, /asset_marked_ambiguous/);
  assert.match(repository, /asset_replacement_requested/);
  for (const tab of [
    "overview",
    "regions",
    "motifs",
    "header",
    "hero",
    "characters",
    "motion",
    "sound",
    "login",
    "accessibility",
    "preview",
    "schedule"
  ]) {
    assert.match(admin, new RegExp(`id: "${tab}"`));
  }
});

test("asset audit classifies every replaced placeholder explicitly", () => {
  const summary = festivalMotifAuditSummary();
  assert.equal(summary.total, FESTIVAL_MOTIF_LIBRARY.length);
  assert.ok(summary.replace >= 15);
  assert.ok(summary.improve >= 10);
  assert.equal(summary.remove, 0);
  assert.equal(DEFAULT_EXPERIENCE_PACK.studio.qualityGate.approvedAssetsOnly, true);
});
