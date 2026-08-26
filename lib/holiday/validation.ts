import { z } from "zod";
import {
  HOLIDAY_ANIMATION_INTENSITIES,
  HOLIDAY_ANIMATION_PRESETS,
  HOLIDAY_EXPERIENCE_LEVELS,
  HOLIDAY_FOOTER_PRESETS,
  HOLIDAY_HEADER_PRESETS,
  HOLIDAY_HERO_PRESETS,
  HOLIDAY_HEADER_FESTIVAL_ICONS,
  HOLIDAY_HEADER_ORNAMENT_DENSITIES,
  HOLIDAY_HEADER_ORNAMENT_MOTIONS,
  HOLIDAY_HEADER_ORNAMENT_PACK_MODES,
  HOLIDAY_HEADER_ORNAMENT_POSITIONS,
  HOLIDAY_HEADER_ORNAMENT_TYPES,
  HOLIDAY_HEADER_RAIL_HORIZONTAL_PLACEMENTS,
  HOLIDAY_HEADER_RAIL_LENGTH_PRESETS,
  HOLIDAY_HEADER_RAIL_VERTICAL_PLACEMENTS,
  HOLIDAY_INNER_PAGE_PRESETS,
  HOLIDAY_LOGIN_APPEARANCE_MODES,
  HOLIDAY_LOGIN_APPLY_MODES,
  HOLIDAY_LOGIN_CHANNELS,
  HOLIDAY_LOGIN_EMBEDDED_UI_STATES,
  HOLIDAY_LOGIN_HERO_BREAKPOINTS,
  HOLIDAY_LOGIN_HERO_FIT_MODES,
  HOLIDAY_LOGIN_PACK_MOBILE_MODES,
  HOLIDAY_LOGIN_SOURCE_MODES,
  HOLIDAY_DECORATION_DENSITIES,
  HOLIDAY_MOTION_LEVELS,
  HOLIDAY_PAGE_COVERAGE,
  HOLIDAY_PARTICLE_PRESETS,
  HOLIDAY_PALETTE_MATCH_MODES,
  HOLIDAY_PUBLIC_ARTWORK_MODES,
  HOLIDAY_STUDIO_ARTWORK_MODES,
  HOLIDAY_STUDIO_ASSIGNMENT_SOURCE_MODES,
  HOLIDAY_STUDIO_DENSITIES,
  HOLIDAY_STUDIO_MOTIONS,
  HOLIDAY_STUDIO_PAGE_COVERAGE,
  HOLIDAY_STUDIO_REGIONS,
  HOLIDAY_STUDIO_SOURCE_MODES,
  HOLIDAY_THEME_SOURCE_MODES,
  HOLIDAY_THEME_CATEGORIES
} from "./types";

const safeNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .refine((value) => !/[<>]/.test(value), "Names cannot contain HTML.");

const categorySchema = z.enum(HOLIDAY_THEME_CATEGORIES);
const experienceLevelSchema = z.enum(HOLIDAY_EXPERIENCE_LEVELS);
const paletteMatchModeSchema = z.enum(HOLIDAY_PALETTE_MATCH_MODES);

const routeSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .refine((value) => value.startsWith("/"), "Selected routes must start with /.");

const paletteSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentSoft: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentWarm: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textOnAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surfaceTint: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  backgroundTint: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  borderHighlight: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ctaAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  decorativeHighlights: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .max(4)
    .optional()
});

const optionalDate = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value ? new Date(value).toISOString() : null));

const loginSkinVariantSchema = z.object({
  cardBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  headingColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bodyColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  inputBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  inputBorder: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  focusRing: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ctaStart: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ctaEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

const loginCropAreaSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().min(1).max(100),
    height: z.number().min(1).max(100)
  })
  .superRefine((value, context) => {
    if (value.x + value.width > 100 || value.y + value.height > 100) {
      context.addIssue({
        code: "custom",
        message: "Crop areas must remain inside the source artwork."
      });
    }
  });

