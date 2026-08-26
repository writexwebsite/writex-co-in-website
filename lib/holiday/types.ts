export type HolidayThemeStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "archived";

export type HolidayThemeMode = "manual" | "automatic";

export const HOLIDAY_THEME_CATEGORIES = [
  "national_holiday",
  "religious_festival",
  "cultural_festival",
  "global_observance",
  "company_event",
  "recruitment_campaign",
  "business_season",
  "internal_milestone",
  "custom_one_time_event"
] as const;

export type HolidayThemeCategory =
  (typeof HOLIDAY_THEME_CATEGORIES)[number] | "system_default";

export const HOLIDAY_EXPERIENCE_LEVELS = [
  "accent_only",
  "standard",
  "enhanced"
] as const;

export type HolidayExperienceLevel =
  (typeof HOLIDAY_EXPERIENCE_LEVELS)[number];

export type HolidayThemeScope =
  | "entire_public"
  | "homepage"
  | "header_only"
  | "login_screens"
  | "selected_pages";

export type HolidayAnimationLevel = "none" | "subtle" | "standard";

export const HOLIDAY_ANIMATION_PRESETS = [
  "none",
  "subtle_glow",
  "falling_particles",
  "floating_decorations",
  "header_movement",
  "colour_burst",
  "snow",
  "sparkles",
  "controlled_fireworks",
  "procession_silhouette",
  "axo_animated_prop",
  "floating_motifs",
  "falling_petals",
  "pichkari_spray",
  "garland_sway",
  "lantern_glow",
  "reindeer_movement",
  "kite_movement",
  "confetti",
  "star_field",
  "header_procession"
] as const;

export type HolidayAnimationPreset =
  (typeof HOLIDAY_ANIMATION_PRESETS)[number];

export const HOLIDAY_ANIMATION_INTENSITIES = ["low", "medium", "high"] as const;

export type HolidayAnimationIntensity =
  (typeof HOLIDAY_ANIMATION_INTENSITIES)[number];

export const HOLIDAY_HEADER_PRESETS = [
  "none",
  "spectrum_line",
  "alpana",
  "colour_powder",
  "diya_lights",
  "festive_lights",
  "tricolour_ribbon",
  "lanterns",
  "floral",
  "harvest",
  "stars",
  "milestone_ribbon",
  "campaign_bar",
  "garland_band",
  "light_strings",
  "bells",
  "vines",
  "reindeer",
  "kites",
  "diya_glow",
  "floral_trim",
  "regional_motif",
  "seasonal_silhouette"
] as const;

export type HolidayHeaderPreset = (typeof HOLIDAY_HEADER_PRESETS)[number];

export const HOLIDAY_HERO_PRESETS = [
  "none",
  "ambient_frame",
  "corner_cluster",
  "soft_tint",
  "festive_ribbon"
] as const;

export type HolidayHeroPreset = (typeof HOLIDAY_HERO_PRESETS)[number];

export const HOLIDAY_INNER_PAGE_PRESETS = [
  "none",
  "section_accents",
  "card_tint",
  "divider_motif"
] as const;

export type HolidayInnerPagePreset =
  (typeof HOLIDAY_INNER_PAGE_PRESETS)[number];

export const HOLIDAY_FOOTER_PRESETS = [
  "none",
  "accent_ribbon",
  "motif_band",
  "light_trim"
] as const;

export type HolidayFooterPreset = (typeof HOLIDAY_FOOTER_PRESETS)[number];

export const HOLIDAY_PARTICLE_PRESETS = [
  "none",
  "soft_sparkles",
  "powder_dots",
  "petals",
  "snow",
  "warm_lights",
  "stars",
  "leaves",
  "confetti",
  "lantern_glow",
  "kites",
  "colour_spray",
  "firework_sparks"
] as const;

export type HolidayParticlePreset = (typeof HOLIDAY_PARTICLE_PRESETS)[number];

export const HOLIDAY_THEME_SOURCE_MODES = [
  "reference_image",
  "asset_composition"
] as const;

export type HolidayThemeSourceMode =
  (typeof HOLIDAY_THEME_SOURCE_MODES)[number];

