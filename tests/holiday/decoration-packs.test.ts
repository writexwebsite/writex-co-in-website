import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_DECORATION_FESTIVALS,
  FESTIVAL_DECORATION_PACKS,
  applyDecorationPackToStudio,
  decorationPacksForFestival,
  festivalDecorationCoverage,
  governedDecorationPacksForFestival,
  validateDecorationPackRegistry
} from "../../lib/holiday/decoration-packs";
import { normalizeFestivalStudioScene } from "../../lib/holiday/canonical-scene";
import { FESTIVAL_MOTIF_LIBRARY } from "../../lib/holiday/motif-library";
import { DEFAULT_EXPERIENCE_PACK } from "../../lib/holiday/packs";

test("all 28 canonical festival groups receive an explicit decoration coverage decision", () => {
  const coverage = festivalDecorationCoverage();
  assert.equal(coverage.length, 28);
  assert.equal(new Set(coverage.map((item) => item.festivalSlug)).size, 28);
  assert.deepEqual(
    coverage.map((item) => item.festivalSlug),
    [...CANONICAL_DECORATION_FESTIVALS]
  );
  for (const item of coverage) {
    assert.ok(item.status === "ready" || item.status === "source_required");
    if (item.status === "source_required") assert.equal(item.packCount, 0);
  }
  assert.equal(
    coverage.find((item) => item.festivalSlug === "childrens-day")?.status,
    "source_required"
  );
});

test("complete decoration pack registry is approved, festival compatible and fully resolvable", () => {
  assert.deepEqual(validateDecorationPackRegistry(), []);
  assert.equal(
    new Set(FESTIVAL_DECORATION_PACKS.map((pack) => pack.id)).size,
    FESTIVAL_DECORATION_PACKS.length
  );
  for (const pack of FESTIVAL_DECORATION_PACKS) {
    assert.equal(pack.approvalState, "approved");
    assert.equal(pack.reducedMotion, "static");
    assert.ok(pack.components.length > 0);
    for (const component of pack.components) {
      assert.ok(FESTIVAL_MOTIF_LIBRARY.some((asset) => asset.id === component.assetId));
      assert.equal(component.region, pack.targetRegion);
      assert.equal(component.assetVersion, 2);
    }
  }
});

test("a complete Header Pack is never a single tiny motif", () => {
  for (const pack of FESTIVAL_DECORATION_PACKS.filter((item) => item.type === "header_pack")) {
    const singleWideComponent = pack.components.length === 1
      ? FESTIVAL_MOTIF_LIBRARY.find((asset) => asset.id === pack.components[0].assetId)
      : null;
    assert.ok(
      pack.components.length >= 3 ||
        ["border", "garland", "toran"].includes(singleWideComponent?.presentation || ""),
      `${pack.id} must be a composed rail or a reviewed full-width asset.`
    );
    assert.ok(pack.components.every((item) => item.region === "navigation_rail"));
  }
});

test("applying a pack saves exact versioned components and enables only its compatible region", () => {
  const pack = decorationPacksForFestival("independence-day").find(
    (item) => item.type === "ground_composition"
  );
  assert.ok(pack);
  const base = structuredClone(DEFAULT_EXPERIENCE_PACK.studio);
  const next = applyDecorationPackToStudio(base, pack, "custom");
  const assigned = next.motifAssignments.filter(
    (item) => item.decorationPackId === pack.id
  );
  assert.equal(assigned.length, pack.components.length);
  assert.ok(assigned.every((item) => item.decorationPackVersion === pack.version));
  assert.ok(assigned.every((item) => item.decorationComponentId));
  assert.ok(assigned.every((item) => item.decorationComponentVersion === 2));
  assert.ok(assigned.every((item) => item.componentSlot));
  assert.equal(next.regions.footer_decoration.enabled, true);
  assert.equal(next.regions.footer_decoration.assetPackId, pack.id);
});

test("Independence Day legacy ground pack remains resolvable but hidden from new selection", () => {
  const pack = FESTIVAL_DECORATION_PACKS.find(
    (item) => item.id === "independence-day-ground-composition"
  );
  assert.ok(pack);
  assert.equal(pack.version, 1);
  assert.deepEqual(
    pack.components.map((component) => [component.id, component.assetId, component.slot]),
    [
      ["ground-1", "tricolour-kite", "left"],
      ["ground-2", "tricolour-kite", "centre"],
      ["ground-3", "tricolour-kite", "right"]
    ]
  );
  assert.equal(pack.availableForSelection, false);
  assert.ok(!decorationPacksForFestival("independence-day").includes(pack));
});

