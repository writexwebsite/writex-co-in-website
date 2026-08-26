import {
  FESTIVAL_MOTIF_LIBRARY,
  type FestivalMotifDefinition
} from "./motif-library";
import type {
  HolidayExperienceStudioConfig,
  HolidayStudioAssignmentSourceMode,
  HolidayStudioMotion,
  HolidayStudioMotifAssignment,
  HolidayStudioRegion,
  HolidayStudioVisibility
} from "./types";

export const FESTIVAL_DECORATION_ASSET_TYPES = [
  "header_motif",
  "header_pack",
  "ground_motif",
  "ground_composition",
  "footer_composition",
  "axo_accessory",
  "axo_prop",
  "ambient_effect",
  "feature_effect"
] as const;

export type FestivalDecorationAssetType =
  (typeof FESTIVAL_DECORATION_ASSET_TYPES)[number];

export const COMPLETE_FESTIVAL_DECORATION_TYPES = [
  "header_pack",
  "ground_composition",
  "footer_composition",
  "axo_accessory",
  "axo_prop",
  "ambient_effect",
  "feature_effect"
] as const;

export type CompleteFestivalDecorationType =
  (typeof COMPLETE_FESTIVAL_DECORATION_TYPES)[number];

export const FESTIVAL_PACK_COMPONENT_SLOTS = [
  "full_width",
  "left",
  "centre",
  "right",
  "repeat",
  "axo_anchor",
  "viewport"
] as const;

export type FestivalPackComponentSlot =
  (typeof FESTIVAL_PACK_COMPONENT_SLOTS)[number];

export type FestivalDecorationPackComponent = {
  id: string;
  assetId: string;
  assetVersion: number;
  assetType: FestivalDecorationAssetType;
  region: HolidayStudioRegion;
  slot: FestivalPackComponentSlot;
  layer: number;
  size: "small" | "medium" | "large";
  motion: HolidayStudioMotion;
  visibility: HolidayStudioVisibility;
  lightMode: "approved";
  darkMode: "approved";
  reducedMotion: "static";
  libraryAssetId?: string;
  assetVersionId?: string;
  previewPath?: string;
};

export type FestivalDecorationPackManifest = {
  id: string;
  version: number;
  displayName: string;
  festivalSlugs: string[];
  type: CompleteFestivalDecorationType;
  targetRegion: HolidayStudioRegion;
  components: FestivalDecorationPackComponent[];
  desktopPlacement: "rail" | "edge" | "footer" | "axo" | "viewport";
  tabletPlacement: "rail" | "edge" | "footer" | "axo" | "viewport";
  mobilePlacement: "simplified" | "hidden" | "axo" | "viewport_reduced";
  motion: HolidayStudioMotion;
  reducedMotion: "static";
  approvalState: "approved";
  provenance: "writex-reviewed-built-in-v2" | "writex-governed-library";
  checksum: string;
  recommended: boolean;
  availableForSelection?: boolean;
};

export const CANONICAL_DECORATION_FESTIVALS = [
  "bhogali-bihu",
  "chhath-puja",
  "childrens-day",
  "christmas",
  "diwali",
  "durga-puja",
  "dussehra",
  "eid",
  "fathers-day",
  "gandhi-jayanti",
  "ganesh-chaturthi",
  "guru-nanak-jayanti",
  "halloween",
  "independence-day",
  "international-yoga-day",
  "kati-bihu",
  "mothers-day",
  "new-year",
  "onam",
  "pongal",
  "raksha-bandhan",
  "rath-yatra",
  "republic-day",
  "rongali-bihu",
  "saraswati-puja",
  "st-patricks-day",
  "thaipusam",
  "valentines-day"
] as const;

export type CanonicalDecorationFestival =
  (typeof CANONICAL_DECORATION_FESTIVALS)[number];

const festivalAssetAliases: Record<string, string[]> = {
  eid: ["eid", "eid-al-fitr", "eid-al-adha"]
};