const loginHeroCropSchema = z.object({
  focalX: z.number().min(0).max(100),
  focalY: z.number().min(0).max(100),
  zoom: z.number().min(1).max(2.5),
  cropRect: loginCropAreaSchema,
  subjectSafeArea: loginCropAreaSchema,
  protectedContentArea: loginCropAreaSchema,
  excludedEmbeddedFormArea: loginCropAreaSchema
});

const loginHeroCropsSchema = z.object(
  Object.fromEntries(
    HOLIDAY_LOGIN_HERO_BREAKPOINTS.map((breakpoint) => [
      breakpoint,
      loginHeroCropSchema
    ])
  ) as Record<
    (typeof HOLIDAY_LOGIN_HERO_BREAKPOINTS)[number],
    typeof loginHeroCropSchema
  >
);

export const holidayLoginCompositionSchema = z.object({
  version: z.literal(1),
  applyMode: z.enum(HOLIDAY_LOGIN_APPLY_MODES),
  appearanceMode: z.enum(HOLIDAY_LOGIN_APPEARANCE_MODES),
  source: z.object({
    mode: z.enum(HOLIDAY_LOGIN_SOURCE_MODES),
    packId: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .nullable(),
    mobileMode: z.enum(HOLIDAY_LOGIN_PACK_MOBILE_MODES),
    usePackageLogo: z.boolean()
  }),
  layout: z.object({
    desktopColumns: z.enum(["58_42", "55_45", "50_50"]),
    transition: z.enum(["soft_blend", "straight", "curved", "none"]),
    formMaxWidthPx: z.number().int().min(400).max(640),
    formAnchor: z.enum(["center", "right"]),
    canvasExtensionDirection: z.enum(["right", "both_sides"]),
    compositionBalance: z.number().int().min(35).max(70)
  }),
  hero: z.object({
    embeddedUiState: z.enum(HOLIDAY_LOGIN_EMBEDDED_UI_STATES),
    safeCropApproved: z.boolean(),
    fitMode: z.enum(HOLIDAY_LOGIN_HERO_FIT_MODES),
    derivativeVersion: z.number().int().min(1).max(1000000),
    focalX: z.number().min(0).max(100),
    focalY: z.number().min(0).max(100),
    zoom: z.number().min(1).max(2.5),
    crops: loginHeroCropsSchema,
    mobileMode: z.enum(["form_first", "compact_hero"]),
    lightOverlayOpacity: z.number().min(0).max(0.75),
    darkOverlayOpacity: z.number().min(0).max(0.85)
  }),
  formSkin: z.object({
    mode: z.enum(["default", "extracted_theme", "custom"]),
    cardOpacity: z.number().min(0.72).max(1),
    blurPx: z.number().int().min(0).max(40),
    borderWidthPx: z.number().min(0).max(3),
    radiusPx: z.number().int().min(8).max(32),
    glowStrength: z.number().min(0).max(0.5),
    light: loginSkinVariantSchema,
    dark: loginSkinVariantSchema
  }),
  background: z.object({
    enabled: z.boolean(),
    intensity: z.number().min(0).max(0.6),
    texture: z.enum(["none", "soft_facets", "festival_ambience"]),
    strategy: z.enum([
      "auto_best_fit",
      "extend_hero_background",
      "soft_gradient_continuation",
      "blurred_artwork_continuation",
      "clean_ambient_surface"
    ]),
    blendStrength: z.number().min(0).max(1),
    seamSmoothing: z.number().min(0).max(1),
    formSideAmbienceIntensity: z.number().min(0).max(0.7),
    extendedBrightness: z.number().min(0.7).max(1.3),
    extendedBlurPx: z.number().int().min(0).max(80),
    highlightGlow: z.number().min(0).max(0.5),
    overlayGrain: z.boolean(),
    temperature: z.number().min(-0.5).max(0.5),
    contrastProtection: z.number().min(0).max(1),
    edgeFadeWidthPercent: z.number().int().min(4).max(30),
    mode: z.enum([
      "theme_palette_gradient",
      "soft_derived_blur",
      "extended_artwork_ambience",
      "subtle_festival_pattern",
      "uploaded_form_background",
      "default_writex_surface"
    ]),
    pattern: z.enum(["none", "subtle_festival", "soft_facets"]),
    light: z.object({
      start: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      end: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      patternColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
    }),
    dark: z.object({
      start: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      end: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      patternColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
    })
  }),
  quality: z.object({
    noEmptyBands: z.boolean(),
    subjectScaleApproved: z.boolean(),
    importantArtworkSafe: z.boolean(),
    embeddedFormExcluded: z.boolean(),
    formBackgroundComplete: z.boolean(),
    noVisibleRepeat: z.boolean(),
    uniformCanvasApproved: z.boolean(),
    noHardSeam: z.boolean(),
    contrastApproved: z.boolean(),
    mobileCompositionApproved: z.boolean()
  })
});

const ornamentColourSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optionalOrnamentTextSchema = z
  .string()
  .trim()
  .max(64)
  .refine((value) => !/[<>]/.test(value), "Ornament text cannot contain HTML.")
  .nullable();

const headerOrnamentItemSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  type: z.enum(HOLIDAY_HEADER_ORNAMENT_TYPES),
  enabled: z.boolean(),
  position: z.enum(HOLIDAY_HEADER_ORNAMENT_POSITIONS),
  hangingLength: z.number().int().min(6).max(48),
  scale: z.number().min(0.6).max(1.4),
  motion: z.enum(HOLIDAY_HEADER_ORNAMENT_MOTIONS),
  mobileVisible: z.boolean(),
  colour: ornamentColourSchema,
  secondaryColour: ornamentColourSchema,
  culturalAssetApproved: z.boolean(),
  assetVariant: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .nullable(),
  icon: z.enum(HOLIDAY_HEADER_FESTIVAL_ICONS).nullable(),
  text: optionalOrnamentTextSchema,
  language: z.string().trim().max(32).nullable(),
  mobileFallbackText: optionalOrnamentTextSchema
});

const headerOrnamentConfigSchema = z
  .object({
    mode: z.enum(HOLIDAY_HEADER_ORNAMENT_PACK_MODES),
    enabled: z.boolean(),
    railEnabled: z.boolean().default(true),
    density: z.enum(HOLIDAY_HEADER_ORNAMENT_DENSITIES),
    animationEnabled: z.boolean(),
    motionLevel: z.enum(HOLIDAY_MOTION_LEVELS),
    mobileSimplified: z.boolean(),
    horizontalPlacement: z
      .enum(HOLIDAY_HEADER_RAIL_HORIZONTAL_PLACEMENTS)
      .default("safe_auto"),
    verticalPlacement: z
      .enum(HOLIDAY_HEADER_RAIL_VERTICAL_PLACEMENTS)
      .default("below_navbar"),
    hangingLengthPreset: z
      .enum(HOLIDAY_HEADER_RAIL_LENGTH_PRESETS)
      .default("medium"),
    ornamentCount: z.number().int().min(0).max(12),
    garlandEnabled: z.boolean(),
    bellsEnabled: z.boolean().default(true),
    lanternsEnabled: z.boolean().default(true),
    streamersEnabled: z.boolean().default(true),
    textBadgeEnabled: z.boolean(),
    approvedCulturalArtworkEnabled: z.boolean(),
    items: z.array(headerOrnamentItemSchema).max(12)
  })
  .superRefine((value, context) => {
    const ids = new Set<string>();
    for (const item of value.items) {
      if (ids.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate header ornament id: ${item.id}.`
        });
      }
      ids.add(item.id);
      if (
        item.culturalAssetApproved &&
        !value.approvedCulturalArtworkEnabled
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Cultural ornaments require the approved cultural artwork control."
        });
      }
    }
  });

const studioVisibilitySchema = z.object({
  desktop: z.boolean(),
  tablet: z.boolean(),
  mobile: z.boolean()
});

const studioRegionSchema = z.object({
  enabled: z.boolean(),
  assetPackId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9:_-]*$/),
  intensity: z.enum(["low", "medium", "high"]),
  visibility: studioVisibilitySchema,
  motion: z.enum(HOLIDAY_STUDIO_MOTIONS),
  safeFallback: z.enum(["omit", "static_approved", "default_writex"])
});

const studioAssignmentIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .transform((value) => value.toLowerCase().replaceAll("_", "-"))
  .pipe(z.string().regex(/^[a-z0-9][a-z0-9-]*$/));

const axoPlacementTransformSchema = z.object({
  offsetXPercent: z.number().min(-100).max(100),
  offsetYPercent: z.number().min(-100).max(100),
  scale: z.number().min(0.1).max(4),
  rotationDeg: z.number().min(-180).max(180),
  zIndex: z.number().int().min(0).max(100)
});

export const axoPlacementSchema = z.object({
  coordinateSpace: z.enum(["axo_bounds", "anchor_box"]),
  anchorType: z.enum([
    "right_hand",
    "left_hand",
    "two_hand",
    "head",
    "neck",
    "chest_safe",
    "side_carry",
    "ground",
    "back",
    "background_behind_axo"
  ]),
  anchorPoint: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1)
  }),
  gripPoint: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1)
  }),
  transforms: z.object({
    desktop: axoPlacementTransformSchema,
    tablet: axoPlacementTransformSchema,
    mobile: axoPlacementTransformSchema
  }),
  interactionResult: z.enum([
    "correctly_held",
    "correctly_worn",
    "correctly_grounded",
    "correctly_side_carried",
    "no_separate_prop",
    "floating_incorrect",
    "needs_improvement"
  ]).optional()
});

const studioMotifAssignmentSchema = z.object({
  id: studioAssignmentIdSchema,
  assetId: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  libraryAssetId: z.string().uuid().optional(),
  assetVersionId: z.string().uuid().optional(),
  sourceMode: z.enum(HOLIDAY_STUDIO_ASSIGNMENT_SOURCE_MODES).optional(),
  decorationPackId: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .optional(),
  decorationPackVersion: z.number().int().min(1).max(1000000).optional(),
  decorationComponentId: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .optional(),
  decorationComponentVersion: z.number().int().min(1).max(1000000).optional(),
  decorationType: z.enum([
    "header_pack",
    "ground_composition",
    "footer_composition",
    "axo_accessory",
    "axo_prop",
    "ambient_effect",
    "feature_effect"
  ]).optional(),
  componentSlot: z.enum([
    "full_width",
    "left",
    "centre",
    "right",
    "repeat",
    "axo_anchor",
    "viewport"
  ]).optional(),
  axoPlacement: axoPlacementSchema.optional(),
  region: z.enum(HOLIDAY_STUDIO_REGIONS),
  enabled: z.boolean(),
  size: z.enum(["small", "medium", "large"]),
  density: z.enum(HOLIDAY_STUDIO_DENSITIES),
  motion: z.enum(HOLIDAY_STUDIO_MOTIONS),
  layer: z.number().int().min(0).max(100),
  visibility: studioVisibilitySchema,
  religiousArtworkApproved: z.boolean()
});

export const studioSchema = z
  .object({
    sourceMode: z.enum(HOLIDAY_STUDIO_SOURCE_MODES),
    artworkMode: z.enum(HOLIDAY_STUDIO_ARTWORK_MODES),
    density: z.enum(HOLIDAY_STUDIO_DENSITIES),
    pageCoverage: z.enum(HOLIDAY_STUDIO_PAGE_COVERAGE),
    includedRoutes: z.array(routeSchema).max(60),
    excludedRoutes: z.array(routeSchema).max(60),
    religiousArtworkApproved: z.boolean(),
    activeMotions: z.array(z.enum(HOLIDAY_STUDIO_MOTIONS)).max(20),
    motionSourceMode: z
      .enum([...HOLIDAY_STUDIO_ASSIGNMENT_SOURCE_MODES, "none"])
      .optional(),
    regions: z.object(
      Object.fromEntries(
        HOLIDAY_STUDIO_REGIONS.map((region) => [region, studioRegionSchema])
      ) as Record<
        (typeof HOLIDAY_STUDIO_REGIONS)[number],
        typeof studioRegionSchema
      >
    ),
    motifAssignments: z.array(studioMotifAssignmentSchema).max(120),
    festivalControls: z.object({
      gulalEnabled: z.boolean(),
      pichkariEnabled: z.boolean(),
      colourBurstIntensity: z.enum(["off", "low", "medium", "high"]),
      edgeSplashEnabled: z.boolean(),
      axoInteractionEnabled: z.boolean(),
      snowfallEnabled: z.boolean(),
      reindeerJourneyEnabled: z.boolean(),
      giftDropEnabled: z.boolean(),
      fireworksEnabled: z.boolean()
    }),
    qualityGate: z.object({
      approvedAssetsOnly: z.literal(true),
      ambiguityReviewRequired: z.literal(true),
      mobileFallbackRequired: z.literal(true),
      reducedMotionFallbackRequired: z.literal(true)
    })
  })
  .superRefine((value, context) => {
    const assignmentIds = new Set<string>();
    for (const assignment of value.motifAssignments) {
      if (assignmentIds.has(assignment.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate motif assignment id: ${assignment.id}.`
        });
      }
      assignmentIds.add(assignment.id);
      const packFields = [
        assignment.decorationPackId,
        assignment.decorationPackVersion,
        assignment.decorationComponentId,
        assignment.decorationComponentVersion,
        assignment.decorationType,
        assignment.componentSlot
      ];
      if (packFields.some((item) => item !== undefined) && packFields.some((item) => item === undefined)) {
        context.addIssue({
          code: "custom",
          message: `Complete pack metadata is incomplete for ${assignment.id}.`
        });
      }
    }
    if (
      value.artworkMode === "religious_approval_required" &&
      !value.religiousArtworkApproved
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Religious artwork cannot be saved as publishable without explicit approval."
      });
    }
    const routeOverlap = value.includedRoutes.find((route) =>
      value.excludedRoutes.includes(route)
    );
    if (routeOverlap) {
      context.addIssue({
        code: "custom",
        message: `${routeOverlap} cannot be both included and excluded.`
      });
    }
  });

