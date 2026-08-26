import type {
  FestivalAssetLibrarySnapshot,
  FestivalAssetVersion
} from "./asset-governance-types";
import type { FestivalPackSnapshot } from "./festival-pack-types";
import type { HolidayExperienceStudioConfig } from "./types";

export const FESTIVAL_PREVIEW_SNAPSHOT_COOKIE =
  "writex_festival_preview_snapshot";

export const FESTIVAL_STUDIO_SLOTS = [
  "clientLoginHero",
  "employeeLoginHero",
  "websiteHero",
  "header",
  "axo",
  "background",
  "sound"
] as const;

export type FestivalStudioSlot = (typeof FESTIVAL_STUDIO_SLOTS)[number];

export const FESTIVAL_HERO_SURFACES = [
  "websiteHero",
  "clientLoginHero",
  "employeeLoginHero"
] as const;

export type FestivalHeroSurface = (typeof FESTIVAL_HERO_SURFACES)[number];

export const FESTIVAL_CANONICAL_ASSET_TYPES = [
  "client_login_canvas",
  "employee_login_canvas",
  "shared_login_canvas",
  "client_login_mobile_canvas",
  "employee_login_mobile_canvas",
  "form_decorative_overlay",
  "website_hero",
  "website_background",
  "header_decoration",
  "footer_decoration",
  "announcement_banner",
  "inner_page_motif",
  "axo_character",
  "axo_costume",
  "axo_prop",
  "axo_motion",
  "garland",
  "bell",
  "diya",
  "lantern",
  "flower",
  "mandala",
  "cultural_symbol",
  "decorative_pattern",
  "sound",
  "motion_preset",
  "desktop_fallback",
  "tablet_fallback",
  "mobile_fallback",
  "light_variant",
  "dark_variant",
  "reduced_motion_variant"
] as const;

export type FestivalCanonicalAssetType =
  (typeof FESTIVAL_CANONICAL_ASSET_TYPES)[number];

export const FESTIVAL_STUDIO_SLOT_LABELS: Record<FestivalStudioSlot, string> = {
  clientLoginHero: "Client Login Hero",
  employeeLoginHero: "Employee Login Hero",
  websiteHero: "Website Hero",
  header: "Header Decoration",
  axo: "Axo",
  background: "Background",
  sound: "Sound"
};

export type FestivalStudioAssetSummary = {
  id: string;
  libraryAssetId: string | null;
  safeFileName: string;
  mimeType: string;
  role: string;
  status: string;
  reviewStatus: string;
  qualityStatus: string;
  lifecycleState: string;
  versionNumber: number;
  createdAt: string;
};

export type FestivalSnapshotSummary = {
  id: string;
  previewSnapshotId: string | null;
  configurationId: string;
  festivalSlug: string;
  festivalName: string;
  variantPackId: string;
  variantSlug: string;
  variantName: string;
  variantVersion: number;
  targetSurfaces: FestivalHeroSurface[];
  surfaceVariants: Partial<
    Record<
      FestivalHeroSurface,
      {
        packId: string;
        variantSlug: string;
        variantName: string;
        variantVersion: number;
      }
    >
  >;
  configurationHash: string;
  previousSnapshotId: string | null;
  activatedAt: string;
};

export type FestivalPreviewSnapshotSummary = {
  id: string;
  configurationId: string;
  festivalSlug: string;
  variantPackId: string;
  variantSlug: string;
  variantName: string;
  variantVersion: number;
  targetSurfaces: FestivalHeroSurface[];
  configurationHash: string;
  createdAt: string;
  expiresAt: string;
};

export type FestivalStudioDiagnosticStatus =
  | "active"
  | "assigned"
  | "draft"
  | "missing"
  | "failed"
  | "normal_writex_website"
  | "invalid_legacy_assignment"
  | "blocked";

export type FestivalStudioDiagnostic = {
  slot: FestivalStudioSlot;
  status: FestivalStudioDiagnosticStatus;
  explanation: string;
  fix: "configure" | "activate" | "enable" | "replace" | null;
};

export type FestivalStudioConfiguration = {
  id: string;
  festivalGroupId: string | null;
  festivalSlug: string;
  festivalName: string;
  themeId: string | null;
  selectedVariantPackId: string | null;
  selectedVariantSlug: string | null;
  assets: Record<FestivalStudioSlot, FestivalStudioAssetSummary | null>;
  motionConfig: { enabled: boolean; level: "none" | "subtle" | "standard" };
  protectedLoginBrand: {
    placement: "safe_auto" | "upper_left" | "compact_top";
    size: "compact" | "standard";
    lightContrast: "soft_glass" | "text_shadow";
    darkContrast: "soft_glass" | "text_shadow";
  };
  studioConfig: HolidayExperienceStudioConfig;
  clientLoginEnabled: boolean;
  employeeLoginEnabled: boolean;
  websiteEnabled: boolean;
  axoEnabled: boolean;
  soundEnabled: boolean;
  startAt: string | null;
  endAt: string | null;
  repeatYearly: boolean;
  activationStatus:
    | "draft"
    | "ready"
    | "scheduled"
    | "active"
    | "paused"
    | "incomplete";
  version: number;
  updatedBy: string | null;
  updatedAt: string;
  diagnostics: FestivalStudioDiagnostic[];
};

export type FestivalStudioHistory = {
  id: string;
  configurationId: string;
  version: number;
  state: string;
  action: string;
  changedBy: string | null;
  createdAt: string;
};

export type FestivalStudioSnapshot = {
  simplifiedNoticeDismissed: boolean;
  configurations: FestivalStudioConfiguration[];
  activeConfiguration: FestivalStudioConfiguration | null;
  upcomingConfigurations: FestivalStudioConfiguration[];
  packLibrary: FestivalPackSnapshot;
  assetLibrary: FestivalAssetLibrarySnapshot;
  history: FestivalStudioHistory[];
  activeSnapshot: FestivalSnapshotSummary | null;
  previousPublicSnapshot: FestivalSnapshotSummary | null;
  latestPreviewSnapshots: FestivalPreviewSnapshotSummary[];
  permissions: {
    canEdit: boolean;
    canActivate: boolean;
    readOnly: boolean;
  };
};

const slotRoleCompatibility: Record<FestivalStudioSlot, ReadonlySet<string>> = {
  clientLoginHero: new Set([
    "login_desktop",
    "login_mobile",
    "login_background"
  ]),
  employeeLoginHero: new Set([
    "login_desktop",
    "login_mobile",
    "login_background"
  ]),
  websiteHero: new Set(["hero_art"]),
  header: new Set(["header"]),
  axo: new Set(["axo", "axo_animation"]),
  background: new Set(["homepage_background", "decorative_overlay"]),
  sound: new Set(["audio"])
};

export function isFestivalStudioRoleCompatible(
  slot: FestivalStudioSlot,
  role: string,
  mimeType: string
) {
  if (slot === "sound") {
    return mimeType.startsWith("audio/") && slotRoleCompatibility.sound.has(role);
  }
  return mimeType.startsWith("image/") && slotRoleCompatibility[slot].has(role);
}

export function isFestivalStudioImageAsset(asset: FestivalAssetVersion) {
  return asset.mimeType.startsWith("image/");
}