export function decorationAssetFestivalSlugs(festivalSlug: string) {
  return festivalAssetAliases[festivalSlug] || [festivalSlug];
}

function visible(mobile = true): HolidayStudioVisibility {
  return { desktop: true, tablet: true, mobile };
}

function component(
  id: string,
  assetId: string,
  assetType: FestivalDecorationAssetType,
  region: HolidayStudioRegion,
  slot: FestivalPackComponentSlot,
  motion: HolidayStudioMotion,
  layer: number,
  size: "small" | "medium" | "large" = "medium",
  mobile = true
): FestivalDecorationPackComponent {
  return {
    id,
    assetId,
    assetVersion: 2,
    assetType,
    region,
    slot,
    layer,
    size,
    motion,
    visibility: visible(mobile),
    lightMode: "approved",
    darkMode: "approved",
    reducedMotion: "static"
  };
}

function manifest(
  id: string,
  displayName: string,
  festivalSlugs: string[],
  type: CompleteFestivalDecorationType,
  targetRegion: HolidayStudioRegion,
  components: FestivalDecorationPackComponent[],
  motion: HolidayStudioMotion = "static"
): FestivalDecorationPackManifest {
  const placement = type === "header_pack"
    ? "rail"
    : type === "ground_composition"
      ? "edge"
      : type === "footer_composition"
        ? "footer"
        : type === "axo_accessory" || type === "axo_prop"
          ? "axo"
          : "viewport";
  return {
    id,
    version: 1,
    displayName,
    festivalSlugs,
    type,
    targetRegion,
    components,
    desktopPlacement: placement,
    tabletPlacement: placement,
    mobilePlacement:
      placement === "axo"
        ? "axo"
        : placement === "viewport"
          ? "viewport_reduced"
          : "simplified",
    motion,
    reducedMotion: "static",
    approvalState: "approved",
    provenance: "writex-reviewed-built-in-v2",
    checksum: `built-in-v2:${id}:1`,
    recommended: true,
    availableForSelection: true
  };
}

function preserveLegacyPack(
  pack: FestivalDecorationPackManifest
): FestivalDecorationPackManifest {
  return {
    ...pack,
    recommended: false,
    availableForSelection: false
  };
}

const header = (
  slug: string,
  name: string,
  parts: Array<[string, FestivalPackComponentSlot, HolidayStudioMotion, boolean?]>
) => manifest(
  `${slug}-header-pack`,
  `${name} Complete Header Pack`,
  [slug],
  "header_pack",
  "navigation_rail",
  parts.map(([assetId, slot, motion, mobile], index) =>
    component(
      `header-${index + 1}`,
      assetId,
      "header_motif",
      "navigation_rail",
      slot,
      motion,
      20 + index,
      slot === "full_width" ? "large" : "medium",
      mobile ?? (slot === "centre" || slot === "full_width")
    )
  ),
  parts[0]?.[2] || "static"
);

const ground = (
  slug: string,
  name: string,
  parts: Array<[string, FestivalPackComponentSlot, HolidayStudioMotion, boolean?]>
) => manifest(
  `${slug}-ground-composition`,
  `${name} Complete Ground Composition`,
  [slug],
  "ground_composition",
  "footer_decoration",
  parts.map(([assetId, slot, motion, mobile], index) =>
    component(
      `ground-${index + 1}`,
      assetId,
      "ground_motif",
      "footer_decoration",
      slot,
      motion,
      30 + index,
      slot === "centre" ? "large" : "medium",
      mobile ?? slot === "centre"
    )
  ),
  parts[0]?.[2] || "static"
);

