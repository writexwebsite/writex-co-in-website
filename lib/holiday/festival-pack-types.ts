import type { FestivalAssetPlacement, FestivalAssetPurpose } from "./asset-governance-types";
import type { HolidayAssetRole, HolidayThemeCategory } from "./types";

export const FESTIVAL_PACK_PREVIEW_COOKIE = "writex_festival_pack_preview";
export const FESTIVAL_PACK_PREVIEW_MAX_AGE_SECONDS = 60 * 60;

export const FESTIVAL_PACK_MODES = [
  "standard_writex",
  "legacy_designer",
  "auto_detected",
  "manual_mapping"
] as const;

export type FestivalPackMode = (typeof FESTIVAL_PACK_MODES)[number];

export const FESTIVAL_PACK_STATES = [
  "uploaded",
  "validated",
  "mapping_required",
  "ready_for_review",
  "approved",
  "scheduled",
  "active",
  "previous",
  "archived",
  "rejected"
] as const;

export type FestivalPackState = (typeof FESTIVAL_PACK_STATES)[number];

export const FESTIVAL_PACK_FILE_KINDS = [
  "image",
  "audio",
  "design_tokens",
  "manifest",
  "design_reference",
  "unsafe",
  "ignored"
] as const;

export type FestivalPackFileKind = (typeof FESTIVAL_PACK_FILE_KINDS)[number];

export const FESTIVAL_PACK_MAPPING_LOCATIONS = [
  "client_login_hero",
  "client_login_background",
  "client_login_form_skin",
  "employee_login_hero",
  "employee_login_background",
  "employee_login_form_skin",
  "homepage_hero",
  "website_background",
  "header_decoration",
  "footer_decoration",
  "axo_asset",
  "logo",
  "sound",
  "palette_source",
  "reference_only",
  "ignore"
] as const;

export type FestivalPackMappingLocation =
  (typeof FESTIVAL_PACK_MAPPING_LOCATIONS)[number];

export const FESTIVAL_PACK_MAPPING_LABELS: Record<
  FestivalPackMappingLocation,
  string
> = {
  client_login_hero: "Client Login Hero",
  client_login_background: "Client Login Background",
  client_login_form_skin: "Client Login Form Skin",
  employee_login_hero: "Employee Login Hero",
  employee_login_background: "Employee Login Background",
  employee_login_form_skin: "Employee Login Form Skin",
  homepage_hero: "Homepage Hero",
  website_background: "Website Background",
  header_decoration: "Header Decoration",
  footer_decoration: "Footer Decoration",
  axo_asset: "Axo Asset",
  logo: "Logo",
  sound: "Sound",
  palette_source: "Palette Source",
  reference_only: "Reference Only",
  ignore: "Ignore"
};

export const FESTIVAL_PACK_RESPONSIVE_VARIANTS = [
  "desktop",
  "tablet",
  "mobile",
  "four_three",
  "wide",
  "ultrawide",
  "light",
  "dark",
  "default"
] as const;

export type FestivalPackResponsiveVariant =
  (typeof FESTIVAL_PACK_RESPONSIVE_VARIANTS)[number];

export type FestivalPackMapping = {
  location: FestivalPackMappingLocation;
  variant: FestivalPackResponsiveVariant;
};

export type FestivalPackCompletenessFlag =
  | "complete"
  | "missing_mobile_assets"
  | "missing_dark_variant"
  | "missing_login_hero"
  | "missing_website_decorations"
  | "missing_audio"
  | "manual_mapping_required"
  | "flat_mockup_only"
  | "ready_to_activate";

export type ScannedFestivalPackFile = {
  archivePath: string;
  safeFileName: string;
  kind: FestivalPackFileKind;
  mimeType: string | null;
  compressedSize: number;
  uncompressedSize: number;
  width: number | null;
  height: number | null;
  hasAlpha: boolean | null;
  responsiveVariant: FestivalPackResponsiveVariant;
  detectedClassification: string;
  confidence: number;
  reasons: string[];
  suggestedMappings: FestivalPackMapping[];
  inspectionStatus:
    | "validated"
    | "reference_only"
    | "manual_mapping_required"
    | "rejected_unsafe"
    | "ignored";
  rejectionReason: string | null;
  checksumSha256: string | null;
  embeddedUiState:
    | "needs_review"
    | "contains_embedded_ui"
    | "no_embedded_ui";
  buffer?: Buffer;
  parsedJson?: Record<string, unknown> | null;
};

export type FestivalPackScanResult = {
  mode: FestivalPackMode;
  manifest: Record<string, unknown> | null;
  files: ScannedFestivalPackFile[];
  entryCount: number;
  safeAssetCount: number;
  blockedEntryCount: number;
  manualMappingCount: number;
  completenessFlags: FestivalPackCompletenessFlag[];
};

export type FestivalPackFileRecord = Omit<
  ScannedFestivalPackFile,
  "buffer" | "parsedJson"
> & {
  id: string;
  approvedMappings: FestivalPackMapping[];
  extractedS3Key: string | null;
  libraryAssetId: string | null;
  assetVersionId: string | null;
};