export const HOLIDAY_PUBLIC_ARTWORK_MODES = [
  "interpreted_motifs",
  "banner_asset"
] as const;

export type HolidayPublicArtworkMode =
  (typeof HOLIDAY_PUBLIC_ARTWORK_MODES)[number];

export const HOLIDAY_DECORATION_DENSITIES = [
  "subtle",
  "balanced",
  "rich"
] as const;

export type HolidayDecorationDensity =
  (typeof HOLIDAY_DECORATION_DENSITIES)[number];

export const HOLIDAY_PAGE_COVERAGE = [
  "homepage_only",
  "homepage_key_pages",
  "full_website"
] as const;

export type HolidayPageCoverage = (typeof HOLIDAY_PAGE_COVERAGE)[number];

export const HOLIDAY_MOTION_LEVELS = ["off", "subtle", "festive"] as const;

export type HolidayMotionLevel = (typeof HOLIDAY_MOTION_LEVELS)[number];

export const HOLIDAY_STUDIO_REGIONS = [
  "navigation_rail",
  "hero_background",
  "hero_foreground",
  "page_ambience",
  "section_dividers",
  "card_corners",
  "floating_edges",
  "axo_area",
  "announcement_strip",
  "footer_decoration",
  "client_login",
  "employee_login",
  "fullscreen_intro"
] as const;

export type HolidayStudioRegion = (typeof HOLIDAY_STUDIO_REGIONS)[number];

export const HOLIDAY_STUDIO_SOURCE_MODES = [
  "built_in_writex_pack",
  "founder_uploaded_reference",
  "founder_uploaded_complete_pack",
  "built_in_uploaded_hybrid",
  "admin_custom_pack"
] as const;

export type HolidayStudioSourceMode =
  (typeof HOLIDAY_STUDIO_SOURCE_MODES)[number];

export const HOLIDAY_STUDIO_ARTWORK_MODES = [
  "none",
  "decorative",
  "cultural",
  "character",
  "religious_approval_required",
  "founder_uploaded"
] as const;

export type HolidayStudioArtworkMode =
  (typeof HOLIDAY_STUDIO_ARTWORK_MODES)[number];

export const HOLIDAY_STUDIO_DENSITIES = [
  "clean",
  "festive",
  "celebration"
] as const;

export type HolidayStudioDensity =
  (typeof HOLIDAY_STUDIO_DENSITIES)[number];

export const HOLIDAY_STUDIO_PAGE_COVERAGE = [
  "login_only",
  "homepage_only",
  "homepage_login",
  "main_public",
  "selected_pages",
  "entire_public"
] as const;

export type HolidayStudioPageCoverage =
  (typeof HOLIDAY_STUDIO_PAGE_COVERAGE)[number];

export const HOLIDAY_STUDIO_MOTIONS = [
  "static",
  "gentle_wind",
  "floating",
  "falling",
  "glowing",
  "twinkling",
  "colour_burst",
  "powder_splash",
  "garland_sway",
  "bell_swing",
  "lantern_float",
  "snowfall",
  "firework_sky",
  "reindeer_journey",
  "gift_drop",
  "kite_flight",
  "petal_fall",
  "paper_craft_rotation",
  "axo_interaction"
] as const;

export type HolidayStudioMotion = (typeof HOLIDAY_STUDIO_MOTIONS)[number];

export type HolidayStudioVisibility = {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
};

export const HOLIDAY_STUDIO_ASSIGNMENT_SOURCE_MODES = [
  "custom",
  "recommended",
  "legacy_inactive"
] as const;

export type HolidayStudioAssignmentSourceMode =
  (typeof HOLIDAY_STUDIO_ASSIGNMENT_SOURCE_MODES)[number];

export type HolidayStudioRegionConfig = {
  enabled: boolean;
  assetPackId: string;
  intensity: "low" | "medium" | "high";
  visibility: HolidayStudioVisibility;
  motion: HolidayStudioMotion;
  safeFallback: "omit" | "static_approved" | "default_writex";
};

