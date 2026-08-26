import type { HolidayAssetRole } from "./types";

export const FESTIVAL_ASSET_PURPOSES = [
  "design_reference_only",
  "homepage_hero_artwork",
  "homepage_background",
  "header_decoration",
  "hero_decoration",
  "inner_page_decoration",
  "footer_decoration",
  "client_login_background",
  "employee_login_background",
  "client_employee_login",
  "axo_reference",
  "announcement_banner",
  "multiple_locations",
  "library_unassigned",
  "audio"
] as const;

export type FestivalAssetPurpose = (typeof FESTIVAL_ASSET_PURPOSES)[number];

export const FESTIVAL_ASSET_PLACEMENTS = [
  "homepage_hero",
  "homepage_background",
  "homepage_section_background",
  "homepage_theme_source",
  "header_decoration_rail",
  "hero_foreground",
  "hero_background",
  "inner_page_accent",
  "footer_accent",
  "announcement_banner",
  "client_login_desktop",
  "client_login_mobile",
  "employee_login_desktop",
  "employee_login_mobile",
  "admin_login_desktop",
  "admin_login_mobile",
  "axo_theme_reference",
  "palette_source",
  "motif_interpretation_source",
  "private_reference",
  "audio"
] as const;

export type FestivalAssetPlacement =
  (typeof FESTIVAL_ASSET_PLACEMENTS)[number];

export const FESTIVAL_ASSET_LIFECYCLE_STATES = [
  "active",
  "archived",
  "trash",
  "deletion_pending",
  "deleted"
] as const;

export type FestivalAssetLifecycleState =
  (typeof FESTIVAL_ASSET_LIFECYCLE_STATES)[number];

export const FESTIVAL_ASSET_VERSION_STATES = [
  "current",
  "previous",
  "archived",
  "rejected",
  "restored",
  "deleted_pending_retention",
  "deleted"
] as const;

export type FestivalAssetVersionState =
  (typeof FESTIVAL_ASSET_VERSION_STATES)[number];

export const FESTIVAL_ASSET_ASSIGNMENT_STATES = [
  "pending_approval",
  "active",
  "removed",
  "replaced"
] as const;

export type FestivalAssetAssignmentState =
  (typeof FESTIVAL_ASSET_ASSIGNMENT_STATES)[number];

export const FESTIVAL_ASSET_PURPOSE_LABELS: Record<
  FestivalAssetPurpose,
  string
> = {
  design_reference_only: "Design Reference Only",
  homepage_hero_artwork: "Homepage Hero Artwork",
  homepage_background: "Homepage Background",
  header_decoration: "Header Decoration",
  hero_decoration: "Hero Decoration",
  inner_page_decoration: "Inner-page Decoration",
  footer_decoration: "Footer Decoration",
  client_login_background: "Client Login Background",
  employee_login_background: "Employee Login Background",
  client_employee_login: "Client + Employee Login",
  axo_reference: "Axo Reference",
  announcement_banner: "Announcement Banner",
  multiple_locations: "Multiple Locations",
  library_unassigned: "Add to Library Without Assignment",
  audio: "Audio"
};

export const FESTIVAL_ASSET_PLACEMENT_LABELS: Record<
  FestivalAssetPlacement,
  string
> = {
  homepage_hero: "Homepage Hero",
  homepage_background: "Homepage Background",
  homepage_section_background: "Homepage Section Background",
  homepage_theme_source: "Full Homepage Theme Source",
  header_decoration_rail: "Header Decoration Rail",
  hero_foreground: "Hero Foreground",
  hero_background: "Hero Background",
  inner_page_accent: "Inner-page Accent",
  footer_accent: "Footer Accent",
  announcement_banner: "Announcement Banner",
  client_login_desktop: "Client Login Desktop",
  client_login_mobile: "Client Login Mobile",
  employee_login_desktop: "Employee Login Desktop",
  employee_login_mobile: "Employee Login Mobile",
  admin_login_desktop: "Admin Login Desktop",
  admin_login_mobile: "Admin Login Mobile",
  axo_theme_reference: "Axo Theme Reference",
  palette_source: "Palette Source",
  motif_interpretation_source: "Motif Interpretation Source",
  private_reference: "Private Reference Only",
  audio: "Audio"
};

export const PUBLIC_FESTIVAL_ASSET_PLACEMENTS = new Set<FestivalAssetPlacement>([
  "homepage_hero",
  "homepage_background",
  "homepage_section_background",
  "header_decoration_rail",
  "hero_foreground",
  "hero_background",
  "inner_page_accent",
  "footer_accent",
  "announcement_banner",
  "client_login_desktop",
  "client_login_mobile",
  "employee_login_desktop",
  "employee_login_mobile",
  "admin_login_desktop",
  "admin_login_mobile",
  "axo_theme_reference",
  "audio"
]);