const footer = (
  slug: string,
  name: string,
  assetOrParts: string | Array<[
    string,
    FestivalPackComponentSlot,
    HolidayStudioMotion,
    boolean?
  ]>,
  motion: HolidayStudioMotion = "static"
) => manifest(
  `${slug}-footer-composition`,
  `${name} Complete Footer Composition`,
  [slug],
  "footer_composition",
  "section_dividers",
  typeof assetOrParts === "string"
    ? [component("footer-1", assetOrParts, "ground_motif", "section_dividers", "full_width", motion, 40, "large")]
    : assetOrParts.map(([assetId, slot, itemMotion, mobile], index) =>
        component(
          `footer-${index + 1}`,
          assetId,
          "ground_motif",
          "section_dividers",
          slot,
          itemMotion,
          40 + index,
          slot === "centre" ? "large" : "medium",
          mobile ?? slot === "centre"
        )
      ),
  motion
);

const axo = (slug: string, name: string, assetId: string) => manifest(
  `${slug}-axo-accessory`,
  `${name} AXO Accessory`,
  [slug],
  "axo_accessory",
  "axo_area",
  [component("axo-1", assetId, "axo_accessory", "axo_area", "axo_anchor", "axo_interaction", 50, "medium")],
  "axo_interaction"
);

const effect = (
  slug: string,
  name: string,
  type: "ambient_effect" | "feature_effect",
  assetId: string,
  motion: HolidayStudioMotion
) => manifest(
  `${slug}-${type.replaceAll("_", "-")}`,
  `${name} ${type === "ambient_effect" ? "Ambient Effect" : "Feature Effect"}`,
  [slug],
  type,
  type === "ambient_effect" ? "page_ambience" : "floating_edges",
  [component(
    type === "ambient_effect" ? "ambient-1" : "feature-1",
    assetId,
    type,
    type === "ambient_effect" ? "page_ambience" : "floating_edges",
    "viewport",
    motion,
    type === "ambient_effect" ? 10 : 60,
    "large"
  )],
  motion
);

const independencePremiumGround = manifest(
  "independence-day-premium-ground-composition",
  "Independence Day Premium Ground Composition",
  ["independence-day"],
  "ground_composition",
  "footer_decoration",
  [component(
    "ground-horizon",
    "independence-ground-horizon",
    "ground_motif",
    "footer_decoration",
    "full_width",
    "static",
    30,
    "large",
    true
  )]
);

const independencePremiumFooter = manifest(
  "independence-day-premium-footer-composition",
  "Independence Day Premium Footer Composition",
  ["independence-day"],
  "footer_composition",
  "section_dividers",
  [component(
    "footer-divider",
    "independence-section-divider",
    "ground_motif",
    "section_dividers",
    "full_width",
    "static",
    40,
    "large",
    true
  )]
);