export type HolidayStudioMotifAssignment = {
  id: string;
  assetId: string;
  libraryAssetId?: string;
  assetVersionId?: string;
  sourceMode?: HolidayStudioAssignmentSourceMode;
  decorationPackId?: string;
  decorationPackVersion?: number;
  decorationComponentId?: string;
  decorationComponentVersion?: number;
  decorationType?:
    | "header_pack"
    | "ground_composition"
    | "footer_composition"
    | "axo_accessory"
    | "axo_prop"
    | "ambient_effect"
    | "feature_effect";
  componentSlot?:
    | "full_width"
    | "left"
    | "centre"
    | "right"
    | "repeat"
    | "axo_anchor"
    | "viewport";
  axoPlacement?: FestivalAxoPlacement;
  region: HolidayStudioRegion;
  enabled: boolean;
  size: "small" | "medium" | "large";
  density: HolidayStudioDensity;
  motion: HolidayStudioMotion;
  layer: number;
  visibility: HolidayStudioVisibility;
  religiousArtworkApproved: boolean;
};

export type HolidayFestivalSpecificControls = {
  gulalEnabled: boolean;
  pichkariEnabled: boolean;
  colourBurstIntensity: "off" | "low" | "medium" | "high";
  edgeSplashEnabled: boolean;
  axoInteractionEnabled: boolean;
  snowfallEnabled: boolean;
  reindeerJourneyEnabled: boolean;
  giftDropEnabled: boolean;
  fireworksEnabled: boolean;
};

export type HolidayExperienceStudioConfig = {
  sourceMode: HolidayStudioSourceMode;
  artworkMode: HolidayStudioArtworkMode;
  density: HolidayStudioDensity;
  pageCoverage: HolidayStudioPageCoverage;
  includedRoutes: string[];
  excludedRoutes: string[];
  religiousArtworkApproved: boolean;
  activeMotions: HolidayStudioMotion[];
  motionSourceMode?: HolidayStudioAssignmentSourceMode | "none";
  regions: Record<HolidayStudioRegion, HolidayStudioRegionConfig>;
  motifAssignments: HolidayStudioMotifAssignment[];
  festivalControls: HolidayFestivalSpecificControls;
  qualityGate: {
    approvedAssetsOnly: true;
    ambiguityReviewRequired: true;
    mobileFallbackRequired: true;
    reducedMotionFallbackRequired: true;
  };
};

export const HOLIDAY_HEADER_ORNAMENT_PACK_MODES = [
  "none",
  "festival_default",
  "uploaded_custom",
  "mixed"
] as const;

export type HolidayHeaderOrnamentPackMode =
  (typeof HOLIDAY_HEADER_ORNAMENT_PACK_MODES)[number];

export const HOLIDAY_HEADER_ORNAMENT_DENSITIES = [
  "minimal",
  "balanced",
  "rich"
] as const;

export type HolidayHeaderOrnamentDensity =
  (typeof HOLIDAY_HEADER_ORNAMENT_DENSITIES)[number];

export const HOLIDAY_HEADER_RAIL_HORIZONTAL_PLACEMENTS = [
  "left",
  "centre",
  "right",
  "spread",
  "safe_auto"
] as const;

export type HolidayHeaderRailHorizontalPlacement =
  (typeof HOLIDAY_HEADER_RAIL_HORIZONTAL_PLACEMENTS)[number];

export const HOLIDAY_HEADER_RAIL_VERTICAL_PLACEMENTS = [
  "below_navbar",
  "slightly_lower",
  "hero_edge"
] as const;

export type HolidayHeaderRailVerticalPlacement =
  (typeof HOLIDAY_HEADER_RAIL_VERTICAL_PLACEMENTS)[number];

export const HOLIDAY_HEADER_RAIL_LENGTH_PRESETS = [
  "short",
  "medium",
  "long"
] as const;

export type HolidayHeaderRailLengthPreset =
  (typeof HOLIDAY_HEADER_RAIL_LENGTH_PRESETS)[number];

export const HOLIDAY_HEADER_ORNAMENT_TYPES = [
  "streamer",
  "medallion",
  "bell",
  "lantern",
  "festival_icon",
  "text_badge",
  "garland_band",
  "corner_cluster",
  "animated_ribbon",
  "ambient_glow"
] as const;

export type HolidayHeaderOrnamentType =
  (typeof HOLIDAY_HEADER_ORNAMENT_TYPES)[number];