const experienceConfigSchema = z.object({
  version: z.literal(1),
  headerPreset: z.enum(HOLIDAY_HEADER_PRESETS),
  heroPreset: z.enum(HOLIDAY_HERO_PRESETS),
  innerPagePreset: z.enum(HOLIDAY_INNER_PAGE_PRESETS),
  footerPreset: z.enum(HOLIDAY_FOOTER_PRESETS),
  particlePreset: z.enum(HOLIDAY_PARTICLE_PRESETS),
  animationPreset: z.enum(HOLIDAY_ANIMATION_PRESETS),
  animationEnabled: z.boolean(),
  animationIntensity: z.enum(HOLIDAY_ANIMATION_INTENSITIES),
  desktopOnly: z.boolean(),
  mobileSimplified: z.boolean(),
  culturallySensitiveArtwork: z.boolean(),
  copyReviewStatus: z.enum(["approved", "awaiting_review"]),
  approvalStatus: z.enum([
    "draft",
    "awaiting_approval",
    "approved",
    "rejected"
  ]),
  headerOrnaments: headerOrnamentConfigSchema,
  interpretation: z.object({
    sourceMode: z.enum(HOLIDAY_THEME_SOURCE_MODES),
    publicArtworkMode: z.enum(HOLIDAY_PUBLIC_ARTWORK_MODES),
    headerDensity: z.enum(HOLIDAY_DECORATION_DENSITIES),
    pageCoverage: z.enum(HOLIDAY_PAGE_COVERAGE),
    motion: z.enum(HOLIDAY_MOTION_LEVELS),
    regions: z.object({
      header: z.boolean(),
      hero: z.boolean(),
      innerPages: z.boolean(),
      footer: z.boolean(),
      login: z.boolean(),
      axo: z.boolean()
    }),
    motifs: z.object({
      garlands: z.boolean(),
      bells: z.boolean(),
      paperFans: z.boolean(),
      leafVines: z.boolean(),
      diyaGlow: z.boolean(),
      warmParticles: z.boolean(),
      lightStrings: z.boolean(),
      lanterns: z.boolean(),
      stars: z.boolean(),
      snow: z.boolean(),
      colourBursts: z.boolean(),
      fireworks: z.boolean(),
      confetti: z.boolean(),
      alpana: z.boolean(),
      ribbons: z.boolean(),
      kites: z.boolean(),
      moonLanterns: z.boolean(),
      floralCorners: z.boolean(),
      harvest: z.boolean(),
      silhouettes: z.boolean(),
      dholAccent: z.boolean()
    })
  }),
  studio: studioSchema,
  sound: z.object({
    available: z.boolean(),
    enabled: z.boolean(),
    defaultState: z.enum(["off", "muted"]),
    loop: z.boolean(),
    volume: z.number().min(0).max(0.5),
    desktopOnly: z.boolean(),
    mobileEnabled: z.boolean(),
    stopOnRouteExit: z.boolean(),
    stopOnThemeEnd: z.boolean(),
    showUserControl: z.boolean(),
    startMode: z.literal("user_interaction"),
    rememberPreference: z.boolean(),
    culturallyReviewed: z.boolean()
  }),
  accessibility: z.object({
    decorativeAssetsHidden: z.literal(true),
    preserveTextContrast: z.literal(true),
    avoidFormOverlap: z.literal(true),
    avoidRapidFlashing: z.literal(true),
    reducedMotionPreset: z.enum([
      "none",
      "static_accent",
      "static_particles"
    ]),
    silentFallback: z.literal(true)
  })
});