export function defaultPlacementsForPurpose(
  purpose: FestivalAssetPurpose
): FestivalAssetPlacement[] {
  switch (purpose) {
    case "design_reference_only":
      return ["private_reference"];
    case "homepage_hero_artwork":
      return ["homepage_hero"];
    case "homepage_background":
      return ["homepage_background"];
    case "header_decoration":
      return ["header_decoration_rail"];
    case "hero_decoration":
      return ["hero_foreground"];
    case "inner_page_decoration":
      return ["inner_page_accent"];
    case "footer_decoration":
      return ["footer_accent"];
    case "client_login_background":
      return ["client_login_desktop", "client_login_mobile"];
    case "employee_login_background":
      return ["employee_login_desktop", "employee_login_mobile"];
    case "client_employee_login":
      return [
        "client_login_desktop",
        "client_login_mobile",
        "employee_login_desktop",
        "employee_login_mobile"
      ];
    case "axo_reference":
      return ["axo_theme_reference"];
    case "announcement_banner":
      return ["announcement_banner"];
    case "audio":
      return ["audio"];
    case "multiple_locations":
    case "library_unassigned":
      return [];
  }
}

export function legacyRoleToPlacement(
  role: HolidayAssetRole
): FestivalAssetPlacement {
  switch (role) {
    case "header":
      return "header_decoration_rail";
    case "homepage_background":
      return "homepage_background";
    case "inner_page":
      return "inner_page_accent";
    case "footer":
      return "footer_accent";
    case "announcement":
      return "announcement_banner";
    case "hero_art":
      return "homepage_hero";
    case "decorative_overlay":
    case "particle_overlay":
    case "supporting":
      return "inner_page_accent";
    case "login_desktop":
    case "login_background":
      return "client_login_desktop";
    case "login_mobile":
    case "mobile_fallback":
      return "client_login_mobile";
    case "axo":
    case "axo_animation":
      return "axo_theme_reference";
    case "audio":
      return "audio";
    case "reference_image":
    case "logo_overlay":
    case "reduced_motion":
      return "private_reference";
  }
}

export function placementPublicRole({
  placement,
  route
}: {
  placement: FestivalAssetPlacement;
  route: string;
}): HolidayAssetRole | null {
  if (placement === "header_decoration_rail") return "header";
  if (placement === "footer_accent") return "footer";
  if (placement === "announcement_banner") return "announcement";
  if (placement === "axo_theme_reference") return "axo";
  if (placement === "audio") return "audio";
  if (
    placement === "homepage_hero" ||
    placement === "hero_foreground"
  ) {
    return route === "/" ? "hero_art" : null;
  }
  if (
    placement === "homepage_background" ||
    placement === "homepage_section_background" ||
    placement === "homepage_theme_source" ||
    placement === "hero_background"
  ) {
    return route === "/" ? "homepage_background" : null;
  }
  if (placement === "inner_page_accent") {
    return route !== "/" &&
      !["/client-login", "/employee-login", "/admin/login"].includes(route)
      ? "inner_page"
      : null;
  }
  if (placement.startsWith("client_login_")) {
    if (route !== "/client-login") return null;
    return placement.endsWith("mobile") ? "login_mobile" : "login_desktop";
  }
  if (placement.startsWith("employee_login_")) {
    if (route !== "/employee-login") return null;
    return placement.endsWith("mobile") ? "login_mobile" : "login_desktop";
  }
  if (placement.startsWith("admin_login_")) {
    if (route !== "/admin/login") return null;
    return placement.endsWith("mobile") ? "login_mobile" : "login_desktop";
  }
  return null;
}

export type FestivalAssetAssignment = {
  id: string;
  themeId: string;
  themeName: string;
  placement: FestivalAssetPlacement;
  state: FestivalAssetAssignmentState;
  versionAssetId: string;
  versionNumber: number;
  assignedAt: string;
  removedAt: string | null;
  isFallback: boolean;
};

export type FestivalAssetVersion = {
  id: string;
  versionNumber: number;
  state: FestivalAssetVersionState;
  safeFileName: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string | null;
  reviewStatus: string;
  qualityStatus: string;
  createdAt: string;
  previousAssetId: string | null;
  current: boolean;
  assetRole: HolidayAssetRole;
  variant: string;
  intendedFestival: string | null;
  assetCategory: string | null;
  usageLocations: string[];
  assetMetadata: Record<string, unknown>;
  integrityState: string;
  integrityCheckedAt: string | null;
  integrityNote: string | null;
};

export type FestivalAssetAuditEvent = {
  id: string;
  action: string;
  safeMetadata: Record<string, unknown>;
  actorName: string | null;
  createdAt: string;
};

export type FestivalLibraryAsset = {
  id: string;
  ownerThemeId: string | null;
  ownerThemeName: string | null;
  displayName: string;
  purpose: FestivalAssetPurpose;
  assetType: "image" | "audio";
  approvalState: string;
  lifecycleState: FestivalAssetLifecycleState;
  integrityState: string;
  integrityCheckedAt: string | null;
  integrityNote: string | null;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  currentFileName: string | null;
  currentMimeType: string | null;
  usageCount: number;
  archivedAt: string | null;
  trashedAt: string | null;
  retentionUntil: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: FestivalAssetAssignment[];
  versions: FestivalAssetVersion[];
  audit: FestivalAssetAuditEvent[];
};

export type FestivalAssetLibrarySnapshot = {
  assets: FestivalLibraryAsset[];
  themes: Array<{ id: string; name: string; status: string }>;
  retentionDays: number;
  generatedAt: string;
};