export const HOLIDAY_HEADER_ORNAMENT_POSITIONS = [
  "far_left",
  "left",
  "left_center",
  "center",
  "right_center",
  "right",
  "far_right"
] as const;

export type HolidayHeaderOrnamentPosition =
  (typeof HOLIDAY_HEADER_ORNAMENT_POSITIONS)[number];

export const HOLIDAY_HEADER_ORNAMENT_MOTIONS = [
  "none",
  "sway",
  "rotate",
  "float",
  "glow",
  "streamer"
] as const;

export type HolidayHeaderOrnamentMotion =
  (typeof HOLIDAY_HEADER_ORNAMENT_MOTIONS)[number];

export const HOLIDAY_HEADER_FESTIVAL_ICONS = [
  "drum",
  "diya",
  "star",
  "crescent",
  "chakra",
  "colour_drop",
  "snowflake",
  "flute",
  "peacock_feather",
  "matki",
  "modak",
  "flower",
  "custom"
] as const;

export type HolidayHeaderFestivalIcon =
  (typeof HOLIDAY_HEADER_FESTIVAL_ICONS)[number];

export type HolidayHeaderOrnamentItem = {
  id: string;
  type: HolidayHeaderOrnamentType;
  enabled: boolean;
  position: HolidayHeaderOrnamentPosition;
  hangingLength: number;
  scale: number;
  motion: HolidayHeaderOrnamentMotion;
  mobileVisible: boolean;
  colour: string;
  secondaryColour: string;
  culturalAssetApproved: boolean;
  assetVariant: string | null;
  icon: HolidayHeaderFestivalIcon | null;
  text: string | null;
  language: string | null;
  mobileFallbackText: string | null;
};

export type HolidayHeaderOrnamentConfig = {
  mode: HolidayHeaderOrnamentPackMode;
  enabled: boolean;
  railEnabled: boolean;
  density: HolidayHeaderOrnamentDensity;
  animationEnabled: boolean;
  motionLevel: HolidayMotionLevel;
  mobileSimplified: boolean;
  horizontalPlacement: HolidayHeaderRailHorizontalPlacement;
  verticalPlacement: HolidayHeaderRailVerticalPlacement;
  hangingLengthPreset: HolidayHeaderRailLengthPreset;
  ornamentCount: number;
  garlandEnabled: boolean;
  bellsEnabled: boolean;
  lanternsEnabled: boolean;
  streamersEnabled: boolean;
  textBadgeEnabled: boolean;
  approvedCulturalArtworkEnabled: boolean;
  items: HolidayHeaderOrnamentItem[];
};

export type HolidayMotifConfig = {
  garlands: boolean;
  bells: boolean;
  paperFans: boolean;
  leafVines: boolean;
  diyaGlow: boolean;
  warmParticles: boolean;
  lightStrings: boolean;
  lanterns: boolean;
  stars: boolean;
  snow: boolean;
  colourBursts: boolean;
  fireworks: boolean;
  confetti: boolean;
  alpana: boolean;
  ribbons: boolean;
  kites: boolean;
  moonLanterns: boolean;
  floralCorners: boolean;
  harvest: boolean;
  silhouettes: boolean;
  dholAccent: boolean;
};

export type HolidayRegionConfig = {
  header: boolean;
  hero: boolean;
  innerPages: boolean;
  footer: boolean;
  login: boolean;
  axo: boolean;
};

export type HolidayReferenceInterpretationConfig = {
  sourceMode: HolidayThemeSourceMode;
  publicArtworkMode: HolidayPublicArtworkMode;
  headerDensity: HolidayDecorationDensity;
  pageCoverage: HolidayPageCoverage;
  motion: HolidayMotionLevel;
  regions: HolidayRegionConfig;
  motifs: HolidayMotifConfig;
};

export type HolidaySoundConfig = {
  available: boolean;
  enabled: boolean;
  defaultState: "off" | "muted";
  loop: boolean;
  volume: number;
  desktopOnly: boolean;
  mobileEnabled: boolean;
  stopOnRouteExit: boolean;
  stopOnThemeEnd: boolean;
  showUserControl: boolean;
  startMode: "user_interaction";
  rememberPreference: boolean;
  culturallyReviewed: boolean;
};