export const FESTIVAL_DECORATION_PACKS: FestivalDecorationPackManifest[] = [
  header("christmas", "Christmas", [
    ["pine-cone-branch", "left", "gentle_wind", false],
    ["mistletoe-sprig", "centre", "gentle_wind", true],
    ["holly-sprig", "right", "gentle_wind", false]
  ]),
  ground("christmas", "Christmas", [
    ["christmas-gift-stack", "left", "static", false],
    ["christmas-tree", "centre", "twinkling", true],
    ["christmas-snowman", "right", "floating", false]
  ]),
  footer("christmas", "Christmas", [
    ["pine-cone-branch", "left", "gentle_wind", false],
    ["mistletoe-sprig", "centre", "gentle_wind", true],
    ["holly-sprig", "right", "gentle_wind", false]
  ], "gentle_wind"),
  axo("christmas", "Christmas", "axo-christmas-hat"),
  effect("christmas", "Christmas", "ambient_effect", "christmas-snowflake", "snowfall"),
  effect("christmas", "Christmas", "feature_effect", "christmas-santa-sleigh", "reindeer_journey"),

  header("diwali", "Diwali", [["marigold-mango-toran", "full_width", "garland_sway", true]]),
  ground("diwali", "Diwali", [
    ["diya-brass", "left", "glowing", false],
    ["rangoli-diya", "centre", "glowing", true],
    ["diya-brass", "right", "glowing", false]
  ]),
  footer("diwali", "Diwali", "diya-row", "glowing"),
  axo("diwali", "Diwali", "axo-diwali-scarf"),
  effect("diwali", "Diwali", "ambient_effect", "safe-firework-gold", "glowing"),
  effect("diwali", "Diwali", "feature_effect", "safe-firework-gold", "firework_sky"),

  header("durga-puja", "Durga Puja", [["marigold-mango-toran", "full_width", "garland_sway", true]]),
  ground("durga-puja", "Durga Puja", [
    ["marigold-orange", "left", "petal_fall", false],
    ["alpana-bengal", "centre", "static", true],
    ["marigold-yellow", "right", "petal_fall", false]
  ]),
  footer("durga-puja", "Durga Puja", "marigold-garland", "garland_sway"),
  axo("durga-puja", "Durga Puja", "axo-durga-puja"),
  effect("durga-puja", "Durga Puja", "ambient_effect", "chrysanthemum-gold", "petal_fall"),

  header("dussehra", "Dussehra", [["marigold-garland", "full_width", "garland_sway", true]]),
  ground("dussehra", "Dussehra", [
    ["marigold-orange", "left", "static", false],
    ["temple-bell", "centre", "bell_swing", true],
    ["marigold-yellow", "right", "static", false]
  ]),
  footer("dussehra", "Dussehra", "marigold-garland", "garland_sway"),

  header("eid", "Eid", [
    ["crescent-star-lantern", "left", "lantern_float", false],
    ["crescent-star-lantern", "centre", "glowing", true],
    ["crescent-star-lantern", "right", "lantern_float", false]
  ]),
  ground("eid", "Eid", [
    ["crescent-star-lantern", "left", "static", false],
    ["kandil-lantern", "centre", "glowing", true],
    ["crescent-star-lantern", "right", "static", false]
  ]),
  effect("eid", "Eid", "ambient_effect", "kandil-lantern", "lantern_float"),

  header("holi", "Holi", [["holi-colour-ribbon", "full_width", "gentle_wind", true]]),
  ground("holi", "Holi", [
    ["holi-edge-splash", "left", "powder_splash", false],
    ["palash-branch", "centre", "gentle_wind", true],
    ["holi-edge-splash", "right", "powder_splash", false]
  ]),
  footer("holi", "Holi", "holi-colour-ribbon", "gentle_wind"),
  axo("holi", "Holi", "axo-holi-pichkari"),
  effect("holi", "Holi", "ambient_effect", "holi-gulal-cloud", "colour_burst"),
  effect("holi", "Holi", "feature_effect", "holi-pichkari", "colour_burst"),

  header("independence-day", "Independence Day", [["tricolour-ribbon", "full_width", "gentle_wind", true]]),
  preserveLegacyPack(ground("independence-day", "Independence Day", [
    ["tricolour-kite", "left", "kite_flight", false],
    ["tricolour-kite", "centre", "kite_flight", true],
    ["tricolour-kite", "right", "kite_flight", false]
  ])),
  independencePremiumGround,
  preserveLegacyPack(footer("independence-day", "Independence Day", "tricolour-ribbon", "gentle_wind")),
  independencePremiumFooter,
  axo("independence-day", "Independence Day", "axo-independence-flag"),
  effect("independence-day", "Independence Day", "ambient_effect", "tricolour-kite", "kite_flight"),
  effect("independence-day", "Independence Day", "feature_effect", "tricolour-kite", "kite_flight"),

  header("republic-day", "Republic Day", [["tricolour-ribbon", "full_width", "gentle_wind", true]]),
  ground("republic-day", "Republic Day", [
    ["tricolour-kite", "left", "kite_flight", false],
    ["tricolour-kite", "centre", "kite_flight", true],
    ["tricolour-kite", "right", "kite_flight", false]
  ]),
  footer("republic-day", "Republic Day", "tricolour-ribbon", "gentle_wind"),
  effect("republic-day", "Republic Day", "ambient_effect", "tricolour-kite", "kite_flight"),

  header("onam", "Onam", [["marigold-garland", "full_width", "garland_sway", true]]),
  ground("onam", "Onam", [
    ["jasmine-cluster", "left", "gentle_wind", false],
    ["marigold-yellow", "centre", "petal_fall", true],
    ["jasmine-cluster", "right", "gentle_wind", false]
  ]),
  footer("onam", "Onam", "marigold-garland", "garland_sway"),
  effect("onam", "Onam", "ambient_effect", "jasmine-cluster", "petal_fall"),

  header("ganesh-chaturthi", "Ganesh Chaturthi", [["marigold-mango-toran", "full_width", "garland_sway", true]]),

  header("new-year", "New Year", [
    ["pine-cone-branch", "left", "gentle_wind", false],
    ["pine-cone-branch", "centre", "gentle_wind", true],
    ["pine-cone-branch", "right", "gentle_wind", false]
  ]),
  ground("new-year", "New Year", [
    ["christmas-gift-stack", "left", "static", false],
    ["christmas-snowman", "centre", "floating", true],
    ["christmas-gift-stack", "right", "static", false]
  ]),
  effect("new-year", "New Year", "ambient_effect", "christmas-snowflake", "snowfall"),
  effect("new-year", "New Year", "feature_effect", "safe-firework-gold", "firework_sky")
];