export type FestivalPackRecord = {
  id: string;
  themeId: string;
  themeName: string;
  packageName: string;
  packageMode: FestivalPackMode;
  packageVersion: number;
  manifest: Record<string, unknown> | null;
  state: FestivalPackState;
  originalFileName: string;
  originalZipSize: number;
  completenessFlags: FestivalPackCompletenessFlag[];
  sourceEntryCount: number;
  safeAssetCount: number;
  blockedEntryCount: number;
  manualMappingCount: number;
  clientLoginEnabled: boolean;
  employeeLoginEnabled: boolean;
  homepageEnabled: boolean;
  previousPackId: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  repeatYearly: boolean;
  importedAt: string;
  approvedAt: string | null;
  activatedAt: string | null;
  files: FestivalPackFileRecord[];
};

export function isResponsiveFestivalHeroPack(pack: FestivalPackRecord) {
  return pack.manifest?.packType === "responsive_festival_hero";
}

export type FestivalHeroGroupRecord = {
  id: string;
  festivalName: string;
  festivalSlug: string;
  sourceStatus: "ready" | "source_required";
  sourceMessage: string | null;
  defaultVariantSlug: string | null;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
};

export function festivalSlugForPack(pack: FestivalPackRecord) {
  const value = pack.manifest?.festivalSlug;
  return typeof value === "string" && value.trim()
    ? value.trim()
    : typeof pack.manifest?.slug === "string"
      ? pack.manifest.slug
      : pack.id;
}

export function festivalNameForPack(pack: FestivalPackRecord) {
  const value = pack.manifest?.festivalName || pack.manifest?.eventName;
  return typeof value === "string" && value.trim() ? value.trim() : pack.themeName;
}

export function variantSlugForPack(pack: FestivalPackRecord) {
  const value = pack.manifest?.variantSlug;
  return typeof value === "string" && value.trim() ? value.trim() : "default";
}

export function variantNameForPack(pack: FestivalPackRecord) {
  const value = pack.manifest?.variantName;
  return typeof value === "string" && value.trim() ? value.trim() : "Default Variant";
}

export type FestivalPackSnapshot = {
  packs: FestivalPackRecord[];
  heroGroups: FestivalHeroGroupRecord[];
  themes: Array<{
    id: string;
    name: string;
    festivalType: HolidayThemeCategory;
    status: string;
  }>;
  generatedAt: string;
};

export function mappingToAssetContract(
  mappings: FestivalPackMapping[]
): {
  role: HolidayAssetRole;
  purpose: FestivalAssetPurpose;
  placements: FestivalAssetPlacement[];
} {
  const locations = new Set(mappings.map((mapping) => mapping.location));
  if (locations.has("sound")) {
    return { role: "audio", purpose: "audio", placements: ["audio"] };
  }
  if (locations.has("header_decoration")) {
    return {
      role: "header",
      purpose: "header_decoration",
      placements: ["header_decoration_rail"]
    };
  }
  if (locations.has("footer_decoration")) {
    return {
      role: "decorative_overlay",
      purpose: "footer_decoration",
      placements: ["footer_accent"]
    };
  }
  if (locations.has("axo_asset")) {
    return {
      role: "axo",
      purpose: "axo_reference",
      placements: ["axo_theme_reference"]
    };
  }
  if (locations.has("logo")) {
    return {
      role: "logo_overlay",
      purpose: "design_reference_only",
      placements: ["private_reference"]
    };
  }

  const placements: FestivalAssetPlacement[] = [];
  for (const mapping of mappings) {
    const mobile = mapping.variant === "mobile";
    if (
      mapping.location === "client_login_hero" ||
      mapping.location === "client_login_background" ||
      mapping.location === "client_login_form_skin"
    ) {
      placements.push(mobile ? "client_login_mobile" : "client_login_desktop");
    } else if (
      mapping.location === "employee_login_hero" ||
      mapping.location === "employee_login_background" ||
      mapping.location === "employee_login_form_skin"
    ) {
      placements.push(
        mobile ? "employee_login_mobile" : "employee_login_desktop"
      );
    } else if (mapping.location === "homepage_hero") {
      placements.push("homepage_hero");
    } else if (mapping.location === "website_background") {
      placements.push("homepage_background");
    } else if (mapping.location === "palette_source") {
      placements.push("palette_source");
    } else if (mapping.location === "reference_only") {
      placements.push("private_reference");
    }
  }

  const uniquePlacements = [...new Set(placements)];
  const loginLocations = [...locations].filter((location) =>
    location.includes("_login_")
  );
  if (loginLocations.length > 0) {
    return {
      role: "login_background",
      purpose: "client_employee_login",
      placements: uniquePlacements.length
        ? uniquePlacements
        : ["private_reference"]
    };
  }
  if (locations.has("homepage_hero")) {
    return {
      role: "hero_art",
      purpose: "homepage_hero_artwork",
      placements: uniquePlacements
    };
  }
  if (locations.has("website_background")) {
    return {
      role: "decorative_overlay",
      purpose: "homepage_background",
      placements: uniquePlacements
    };
  }
  return {
    role: "reference_image",
    purpose: "design_reference_only",
    placements: uniquePlacements.length
      ? uniquePlacements
      : ["private_reference"]
  };
}