export type HolidayAccessibilityConfig = {
  decorativeAssetsHidden: boolean;
  preserveTextContrast: boolean;
  avoidFormOverlap: boolean;
  avoidRapidFlashing: boolean;
  reducedMotionPreset: "none" | "static_accent" | "static_particles";
  silentFallback: boolean;
};

export type HolidayExperiencePackConfig = {
  version: 1;
  headerPreset: HolidayHeaderPreset;
  heroPreset: HolidayHeroPreset;
  innerPagePreset: HolidayInnerPagePreset;
  footerPreset: HolidayFooterPreset;
  particlePreset: HolidayParticlePreset;
  animationPreset: HolidayAnimationPreset;
  animationEnabled: boolean;
  animationIntensity: HolidayAnimationIntensity;
  desktopOnly: boolean;
  mobileSimplified: boolean;
  culturallySensitiveArtwork: boolean;
  copyReviewStatus: "approved" | "awaiting_review";
  approvalStatus: "draft" | "awaiting_approval" | "approved" | "rejected";
  headerOrnaments: HolidayHeaderOrnamentConfig;
  interpretation: HolidayReferenceInterpretationConfig;
  studio: HolidayExperienceStudioConfig;
  sound: HolidaySoundConfig;
  accessibility: HolidayAccessibilityConfig;
  protectedLoginBrand: HolidayProtectedLoginBrandConfig;
};

export type HolidayProtectedLoginBrandConfig = {
  placement: "safe_auto" | "upper_left" | "compact_top";
  size: "compact" | "standard";
  lightContrast: "soft_glass" | "text_shadow";
  darkContrast: "soft_glass" | "text_shadow";
};

export const HOLIDAY_PALETTE_MATCH_MODES = [
  "match_uploaded",
  "balanced_writex",
  "minimal_accent"
] as const;

export type HolidayPaletteMatchMode =
  (typeof HOLIDAY_PALETTE_MATCH_MODES)[number];

export const HOLIDAY_PALETTE_DETECTION_STATUSES = [
  "not_started",
  "pending_review",
  "approved",
  "needs_review",
  "failed"
] as const;

export type HolidayPaletteDetectionStatus =
  (typeof HOLIDAY_PALETTE_DETECTION_STATUSES)[number];

export type HolidayAssetRole =
  | "reference_image"
  | "login_desktop"
  | "login_mobile"
  | "login_background"
  | "hero_art"
  | "decorative_overlay"
  | "particle_overlay"
  | "logo_overlay"
  | "axo"
  | "axo_animation"
  | "header"
  | "supporting"
  | "audio"
  | "homepage_background"
  | "inner_page"
  | "footer"
  | "announcement"
  | "mobile_fallback"
  | "reduced_motion";

export type HolidayPalette = {
  accent: string;
  accentSoft: string;
  accentWarm: string;
  textOnAccent: string;
  surfaceTint: string;
  secondary?: string;
  backgroundTint?: string;
  borderHighlight?: string;
  ctaAccent?: string;
  decorativeHighlights?: string[];
};

export type HolidayExtractedPalette = {
  primary: string;
  secondary: string;
  accent: string;
  backgroundTint: string;
  surfaceTint: string;
  borderHighlight: string;
  cta: string;
  decorativeHighlights: string[];
  textOnPrimary: string;
  textOnSurface: string;
  contrast: {
    primaryTextRatio: number;
    ctaTextRatio: number;
    surfaceTextRatio: number;
    passes: boolean;
  };
  detectedAt: string;
};

export type HolidayThemeAsset = {
  id: string;
  libraryAssetId?: string | null;
  role: HolidayAssetRole;
  variant: string;
  safeFileName: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string | null;
  durationSeconds: number | null;
  status: "staged" | "active" | "replaced" | "archived";
  reviewStatus: "pending_review" | "approved" | "rejected" | "archived";
  qualityStatus:
    | "draft"
    | "needs_visual_review"
    | "ambiguous"
    | "rejected"
    | "approved"
    | "approved_with_size_restrictions"
    | "needs_replacement"
    | "archived";
  versionNumber: number;
  previousAssetId: string | null;
  intendedObject: string | null;
  intendedFestival: string | null;
  assetCategory: string | null;
  visualStyle: string | null;
  sizeRestrictions: string | null;
  usageLocations: string[];
  placements?: string[];
  lifecycleState?:
    | "active"
    | "archived"
    | "trash"
    | "deletion_pending"
    | "deleted";
  libraryApprovalState?: string;
  isFallback: boolean;
  approvedAt: string | null;
  createdAt: string;
  assetMetadata?: Record<string, unknown>;
};