export function decorationPacksForFestival(festivalSlug: string) {
  return FESTIVAL_DECORATION_PACKS.filter((pack) =>
    pack.festivalSlugs.includes(festivalSlug) &&
    pack.availableForSelection !== false
  );
}

const governedPackRegionTypes: Partial<
  Record<HolidayStudioRegion, CompleteFestivalDecorationType>
> = {
  navigation_rail: "header_pack",
  footer_decoration: "ground_composition",
  section_dividers: "footer_composition",
  axo_area: "axo_accessory",
  page_ambience: "ambient_effect",
  floating_edges: "feature_effect"
};

function governedPackPlacement(
  type: CompleteFestivalDecorationType
): FestivalDecorationPackManifest["desktopPlacement"] {
  if (type === "header_pack") return "rail";
  if (type === "ground_composition") return "edge";
  if (type === "footer_composition") return "footer";
  if (type === "axo_accessory" || type === "axo_prop") return "axo";
  return "viewport";
}

function governedPackSlot(
  type: CompleteFestivalDecorationType
): FestivalPackComponentSlot {
  if (type === "axo_accessory" || type === "axo_prop") return "axo_anchor";
  if (type === "ambient_effect" || type === "feature_effect") return "viewport";
  return "full_width";
}

export function governedDecorationPacksForFestival(
  assets: FestivalMotifDefinition[],
  festivalSlug: string
): FestivalDecorationPackManifest[] {
  return assets.flatMap((asset) => {
    if (
      asset.source !== "governed" ||
      !asset.completeComposition ||
      !asset.libraryAssetId ||
      !asset.assetVersionId ||
      !asset.intendedFestivals.includes(festivalSlug)
    ) {
      return [];
    }
    const regions = (asset.supportedRegions || []).filter(
      (region): region is HolidayStudioRegion => region in governedPackRegionTypes
    );
    return regions.flatMap((region) => {
      const type = governedPackRegionTypes[region];
      if (!type) return [];
      const placement = governedPackPlacement(type);
      const motion =
        asset.supportedMotions.find((item) => item !== "static") || "static";
      return [{
        id: `governed-composition-${asset.assetVersionId}-${region}`,
        version: asset.assetVersionNumber || 1,
        displayName: asset.name,
        festivalSlugs: [festivalSlug],
        type,
        targetRegion: region,
        components: [{
          id: `governed-${asset.assetVersionId}-${region}`,
          assetId: asset.id,
          assetVersion: asset.assetVersionNumber || 1,
          assetType: type,
          region,
          slot: governedPackSlot(type),
          layer: type === "ambient_effect" ? 10 : type === "feature_effect" ? 60 : 30,
          size: "large",
          motion,
          visibility: visible(true),
          lightMode: "approved",
          darkMode: "approved",
          reducedMotion: "static",
          libraryAssetId: asset.libraryAssetId,
          assetVersionId: asset.assetVersionId,
          previewPath: asset.path
        }],
        desktopPlacement: placement,
        tabletPlacement: placement,
        mobilePlacement:
          placement === "axo"
            ? "axo"
            : placement === "viewport"
              ? "viewport_reduced"
              : "simplified",
        motion,
        reducedMotion: "static",
        approvalState: "approved",
        provenance: "writex-governed-library",
        checksum: asset.checksumSha256 || `governed:${asset.assetVersionId}`,
        recommended: true
      } satisfies FestivalDecorationPackManifest];
    });
  });
}