export const holidayAdminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: safeNameSchema,
    description: z.string().trim().max(500),
    festivalType: categorySchema,
    experienceLevel: experienceLevelSchema
  }),
  z.object({
    action: z.literal("set_master"),
    enabled: z.boolean()
  }),
  z.object({
    action: z.literal("set_auto"),
    enabled: z.boolean()
  }),
  z.object({
    action: z.literal("emergency_disable")
  }),
  z.object({
    action: z.literal("restore_default")
  }),
  z.object({
    action: z.literal("set_login_channel"),
    channel: z.enum(HOLIDAY_LOGIN_CHANNELS),
    mode: z.enum(["default", "holiday"]),
    state: z.enum([
      "default_active",
      "theme_active",
      "theme_paused",
      "fallback_active"
    ]),
    themeId: z.string().uuid().nullable()
  }),
  z.object({
    action: z.literal("apply_login_theme_both"),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.literal("update_login_composition"),
    channel: z.enum(HOLIDAY_LOGIN_CHANNELS),
    themeId: z.string().uuid().nullable(),
    intent: z.enum(["save_draft", "validate", "approve", "activate"]),
    compositionConfig: holidayLoginCompositionSchema
  }),
  z.object({
    action: z.literal("copy_login_composition"),
    from: z.enum(HOLIDAY_LOGIN_CHANNELS),
    to: z.enum(HOLIDAY_LOGIN_CHANNELS)
  }).refine((value) => value.from !== value.to, {
    message: "Choose two different login channels."
  }),
  z.object({
    action: z.literal("restore_login_channel_default"),
    channel: z.enum(HOLIDAY_LOGIN_CHANNELS)
  }),
  z.object({
    action: z.literal("schedule_login_theme"),
    channel: z.union([z.enum(HOLIDAY_LOGIN_CHANNELS), z.literal("both")]),
    themeId: z.string().uuid(),
    startAt: optionalDate,
    endAt: optionalDate
  }).superRefine((value, context) => {
    if (!value.startAt || !value.endAt) {
      context.addIssue({
        code: "custom",
        message: "Scheduled login themes require a start and end time."
      });
    } else if (new Date(value.endAt) <= new Date(value.startAt)) {
      context.addIssue({
        code: "custom",
        message: "The login-theme end time must be after its start time."
      });
    }
  }),
  z.object({
    action: z.enum([
      "disable_login_theme",
      "restore_login_defaults",
      "emergency_reset_logins"
    ])
  }),
  z.object({
    action: z.literal("activate"),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.literal("deactivate"),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.enum(["pause", "resume", "end_early", "archive"]),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.literal("duplicate"),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.literal("preview"),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.literal("clear_preview")
  }),
  z.object({
    action: z.literal("detect_palette"),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.literal("accept_detected_palette"),
    themeId: z.string().uuid(),
    paletteMatchMode: paletteMatchModeSchema
  }),
  z.object({
    action: z.literal("reset_safe_palette"),
    themeId: z.string().uuid()
  }),
  z.object({
    action: z.literal("approve_manual_palette"),
    themeId: z.string().uuid(),
    palette: paletteSchema,
    paletteMatchMode: paletteMatchModeSchema
  }),
  z
    .object({
      action: z.literal("update"),
      themeId: z.string().uuid(),
      name: safeNameSchema,
      description: z.string().trim().max(500),
      festivalType: z.union([categorySchema, z.literal("system_default")]),
      experienceLevel: experienceLevelSchema,
      status: z.enum(["draft", "scheduled", "paused"]),
      mode: z.enum(["manual", "automatic"]),
      startAt: optionalDate,
      endAt: optionalDate,
      timezone: z.string().trim().min(1).max(80),
      repeatYearly: z.boolean(),
      priority: z.number().int().min(0).max(1000),
      isEnabled: z.boolean(),
      scope: z.enum([
        "entire_public",
        "homepage",
        "header_only",
        "login_screens",
        "selected_pages"
      ]),
      applyToHeader: z.boolean(),
      applyToFooter: z.boolean(),
      applyToHomepage: z.boolean(),
      applyToLoginScreens: z.boolean(),
      applyToClientLogin: z.boolean(),
      applyToEmployeeLogin: z.boolean(),
      applyToAdminLogin: z.boolean(),
      applyMatchingWebsitePalette: z.boolean(),
      applyAxoTheme: z.boolean(),
      applyToSelectedRoutes: z.boolean(),
      selectedRoutes: z.array(routeSchema).max(40),
      palette: paletteSchema,
      paletteMatchMode: paletteMatchModeSchema,
      experienceConfig: experienceConfigSchema,
      announcementBarEnabled: z.boolean(),
      announcementBarText: z.string().trim().max(180).nullable(),
      announcementBarCtaLabel: z.string().trim().max(40).nullable(),
      announcementBarCtaHref: routeSchema.nullable()
    })
    .superRefine((value, context) => {
      if (value.status === "scheduled" && (!value.startAt || !value.endAt)) {
        context.addIssue({
          code: "custom",
          message: "Scheduled themes require a start and end time."
        });
      }
      if (value.status === "scheduled" && value.mode !== "automatic") {
        context.addIssue({
          code: "custom",
          message: "Scheduled themes must use Automatic mode."
        });
      }
      if (
        value.startAt &&
        value.endAt &&
        new Date(value.endAt) <= new Date(value.startAt)
      ) {
        context.addIssue({
          code: "custom",
          message: "The end time must be after the start time."
        });
      }
      if (
        value.scope === "selected_pages" &&
        value.selectedRoutes.length === 0
      ) {
        context.addIssue({
          code: "custom",
          message: "Choose at least one selected page."
        });
      }
    })
]);

export function isValidHolidayPalette(value: unknown) {
  return paletteSchema.safeParse(value).success;
}

export const holidayAssetMetadataSchema = z.object({
  themeId: z.string().uuid(),
  role: z.enum([
    "reference_image",
    "login_desktop",
    "login_mobile",
    "login_background",
    "hero_art",
    "decorative_overlay",
    "particle_overlay",
    "logo_overlay",
    "axo",
    "axo_animation",
    "header",
    "supporting",
    "audio",
    "mobile_fallback",
    "reduced_motion"
  ]),
  variant: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      "Asset variants may use lowercase letters, numbers and hyphens."
    )
    .default("default")
});

export function isValidHolidayImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}