test("Independence Day selectable packs use premium full-width Ground and Footer compositions", () => {
  const packs = decorationPacksForFestival("independence-day");
  const ground = packs.find(
    (item) => item.id === "independence-day-premium-ground-composition"
  );
  const footer = packs.find(
    (item) => item.id === "independence-day-premium-footer-composition"
  );
  assert.ok(ground && footer);
  assert.deepEqual(
    ground.components.map((component) => [component.assetId, component.slot, component.motion]),
    [["independence-ground-horizon", "full_width", "static"]]
  );
  assert.deepEqual(
    footer.components.map((component) => [component.assetId, component.slot, component.motion]),
    [["independence-section-divider", "full_width", "static"]]
  );
  assert.ok(packs.every((pack) => pack.availableForSelection !== false));
});

test("complete custom packs outrank recommended packs and loose custom motifs", () => {
  const recommended = decorationPacksForFestival("diwali").find(
    (item) => item.type === "header_pack"
  );
  const custom = decorationPacksForFestival("durga-puja").find(
    (item) => item.type === "header_pack"
  );
  assert.ok(recommended && custom);
  const base = structuredClone(DEFAULT_EXPERIENCE_PACK.studio);
  const withRecommended = applyDecorationPackToStudio(base, recommended, "recommended");
  const withLoose = {
    ...withRecommended,
    motifAssignments: [
      ...withRecommended.motifAssignments,
      {
        ...withRecommended.motifAssignments[0],
        id: "loose-custom-header-motif",
        assetId: "marigold-garland",
        sourceMode: "custom" as const,
        decorationPackId: undefined,
        decorationPackVersion: undefined,
        decorationComponentId: undefined,
        decorationComponentVersion: undefined,
        decorationType: undefined,
        componentSlot: undefined
      }
    ]
  };
  const withCustom = applyDecorationPackToStudio(withLoose, custom, "custom");
  const canonical = normalizeFestivalStudioScene(withCustom);
  const active = canonical.motifAssignments.filter(
    (item) => item.enabled && item.region === "navigation_rail"
  );
  assert.ok(active.length > 0);
  assert.ok(active.every((item) => item.decorationPackId === custom.id));
});

test("switching complete packs removes stale pack motion from the same region", () => {
  const christmas = decorationPacksForFestival("christmas").find(
    (item) => item.type === "ambient_effect"
  );
  const diwali = decorationPacksForFestival("diwali").find(
    (item) => item.type === "ambient_effect"
  );
  assert.ok(christmas && diwali);
  const base = structuredClone(DEFAULT_EXPERIENCE_PACK.studio);
  const withChristmas = applyDecorationPackToStudio(base, christmas, "custom");
  assert.ok(withChristmas.activeMotions.includes("snowfall"));
  const withDiwali = applyDecorationPackToStudio(withChristmas, diwali, "custom");
  assert.ok(!withDiwali.activeMotions.includes("snowfall"));
  assert.ok(withDiwali.activeMotions.includes("glowing"));
});

test("approved governed full compositions become exact-version complete packs", () => {
  const packs = governedDecorationPacksForFestival([{
    id: "governed-version",
    name: "Annual Report Executive Header Pack",
    category: "light_fire",
    intendedObject: "Annual Report Executive Header Pack",
    intendedFestivals: ["annual-report-season"],
    path: "/api/website-experience/assets/version-id?route=%2F",
    presentation: "border",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "glowing"],
    qualityStatus: "approved",
    sizeRestrictions: null,
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "keep",
    reviewNote: "Founder approved.",
    source: "governed",
    libraryAssetId: "library-id",
    assetVersionId: "version-id",
    assetVersionNumber: 3,
    checksumSha256: "checksum",
    supportedRegions: ["navigation_rail"],
    completeComposition: true
  }], "annual-report-season");
  assert.equal(packs.length, 1);
  assert.equal(packs[0].type, "header_pack");
  assert.equal(packs[0].provenance, "writex-governed-library");
  const next = applyDecorationPackToStudio(
    structuredClone(DEFAULT_EXPERIENCE_PACK.studio),
    packs[0],
    "recommended"
  );
  const assignment = next.motifAssignments.find(
    (item) => item.assetVersionId === "version-id"
  );
  assert.ok(assignment);
  assert.equal(assignment.libraryAssetId, "library-id");
  assert.equal(assignment.decorationPackId, undefined);
  assert.equal(assignment.decorationType, undefined);
  assert.equal(assignment.componentSlot, undefined);
  assert.equal(next.regions.navigation_rail.enabled, true);
});

test("governed loose motifs are never promoted as complete packs", () => {
  const packs = governedDecorationPacksForFestival([{
    id: "governed-loose",
    name: "Single header icon",
    category: "light_fire",
    intendedObject: "Single header icon",
    intendedFestivals: ["annual-report-season"],
    path: "/api/website-experience/assets/version-id?route=%2F",
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static"],
    qualityStatus: "approved",
    sizeRestrictions: null,
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "keep",
    reviewNote: "Founder approved.",
    source: "governed",
    libraryAssetId: "library-id",
    assetVersionId: "version-id",
    supportedRegions: ["navigation_rail"],
    completeComposition: false
  }], "annual-report-season");
  assert.deepEqual(packs, []);
});