export function decorationPackById(packId: string, version?: number) {
  return FESTIVAL_DECORATION_PACKS.find(
    (pack) => pack.id === packId && (version === undefined || pack.version === version)
  ) || null;
}

export function decorationPackSupportsFestival(
  pack: FestivalDecorationPackManifest,
  festivalSlug: string
) {
  return pack.festivalSlugs.includes(festivalSlug);
}

export function isDecorationPackComponentValid(
  pack: FestivalDecorationPackManifest,
  assignment: HolidayStudioMotifAssignment
) {
  const item = pack.components.find(
    (candidate) => candidate.id === assignment.decorationComponentId
  );
  return Boolean(
    item &&
      item.assetId === assignment.assetId &&
      item.region === assignment.region &&
      item.slot === assignment.componentSlot &&
      item.assetVersion === assignment.decorationComponentVersion
  );
}

function assignmentId(packId: string, componentId: string) {
  return `${packId}-${componentId}`.slice(0, 80);
}

export function applyDecorationPackToStudio(
  current: HolidayExperienceStudioConfig,
  pack: FestivalDecorationPackManifest,
  sourceMode: Exclude<HolidayStudioAssignmentSourceMode, "legacy_inactive">
) {
  const targetRegions = [...new Set(pack.components.map((item) => item.region))];
  const retained = current.motifAssignments.filter(
    (assignment) => !targetRegions.includes(assignment.region)
  );
  const assignments: HolidayStudioMotifAssignment[] = pack.components.map((item) => ({
    id: assignmentId(pack.id, item.id),
    assetId: item.assetId,
    sourceMode,
    ...(item.assetVersionId && item.libraryAssetId
      ? {
          libraryAssetId: item.libraryAssetId,
          assetVersionId: item.assetVersionId
        }
      : {
          decorationPackId: pack.id,
          decorationPackVersion: pack.version,
          decorationComponentId: item.id,
          decorationComponentVersion: item.assetVersion,
          decorationType: pack.type,
          componentSlot: item.slot
        }),
    region: item.region,
    enabled: true,
    size: item.size,
    density: current.density,
    motion: item.motion,
    layer: item.layer,
    visibility: item.visibility,
    religiousArtworkApproved: true
  }));
  const regions = { ...current.regions };
  for (const region of targetRegions) {
    const first = pack.components.find((item) => item.region === region)!;
    regions[region] = {
      ...regions[region],
      enabled: true,
      assetPackId: pack.id,
      intensity: "medium",
      motion: first.motion,
      visibility: { desktop: true, tablet: true, mobile: true },
      safeFallback: "default_writex"
    };
  }
  const activeMotions = synchroniseDecorationPackMotions(
    current,
    [...retained, ...assignments]
  );
  return {
    ...current,
    regions,
    motifAssignments: [...retained, ...assignments],
    activeMotions,
    motionSourceMode: activeMotions.length > 0 ? sourceMode : "none"
  } satisfies HolidayExperienceStudioConfig;
}