export const HOLIDAY_ASSET_AVAILABILITY_STATES = [
  "complete",
  "partial",
  "login_assets_missing",
  "website_assets_missing",
  "axo_assets_missing",
  "audio_missing",
  "awaiting_approval",
  "ready_to_activate",
  "fallback_only"
] as const;

export type HolidayAssetAvailabilityState =
  (typeof HOLIDAY_ASSET_AVAILABILITY_STATES)[number];

export type HolidayTheme = {
  id: string;
  slug: string;
  name: string;
  festivalType: HolidayThemeCategory;
  description: string;
  status: HolidayThemeStatus;
  mode: HolidayThemeMode;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  repeatYearly: boolean;
  priority: number;
  isEnabled: boolean;
  scope: HolidayThemeScope;
  applyToHeader: boolean;
  applyToFooter: boolean;
  applyToHomepage: boolean;
  applyToLoginScreens: boolean;
  applyToClientLogin: boolean;
  applyToEmployeeLogin: boolean;
  applyToAdminLogin: boolean;
  applyMatchingWebsitePalette: boolean;
  applyAxoTheme: boolean;
  applyToSelectedRoutes: boolean;
  selectedRoutes: string[];
  palette: HolidayPalette;
  detectedPalette: HolidayExtractedPalette | null;
  paletteDetectionStatus: HolidayPaletteDetectionStatus;
  paletteDetectionMessage: string | null;
  paletteMatchMode: HolidayPaletteMatchMode;
  paletteSourceAssetId: string | null;
  paletteApprovedAt: string | null;
  experienceLevel: HolidayExperienceLevel;
  animationLevel: HolidayAnimationLevel;
  experienceConfig: HolidayExperiencePackConfig;
  assetAvailability: HolidayAssetAvailabilityState[];
  announcementBarEnabled: boolean;
  announcementBarText: string | null;
  announcementBarCtaLabel: string | null;
  announcementBarCtaHref: string | null;
  motif: string;
  axoAccessory: string;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
  assets: HolidayThemeAsset[];
  activeFestivalPackId?: string | null;
  activeSurfacePackIds?: Partial<
    Record<
      | "websiteHero"
      | "clientLoginHero"
      | "employeeLoginHero"
      | "header"
      | "axo"
      | "background"
      | "sound",
      string
    >
  >;
};

export const HOLIDAY_LOGIN_CHANNELS = [
  "client",
  "employee",
  "admin"
] as const;

export type HolidayLoginChannel = (typeof HOLIDAY_LOGIN_CHANNELS)[number];

export const HOLIDAY_LOGIN_STATES = [
  "default_active",
  "theme_preview",
  "theme_scheduled",
  "theme_active",
  "theme_paused",
  "fallback_active",
  "asset_failed"
] as const;

export type HolidayLoginState = (typeof HOLIDAY_LOGIN_STATES)[number];

export const HOLIDAY_LOGIN_APPLY_MODES = [
  "default",
  "split_hero",
  "full_natural_background",
  "full_canvas_uniform",
  "full_canvas_floating_form",
  "hero_only",
  "hero_default_form",
  "hero_themed_form",
  "full_composition"
] as const;

export type HolidayLoginApplyMode =
  (typeof HOLIDAY_LOGIN_APPLY_MODES)[number];

export const HOLIDAY_LOGIN_APPEARANCE_MODES = [
  "system",
  "light",
  "dark",
  "auto",
  "theme_controlled"
] as const;

export type HolidayLoginAppearanceMode =
  (typeof HOLIDAY_LOGIN_APPEARANCE_MODES)[number];