export function synchroniseDecorationPackMotions(
  current: HolidayExperienceStudioConfig,
  nextAssignments: HolidayStudioMotifAssignment[]
) {
  const previousPackMotions = new Set(
    current.motifAssignments
      .filter(
        (assignment) =>
          (assignment.decorationPackId || assignment.assetVersionId) &&
          assignment.motion !== "static"
      )
      .map((assignment) => assignment.motion)
  );
  const manualMotions = current.activeMotions.filter(
    (motion) => motion !== "static" && !previousPackMotions.has(motion)
  );
  const nextPackMotions = nextAssignments
    .filter(
      (assignment) =>
        assignment.enabled &&
        (assignment.decorationPackId || assignment.assetVersionId) &&
        assignment.motion !== "static"
    )
    .map((assignment) => assignment.motion);
  return [...new Set([...manualMotions, ...nextPackMotions])];
}

export function applyRecommendedDecorationPacks(
  current: HolidayExperienceStudioConfig,
  festivalSlug: string
) {
  return decorationPacksForFestival(festivalSlug)
    .filter((pack) => pack.recommended)
    .reduce(
      (studio, pack) => applyDecorationPackToStudio(studio, pack, "recommended"),
      current
    );
}

export function festivalDecorationCoverage() {
  return CANONICAL_DECORATION_FESTIVALS.map((festivalSlug) => {
    const packs = decorationPacksForFestival(festivalSlug);
    const types = COMPLETE_FESTIVAL_DECORATION_TYPES.filter((type) =>
      packs.some((pack) => pack.type === type)
    );
    return {
      festivalSlug,
      status: packs.length > 0 ? "ready" as const : "source_required" as const,
      packCount: packs.length,
      types,
      missingTypes: COMPLETE_FESTIVAL_DECORATION_TYPES.filter(
        (type) => !types.includes(type)
      )
    };
  });
}

export function validateDecorationPackRegistry() {
  const motifIds = new Set(FESTIVAL_MOTIF_LIBRARY.map((item) => item.id));
  const allowedPresentations: Partial<Record<HolidayStudioRegion, string[]>> = {
    navigation_rail: ["garland", "toran", "border", "corner", "cluster"],
    footer_decoration: ["border", "cluster", "scene", "single", "corner"],
    section_dividers: ["border", "garland", "toran", "cluster", "single", "corner"],
    floating_edges: ["single", "cluster", "corner", "overlay", "scene"],
    axo_area: ["axo"]
  };
  const packIds = new Set<string>();
  const errors: string[] = [];
  for (const pack of FESTIVAL_DECORATION_PACKS) {
    if (packIds.has(pack.id)) errors.push(`Duplicate pack id: ${pack.id}`);
    packIds.add(pack.id);
    if (pack.components.length === 0) errors.push(`${pack.id} has no components.`);
    for (const item of pack.components) {
      if (!motifIds.has(item.assetId)) errors.push(`${pack.id} references missing ${item.assetId}.`);
      if (item.region !== pack.targetRegion) errors.push(`${pack.id} has a cross-region component.`);
      const motif = FESTIVAL_MOTIF_LIBRARY.find((candidate) => candidate.id === item.assetId);
      if (!motif || !item.motion || !motif.supportedMotions.includes(item.motion)) {
        errors.push(`${pack.id}/${item.id} has an unsupported motion.`);
      }
      const presentations = allowedPresentations[item.region];
      if (motif && presentations && !presentations.includes(motif.presentation)) {
        errors.push(`${pack.id}/${item.id} is incompatible with ${item.region}.`);
      }
      if (!pack.festivalSlugs.some((slug) =>
        decorationAssetFestivalSlugs(slug).some((alias) => motif?.intendedFestivals.includes(alias))
      )) {
        errors.push(`${pack.id}/${item.id} is not festival compatible.`);
      }
    }
  }
  return errors;
}