export const HOLIDAY_LOGIN_SOURCE_MODES = [
  "designer_complete_pack",
  "standard_festival_theme",
  "custom_hero",
  "default_login"
] as const;

export type HolidayLoginSourceMode =
  (typeof HOLIDAY_LOGIN_SOURCE_MODES)[number];

export const HOLIDAY_LOGIN_PACK_MOBILE_MODES = [
  "form_only",
  "compact_hero_form",
  "background_form"
] as const;

export type HolidayLoginPackMobileMode =
  (typeof HOLIDAY_LOGIN_PACK_MOBILE_MODES)[number];

export const HOLIDAY_LOGIN_EMBEDDED_UI_STATES = [
  "needs_review",
  "contains_embedded_ui",
  "no_embedded_ui"
] as const;

export type HolidayLoginEmbeddedUiState =
  (typeof HOLIDAY_LOGIN_EMBEDDED_UI_STATES)[number];

export type HolidayLoginFormSkinVariant = {
  cardBackground: string;
  headingColor: string;
  bodyColor: string;
  inputBackground: string;
  inputBorder: string;
  focusRing: string;
  ctaStart: string;
  ctaEnd: string;
};

export const HOLIDAY_LOGIN_HERO_BREAKPOINTS = [
  "desktopWide",
  "desktopSplit",
  "tablet",
  "mobileBanner",
  "mobilePortrait"
] as const;

export type HolidayLoginHeroBreakpoint =
  (typeof HOLIDAY_LOGIN_HERO_BREAKPOINTS)[number];

export const HOLIDAY_LOGIN_HERO_FIT_MODES = [
  "smart_crop",
  "fill_panel",
  "fit_entire_artwork",
  "custom_crop"
] as const;

export type HolidayLoginHeroFitMode =
  (typeof HOLIDAY_LOGIN_HERO_FIT_MODES)[number];

export type HolidayLoginCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HolidayLoginHeroCrop = {
  focalX: number;
  focalY: number;
  zoom: number;
  cropRect: HolidayLoginCropArea;
  subjectSafeArea: HolidayLoginCropArea;
  protectedContentArea: HolidayLoginCropArea;
  excludedEmbeddedFormArea: HolidayLoginCropArea;
};

export type HolidayLoginCompositionConfig = {
  version: 1;
  applyMode: HolidayLoginApplyMode;
  appearanceMode: HolidayLoginAppearanceMode;
  source: {
    mode: HolidayLoginSourceMode;
    packId: string | null;
    mobileMode: HolidayLoginPackMobileMode;
    usePackageLogo: boolean;
  };
  layout: {
    desktopColumns: "58_42" | "55_45" | "50_50";
    transition: "soft_blend" | "straight" | "curved" | "none";
    formMaxWidthPx: number;
    formAnchor: "center" | "right";
    canvasExtensionDirection: "right" | "both_sides";
    compositionBalance: number;
  };
  hero: {
    embeddedUiState: HolidayLoginEmbeddedUiState;
    safeCropApproved: boolean;
    fitMode: HolidayLoginHeroFitMode;
    derivativeVersion: number;
    focalX: number;
    focalY: number;
    zoom: number;
    crops: Record<HolidayLoginHeroBreakpoint, HolidayLoginHeroCrop>;
    mobileMode: "form_first" | "compact_hero";
    lightOverlayOpacity: number;
    darkOverlayOpacity: number;
  };
  formSkin: {
    mode: "default" | "extracted_theme" | "custom";
    cardOpacity: number;
    blurPx: number;
    borderWidthPx: number;
    radiusPx: number;
    glowStrength: number;
    light: HolidayLoginFormSkinVariant;
    dark: HolidayLoginFormSkinVariant;
  };
  background: {
    enabled: boolean;
    intensity: number;
    texture: "none" | "soft_facets" | "festival_ambience";
    strategy:
      | "auto_best_fit"
      | "extend_hero_background"
      | "soft_gradient_continuation"
      | "blurred_artwork_continuation"
      | "clean_ambient_surface";
    blendStrength: number;
    seamSmoothing: number;
    formSideAmbienceIntensity: number;
    extendedBrightness: number;
    extendedBlurPx: number;
    highlightGlow: number;
    overlayGrain: boolean;
    temperature: number;
    contrastProtection: number;
    edgeFadeWidthPercent: number;
    mode:
      | "theme_palette_gradient"
      | "soft_derived_blur"
      | "extended_artwork_ambience"
      | "subtle_festival_pattern"
      | "uploaded_form_background"
      | "default_writex_surface";
    pattern: "none" | "subtle_festival" | "soft_facets";
    light: {
      start: string;
      end: string;
      patternColor: string;
    };
    dark: {
      start: string;
      end: string;
      patternColor: string;
    };
  };
  quality: {
    noEmptyBands: boolean;
    subjectScaleApproved: boolean;
    importantArtworkSafe: boolean;
    embeddedFormExcluded: boolean;
    formBackgroundComplete: boolean;
    noVisibleRepeat: boolean;
    uniformCanvasApproved: boolean;
    noHardSeam: boolean;
    contrastApproved: boolean;
    mobileCompositionApproved: boolean;
  };
};

export type HolidayLoginControl = {
  channel: HolidayLoginChannel;
  mode: "default" | "holiday";
  state: HolidayLoginState;
  themeId: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  enabled: boolean;
  lastFailureCode: string | null;
  compositionConfig: HolidayLoginCompositionConfig;
  versionNumber: number;
  approvalState: "draft" | "validated" | "approved";
  previousApprovedConfig: HolidayLoginCompositionConfig | null;
  lastChangedBy: string | null;
  updatedAt: string;
};

export type HolidayExperienceSettings = {
  holidayModeEnabled: boolean;
  autoScheduleEnabled: boolean;
  emergencyDisabled: boolean;
  activeThemeId: string | null;
  manualOverrideThemeId: string | null;
  lastResolvedThemeId: string | null;
  lastSwitchedAt: string | null;
  lastSwitchedBy: string | null;
  defaultThemeSlug: string;
  updatedAt: string;
};

export type HolidayAuditEvent = {
  id: string;
  action: string;
  themeName: string | null;
  actorName: string | null;
  affectedScope: string | null;
  safeMetadata: Record<string, unknown>;
  createdAt: string;
};

export type HolidayExperienceSnapshot = {
  settings: HolidayExperienceSettings;
  themes: HolidayTheme[];
  activeTheme: HolidayTheme | null;
  nextScheduledTheme: HolidayTheme | null;
  audits: HolidayAuditEvent[];
  assetWarnings: string[];
  loginControls: HolidayLoginControl[];
};

export type PublicHolidayExperience = {
  theme: Pick<
    HolidayTheme,
    | "id"
    | "slug"
    | "name"
    | "festivalType"
    | "scope"
    | "selectedRoutes"
    | "applyToHeader"
    | "applyToFooter"
    | "applyToHomepage"
    | "applyToLoginScreens"
    | "applyToClientLogin"
    | "applyToEmployeeLogin"
    | "applyToAdminLogin"
    | "applyMatchingWebsitePalette"
    | "applyAxoTheme"
    | "applyToSelectedRoutes"
    | "palette"
    | "paletteMatchMode"
    | "experienceLevel"
    | "animationLevel"
    | "experienceConfig"
    | "assetAvailability"
    | "announcementBarEnabled"
    | "announcementBarText"
    | "announcementBarCtaLabel"
    | "announcementBarCtaHref"
    | "motif"
    | "axoAccessory"
  > & {
    assets: Partial<Record<HolidayAssetRole, string>>;
    ornamentAssets: Record<string, string>;
    designerPackAssets?: {
      packId: string;
      backgroundFourThree: string;
      backgroundWide: string;
      backgroundUltrawide: string;
      heroDesktop: string | null;
      heroTablet: string | null;
      heroMobile: string | null;
      logo: string | null;
      activationReady: boolean;
    };
  };
  loginComposition: HolidayLoginCompositionConfig | null;
  preview: boolean;
  previewSnapshotId: string | null;
  previewIdentity: {
    festivalSlug: string;
    festivalName: string;
    variantPackId: string;
    variantSlug: string;
    variantName: string;
    variantVersion: number;
  } | null;
  resolvedAt: string;
};
import type { FestivalAxoPlacement } from "./festival-review-standard";
