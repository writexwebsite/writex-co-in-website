import type {
  HolidayAssetAvailabilityState,
  HolidayExperienceLevel,
  HolidayExperiencePackConfig,
  HolidayHeaderOrnamentConfig,
  HolidayHeaderOrnamentItem,
  HolidayStudioRegion,
  HolidayStudioRegionConfig,
  HolidayThemeAsset
} from "./types";
import { HOLIDAY_STUDIO_REGIONS } from "./types";

const defaultSound: HolidayExperiencePackConfig["sound"] = {
  available: false,
  enabled: false,
  defaultState: "off",
  loop: false,
  volume: 0.25,
  desktopOnly: false,
  mobileEnabled: false,
  stopOnRouteExit: true,
  stopOnThemeEnd: true,
  showUserControl: true,
  startMode: "user_interaction",
  rememberPreference: true,
  culturallyReviewed: false
};

const defaultAccessibility: HolidayExperiencePackConfig["accessibility"] = {
  decorativeAssetsHidden: true,
  preserveTextContrast: true,
  avoidFormOverlap: true,
  avoidRapidFlashing: true,
  reducedMotionPreset: "static_accent",
  silentFallback: true
};

const defaultProtectedLoginBrand: HolidayExperiencePackConfig["protectedLoginBrand"] = {
  placement: "safe_auto",
  size: "standard",
  lightContrast: "soft_glass",
  darkContrast: "soft_glass"
};

const defaultInterpretation: HolidayExperiencePackConfig["interpretation"] = {
  sourceMode: "reference_image",
  publicArtworkMode: "interpreted_motifs",
  headerDensity: "balanced",
  pageCoverage: "homepage_key_pages",
  motion: "subtle",
  regions: {
    header: true,
    hero: true,
    innerPages: true,
    footer: true,
    login: true,
    axo: true
  },
  motifs: {
    garlands: false,
    bells: false,
    paperFans: false,
    leafVines: false,
    diyaGlow: false,
    warmParticles: true,
    lightStrings: false,
    lanterns: false,
    stars: false,
    snow: false,
    colourBursts: false,
    fireworks: false,
    confetti: false,
    alpana: false,
    ribbons: false,
    kites: false,
    moonLanterns: false,
    floralCorners: false,
    harvest: false,
    silhouettes: false,
    dholAccent: false
  }
};

const defaultStudioRegion: HolidayStudioRegionConfig = {
  enabled: false,
  assetPackId: "built-in:default",
  intensity: "low",
  visibility: {
    desktop: true,
    tablet: true,
    mobile: false
  },
  motion: "static",
  safeFallback: "default_writex"
};

function studioRegions(
  enabled: Partial<Record<HolidayStudioRegion, Partial<HolidayStudioRegionConfig>>> = {}
): HolidayExperiencePackConfig["studio"]["regions"] {
  return Object.fromEntries(
    HOLIDAY_STUDIO_REGIONS.map((region) => [
      region,
      {
        ...defaultStudioRegion,
        ...(enabled[region] || {}),
        visibility: {
          ...defaultStudioRegion.visibility,
          ...(enabled[region]?.visibility || {})
        }
      }
    ])
  ) as HolidayExperiencePackConfig["studio"]["regions"];
}

const defaultStudio: HolidayExperiencePackConfig["studio"] = {
  sourceMode: "built_in_writex_pack",
  artworkMode: "decorative",
  density: "festive",
  pageCoverage: "main_public",
  includedRoutes: [],
  excludedRoutes: ["/admin", "/client", "/employee"],
  religiousArtworkApproved: false,
  activeMotions: ["static", "gentle_wind"],
  regions: studioRegions({
    navigation_rail: {
      enabled: true,
      intensity: "medium",
      visibility: { desktop: true, tablet: true, mobile: true },
      motion: "gentle_wind",
      safeFallback: "static_approved"
    },
    hero_background: { enabled: true, safeFallback: "omit" },
    hero_foreground: {
      enabled: true,
      visibility: { desktop: true, tablet: true, mobile: false },
      safeFallback: "omit"
    },
    page_ambience: { enabled: true, safeFallback: "omit" },
    footer_decoration: { enabled: true, safeFallback: "omit" },
    axo_area: { enabled: true, safeFallback: "default_writex" },
    client_login: { enabled: true, safeFallback: "default_writex" },
    employee_login: { enabled: true, safeFallback: "default_writex" }
  }),
  motifAssignments: [],
  festivalControls: {
    gulalEnabled: false,
    pichkariEnabled: false,
    colourBurstIntensity: "off",
    edgeSplashEnabled: false,
    axoInteractionEnabled: false,
    snowfallEnabled: false,
    reindeerJourneyEnabled: false,
    giftDropEnabled: false,
    fireworksEnabled: false
  },
  qualityGate: {
    approvedAssetsOnly: true,
    ambiguityReviewRequired: true,
    mobileFallbackRequired: true,
    reducedMotionFallbackRequired: true
  }
};

const defaultHeaderOrnaments: HolidayHeaderOrnamentConfig = {
  mode: "none",
  enabled: false,
  railEnabled: true,
  density: "balanced",
  animationEnabled: true,
  motionLevel: "subtle",
  mobileSimplified: true,
  horizontalPlacement: "safe_auto",
  verticalPlacement: "below_navbar",
  hangingLengthPreset: "medium",
  ornamentCount: 6,
  garlandEnabled: true,
  bellsEnabled: true,
  lanternsEnabled: true,
  streamersEnabled: true,
  textBadgeEnabled: true,
  approvedCulturalArtworkEnabled: false,
  items: []
};

function ornament(
  id: string,
  type: HolidayHeaderOrnamentItem["type"],
  position: HolidayHeaderOrnamentItem["position"],
  override: Partial<HolidayHeaderOrnamentItem> = {}
): HolidayHeaderOrnamentItem {
  return {
    id,
    type,
    enabled: true,
    position,
    hangingLength: 24,
    scale: 1,
    motion: "sway",
    mobileVisible: true,
    colour: "#7C2DCC",
    secondaryColour: "#F59E0B",
    culturalAssetApproved: false,
    assetVariant: null,
    icon: null,
    text: null,
    language: null,
    mobileFallbackText: null,
    ...override
  };
}

function headerOrnaments(
  items: HolidayHeaderOrnamentItem[],
  override: Partial<Omit<HolidayHeaderOrnamentConfig, "items">> = {}
): HolidayHeaderOrnamentConfig {
  return {
    ...defaultHeaderOrnaments,
    mode: "festival_default",
    enabled: true,
    ornamentCount: items.length,
    items,
    ...override
  };
}

const floralHeaderOrnaments = headerOrnaments(
  [
    ornament("floral-garland", "garland_band", "center", {
      hangingLength: 14,
      motion: "none",
      mobileVisible: true
    }),
    ornament("floral-left", "corner_cluster", "far_left", {
      hangingLength: 16,
      scale: 0.82
    }),
    ornament("floral-right", "corner_cluster", "far_right", {
      hangingLength: 16,
      scale: 0.82
    }),
    ornament("floral-medallion", "medallion", "right_center", {
      hangingLength: 30,
      scale: 0.84,
      mobileVisible: false
    })
  ],
  { ornamentCount: 4 }
);

const lanternHeaderOrnaments = headerOrnaments(
  [
    ornament("lantern-left", "lantern", "left", {
      hangingLength: 32,
      colour: "#087A55",
      secondaryColour: "#D7B15B"
    }),
    ornament("crescent-center", "festival_icon", "center", {
      hangingLength: 19,
      motion: "float",
      colour: "#087A55",
      secondaryColour: "#D7B15B",
      icon: "crescent"
    }),
    ornament("lantern-right", "lantern", "right", {
      hangingLength: 28,
      colour: "#087A55",
      secondaryColour: "#D7B15B"
    }),
    ornament("eid-stars", "ambient_glow", "right_center", {
      hangingLength: 12,
      motion: "glow",
      mobileVisible: false,
      colour: "#D7B15B",
      secondaryColour: "#087A55"
    })
  ],
  { approvedCulturalArtworkEnabled: true }
);

const nationalHeaderOrnaments = headerOrnaments(
  [
    ornament("national-ribbon", "animated_ribbon", "center", {
      hangingLength: 11,
      motion: "streamer",
      colour: "#FF8A2A",
      secondaryColour: "#168B55"
    }),
    ornament("chakra", "festival_icon", "center", {
      hangingLength: 20,
      motion: "rotate",
      colour: "#1D4F91",
      secondaryColour: "#FFFFFF",
      icon: "chakra"
    }),
    ornament("national-left", "streamer", "left", {
      hangingLength: 29,
      colour: "#FF8A2A",
      secondaryColour: "#168B55"
    }),
    ornament("national-right", "streamer", "right", {
      hangingLength: 29,
      colour: "#168B55",
      secondaryColour: "#FF8A2A"
    })
  ],
  { garlandEnabled: false, approvedCulturalArtworkEnabled: true }
);

export const DEFAULT_EXPERIENCE_PACK: HolidayExperiencePackConfig = {
  version: 1,
  headerPreset: "spectrum_line",
  heroPreset: "ambient_frame",
  innerPagePreset: "section_accents",
  footerPreset: "accent_ribbon",
  particlePreset: "none",
  animationPreset: "none",
  animationEnabled: false,
  animationIntensity: "low",
  desktopOnly: false,
  mobileSimplified: true,
  culturallySensitiveArtwork: false,
  copyReviewStatus: "approved",
  approvalStatus: "approved",
  headerOrnaments: defaultHeaderOrnaments,
  interpretation: defaultInterpretation,
  studio: defaultStudio,
  sound: defaultSound,
  accessibility: defaultAccessibility,
  protectedLoginBrand: defaultProtectedLoginBrand
};

type PackOverride = Omit<
  Partial<HolidayExperiencePackConfig>,
  "headerOrnaments" | "interpretation" | "studio" | "sound" | "accessibility"
> & {
  headerOrnaments?: Partial<
    Omit<HolidayExperiencePackConfig["headerOrnaments"], "items">
  > & {
    items?: HolidayExperiencePackConfig["headerOrnaments"]["items"];
  };
  interpretation?: Partial<
    Omit<HolidayExperiencePackConfig["interpretation"], "regions" | "motifs">
  > & {
    regions?: Partial<HolidayExperiencePackConfig["interpretation"]["regions"]>;
    motifs?: Partial<HolidayExperiencePackConfig["interpretation"]["motifs"]>;
  };
  studio?: Partial<
    Omit<HolidayExperiencePackConfig["studio"], "regions" | "festivalControls" | "qualityGate">
  > & {
    regions?: Partial<HolidayExperiencePackConfig["studio"]["regions"]>;
    festivalControls?: Partial<
      HolidayExperiencePackConfig["studio"]["festivalControls"]
    >;
    qualityGate?: Partial<HolidayExperiencePackConfig["studio"]["qualityGate"]>;
  };
  sound?: Partial<HolidayExperiencePackConfig["sound"]>;
  accessibility?: Partial<HolidayExperiencePackConfig["accessibility"]>;
  protectedLoginBrand?: Partial<
    HolidayExperiencePackConfig["protectedLoginBrand"]
  >;
};

function pack(override: PackOverride): HolidayExperiencePackConfig {
  return {
    ...DEFAULT_EXPERIENCE_PACK,
    ...override,
    headerOrnaments: {
      ...defaultHeaderOrnaments,
      ...override.headerOrnaments,
      items: override.headerOrnaments?.items || defaultHeaderOrnaments.items
    },
    interpretation: {
      ...defaultInterpretation,
      ...override.interpretation,
      regions: {
        ...defaultInterpretation.regions,
        ...(override.interpretation?.regions || {})
      },
      motifs: {
        ...defaultInterpretation.motifs,
        ...(override.interpretation?.motifs || {})
      }
    },
    studio: {
      ...defaultStudio,
      ...override.studio,
      regions: {
        ...defaultStudio.regions,
        ...(override.studio?.regions || {})
      },
      festivalControls: {
        ...defaultStudio.festivalControls,
        ...(override.studio?.festivalControls || {})
      },
      qualityGate: {
        ...defaultStudio.qualityGate,
        ...(override.studio?.qualityGate || {})
      }
    },
    sound: { ...defaultSound, ...override.sound },
    accessibility: { ...defaultAccessibility, ...override.accessibility }
  };
}

const calmReligious = pack({
  headerPreset: "lanterns",
  heroPreset: "corner_cluster",
  footerPreset: "light_trim",
  particlePreset: "stars",
  animationPreset: "lantern_glow",
  animationEnabled: true,
  animationIntensity: "low",
  culturallySensitiveArtwork: true,
  headerOrnaments: lanternHeaderOrnaments,
  interpretation: {
    motifs: {
      lanterns: true,
      stars: true,
      moonLanterns: true
    }
  },
  sound: { available: true, defaultState: "off" }
});

const national = pack({
  headerPreset: "tricolour_ribbon",
  heroPreset: "festive_ribbon",
  footerPreset: "accent_ribbon",
  particlePreset: "none",
  animationPreset: "header_movement",
  animationEnabled: true,
  animationIntensity: "low",
  desktopOnly: false,
  culturallySensitiveArtwork: true,
  headerOrnaments: nationalHeaderOrnaments,
  interpretation: {
    motifs: {
      ribbons: true,
      silhouettes: true
    }
  }
});

const floral = pack({
  headerPreset: "floral",
  particlePreset: "petals",
  animationPreset: "falling_particles",
  animationEnabled: true,
  animationIntensity: "low",
  headerOrnaments: floralHeaderOrnaments,
  interpretation: {
    motifs: {
      garlands: true,
      floralCorners: true,
      leafVines: true
    }
  },
  sound: { available: true, defaultState: "off" }
});

const harvest = pack({
  headerPreset: "harvest",
  particlePreset: "soft_sparkles",
  animationPreset: "floating_decorations",
  animationEnabled: true,
  animationIntensity: "low",
  culturallySensitiveArtwork: true,
  headerOrnaments: headerOrnaments([
    ornament("harvest-garland", "garland_band", "center", {
      hangingLength: 13,
      motion: "none",
      colour: "#2E7D32",
      secondaryColour: "#E9A23B"
    }),
    ornament("harvest-left", "festival_icon", "left", {
      hangingLength: 28,
      icon: "flower",
      colour: "#2E7D32",
      secondaryColour: "#E9A23B"
    }),
    ornament("harvest-right", "festival_icon", "right", {
      hangingLength: 31,
      icon: "matki",
      colour: "#B5522B",
      secondaryColour: "#E9A23B"
    })
  ]),
  interpretation: {
    motifs: {
      harvest: true,
      leafVines: true,
      kites: true
    }
  },
  sound: { available: true, defaultState: "off" }
});

const business = pack({
  headerPreset: "milestone_ribbon",
  particlePreset: "soft_sparkles",
  animationPreset: "sparkles",
  animationEnabled: true,
  animationIntensity: "low",
  headerOrnaments: headerOrnaments(
    [
      ornament("business-ribbon", "animated_ribbon", "center", {
        hangingLength: 10,
        motion: "streamer"
      }),
      ornament("business-star", "festival_icon", "right_center", {
        hangingLength: 23,
        icon: "star",
        mobileVisible: false
      })
    ],
    { density: "minimal", garlandEnabled: false }
  ),
  interpretation: {
    motifs: {
      ribbons: true,
      stars: true
    }
  }
});

const campaign = pack({
  headerPreset: "campaign_bar",
  particlePreset: "none",
  animationPreset: "subtle_glow",
  animationEnabled: true,
  animationIntensity: "low",
  headerOrnaments: headerOrnaments(
    [
      ornament("campaign-ribbon", "animated_ribbon", "center", {
        hangingLength: 9,
        motion: "streamer"
      })
    ],
    { density: "minimal", garlandEnabled: false }
  ),
  interpretation: {
    motifs: {
      ribbons: true
    }
  }
});

export const STARTER_EXPERIENCE_PACKS: Record<
  string,
  HolidayExperiencePackConfig
> = {
  "republic-day": national,
  "independence-day": national,
  "gandhi-jayanti": { ...national, animationEnabled: false, animationPreset: "none" },
  "netaji-jayanti": national,
  "constitution-day": national,
  "armed-forces-flag-day": national,
  "durga-puja": pack({
    headerPreset: "alpana",
    heroPreset: "corner_cluster",
    footerPreset: "motif_band",
    particlePreset: "petals",
    animationPreset: "garland_sway",
    animationEnabled: true,
    animationIntensity: "low",
    culturallySensitiveArtwork: true,
    headerOrnaments: headerOrnaments(
      [
        ornament("durga-garland", "garland_band", "center", {
          hangingLength: 15,
          motion: "none",
          colour: "#A71930",
          secondaryColour: "#F3A321"
        }),
        ornament("durga-dhaak", "festival_icon", "left", {
          hangingLength: 34,
          scale: 1.05,
          icon: "drum",
          colour: "#8A1538",
          secondaryColour: "#F3A321",
          culturalAssetApproved: true
        }),
        ornament("durga-bell-left", "bell", "left_center", {
          hangingLength: 27,
          scale: 0.88,
          colour: "#A71930",
          secondaryColour: "#D9A441"
        }),
        ornament("durga-medallion", "medallion", "center", {
          hangingLength: 36,
          scale: 1.12,
          motion: "rotate",
          colour: "#A71930",
          secondaryColour: "#F3A321",
          culturalAssetApproved: true
        }),
        ornament("durga-bell-right", "bell", "right_center", {
          hangingLength: 28,
          scale: 0.88,
          colour: "#A71930",
          secondaryColour: "#D9A441"
        }),
        ornament("durga-diya", "festival_icon", "right", {
          hangingLength: 33,
          icon: "diya",
          colour: "#8A1538",
          secondaryColour: "#F3A321",
          culturalAssetApproved: true
        }),
        ornament("durga-text", "text_badge", "right_center", {
          hangingLength: 16,
          scale: 0.82,
          motion: "float",
          mobileVisible: false,
          colour: "#8A1538",
          secondaryColour: "#F9E7C5",
          text: "Shubho Durga Puja",
          language: "English",
          mobileFallbackText: null
        }),
        ornament("durga-glow", "ambient_glow", "center", {
          hangingLength: 10,
          motion: "glow",
          mobileVisible: false,
          colour: "#F3A321",
          secondaryColour: "#A71930"
        })
      ],
      {
        density: "balanced",
        ornamentCount: 7,
        approvedCulturalArtworkEnabled: true
      }
    ),
    interpretation: {
      sourceMode: "reference_image",
      publicArtworkMode: "interpreted_motifs",
      headerDensity: "balanced",
      pageCoverage: "homepage_key_pages",
      motion: "subtle",
      motifs: {
        garlands: true,
        bells: true,
        paperFans: true,
        leafVines: true,
        diyaGlow: true,
        warmParticles: true,
        alpana: true,
        floralCorners: true,
        dholAccent: true
      }
    },
    studio: {
      artworkMode: "cultural",
      density: "festive",
      activeMotions: ["static", "garland_sway", "bell_swing", "petal_fall"],
      motifAssignments: [
        {
          id: "durga-alpana",
          assetId: "alpana-bengal",
          region: "hero_background",
          enabled: true,
          size: "large",
          density: "clean",
          motion: "static",
          layer: 1,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "durga-marigold-toran",
          assetId: "marigold-mango-toran",
          region: "navigation_rail",
          enabled: true,
          size: "medium",
          density: "festive",
          motion: "garland_sway",
          layer: 2,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "durga-hibiscus",
          assetId: "hibiscus-red",
          region: "hero_foreground",
          enabled: true,
          size: "medium",
          density: "festive",
          motion: "petal_fall",
          layer: 3,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "durga-bells",
          assetId: "temple-bell",
          region: "navigation_rail",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "bell_swing",
          layer: 4,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "durga-conch",
          assetId: "conch-shell",
          region: "hero_foreground",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "gentle_wind",
          layer: 5,
          visibility: { desktop: true, tablet: false, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "durga-dhaak",
          assetId: "dhaak-drum",
          region: "axo_area",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "axo_interaction",
          layer: 6,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "durga-dhunuchi",
          assetId: "dhunuchi",
          region: "footer_decoration",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "glowing",
          layer: 7,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "durga-lotus",
          assetId: "lotus-pink",
          region: "card_corners",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "static",
          layer: 8,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        }
      ],
      festivalControls: {
        axoInteractionEnabled: true
      }
    },
    sound: {
      available: true,
      defaultState: "off",
      loop: true,
      culturallyReviewed: false
    }
  }),
  holi: pack({
    headerPreset: "colour_powder",
    heroPreset: "corner_cluster",
    innerPagePreset: "card_tint",
    particlePreset: "powder_dots",
    animationPreset: "pichkari_spray",
    animationEnabled: true,
    animationIntensity: "medium",
    mobileSimplified: true,
    headerOrnaments: headerOrnaments(
      [
        ornament("holi-streamer-left", "streamer", "left", {
          hangingLength: 29,
          motion: "streamer",
          colour: "#6D28D9",
          secondaryColour: "#EC4899"
        }),
        ornament("holi-colour", "festival_icon", "center", {
          hangingLength: 25,
          motion: "float",
          icon: "colour_drop",
          colour: "#EC4899",
          secondaryColour: "#22B8CF"
        }),
        ornament("holi-medallion", "medallion", "right_center", {
          hangingLength: 31,
          motion: "rotate",
          colour: "#22B8CF",
          secondaryColour: "#F59E0B"
        }),
        ornament("holi-ribbon", "animated_ribbon", "center", {
          hangingLength: 9,
          motion: "streamer",
          mobileVisible: false,
          colour: "#6D28D9",
          secondaryColour: "#EC4899"
        })
      ],
      { garlandEnabled: false }
    ),
    interpretation: {
      motifs: {
        colourBursts: true,
        confetti: true
      }
    },
    studio: {
      artworkMode: "character",
      density: "festive",
      activeMotions: [
        "static",
        "floating",
        "colour_burst",
        "powder_splash",
        "axo_interaction"
      ],
      motifAssignments: [
        {
          id: "holi-gulal",
          assetId: "holi-gulal-cloud",
          region: "hero_background",
          enabled: true,
          size: "large",
          density: "festive",
          motion: "powder_splash",
          layer: 1,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "holi-pichkari",
          assetId: "holi-pichkari",
          region: "hero_foreground",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "colour_burst",
          layer: 2,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "holi-splash",
          assetId: "holi-edge-splash",
          region: "floating_edges",
          enabled: true,
          size: "large",
          density: "festive",
          motion: "colour_burst",
          layer: 3,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "holi-ribbon",
          assetId: "holi-colour-ribbon",
          region: "navigation_rail",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "gentle_wind",
          layer: 4,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "holi-axo",
          assetId: "axo-holi-pichkari",
          region: "axo_area",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "axo_interaction",
          layer: 5,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        }
      ],
      festivalControls: {
        gulalEnabled: true,
        pichkariEnabled: true,
        colourBurstIntensity: "medium",
        edgeSplashEnabled: true,
        axoInteractionEnabled: true
      }
    },
    sound: { available: true, defaultState: "off" }
  }),
  diwali: pack({
    headerPreset: "diya_lights",
    heroPreset: "festive_ribbon",
    footerPreset: "light_trim",
    particlePreset: "warm_lights",
    animationPreset: "controlled_fireworks",
    animationEnabled: true,
    animationIntensity: "low",
    mobileSimplified: true,
    culturallySensitiveArtwork: true,
    headerOrnaments: headerOrnaments(
      [
        ornament("diwali-garland", "garland_band", "center", {
          hangingLength: 14,
          motion: "none",
          colour: "#7D2712",
          secondaryColour: "#E69A18"
        }),
        ornament("diwali-lantern-left", "lantern", "left", {
          hangingLength: 35,
          colour: "#7D2712",
          secondaryColour: "#E69A18"
        }),
        ornament("diwali-diya", "festival_icon", "center", {
          hangingLength: 25,
          motion: "glow",
          icon: "diya",
          colour: "#9A3412",
          secondaryColour: "#FBBF24",
          culturalAssetApproved: true
        }),
        ornament("diwali-lantern-right", "lantern", "right", {
          hangingLength: 32,
          colour: "#7D2712",
          secondaryColour: "#E69A18"
        }),
        ornament("diwali-glow", "ambient_glow", "right_center", {
          hangingLength: 12,
          motion: "glow",
          mobileVisible: false,
          colour: "#FBBF24",
          secondaryColour: "#7D2712"
        })
      ],
      { approvedCulturalArtworkEnabled: true }
    ),
    interpretation: {
      motifs: {
        garlands: true,
        diyaGlow: true,
        warmParticles: true,
        lightStrings: true,
        fireworks: true,
        floralCorners: true
      }
    },
    studio: {
      artworkMode: "cultural",
      density: "festive",
      activeMotions: [
        "static",
        "garland_sway",
        "lantern_float",
        "glowing",
        "firework_sky"
      ],
      motifAssignments: [
        {
          id: "diwali-toran",
          assetId: "marigold-mango-toran",
          region: "navigation_rail",
          enabled: true,
          size: "medium",
          density: "festive",
          motion: "garland_sway",
          layer: 1,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "diwali-diya",
          assetId: "diya-brass",
          region: "hero_foreground",
          enabled: true,
          size: "medium",
          density: "festive",
          motion: "glowing",
          layer: 2,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "diwali-rangoli",
          assetId: "rangoli-diya",
          region: "hero_background",
          enabled: true,
          size: "large",
          density: "clean",
          motion: "static",
          layer: 3,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "diwali-lantern",
          assetId: "kandil-lantern",
          region: "navigation_rail",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "lantern_float",
          layer: 4,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "diwali-bell",
          assetId: "temple-bell",
          region: "navigation_rail",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "bell_swing",
          layer: 5,
          visibility: { desktop: true, tablet: false, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "diwali-lotus",
          assetId: "lotus-pink",
          region: "card_corners",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "static",
          layer: 6,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "diwali-firework",
          assetId: "safe-firework-gold",
          region: "page_ambience",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "firework_sky",
          layer: 7,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "diwali-axo",
          assetId: "axo-diwali-scarf",
          region: "axo_area",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "axo_interaction",
          layer: 8,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        }
      ],
      festivalControls: {
        axoInteractionEnabled: true,
        fireworksEnabled: true
      }
    },
    sound: { available: true, defaultState: "off", loop: false }
  }),
  christmas: pack({
    headerPreset: "festive_lights",
    heroPreset: "corner_cluster",
    footerPreset: "light_trim",
    particlePreset: "snow",
    animationPreset: "reindeer_movement",
    animationEnabled: true,
    animationIntensity: "low",
    mobileSimplified: true,
    headerOrnaments: headerOrnaments(
      [
        ornament("christmas-garland", "garland_band", "center", {
          hangingLength: 13,
          motion: "none",
          colour: "#1F7A4D",
          secondaryColour: "#C32135"
        }),
        ornament("christmas-bell", "bell", "left_center", {
          hangingLength: 30,
          colour: "#A71930",
          secondaryColour: "#D4A846"
        }),
        ornament("christmas-star", "festival_icon", "center", {
          hangingLength: 26,
          motion: "glow",
          icon: "star",
          colour: "#D4A846",
          secondaryColour: "#A71930"
        }),
        ornament("christmas-medallion", "medallion", "right_center", {
          hangingLength: 32,
          motion: "rotate",
          colour: "#1F7A4D",
          secondaryColour: "#F8F1D5"
        }),
        ornament("christmas-glow", "ambient_glow", "left", {
          hangingLength: 11,
          motion: "glow",
          mobileVisible: false,
          colour: "#D4A846",
          secondaryColour: "#1F7A4D"
        })
      ]
    ),
    interpretation: {
      motifs: {
        lightStrings: true,
        bells: true,
        stars: true,
        snow: true,
        silhouettes: true
      }
    },
    studio: {
      artworkMode: "character",
      density: "festive",
      activeMotions: [
        "static",
        "twinkling",
        "snowfall",
        "reindeer_journey",
        "gift_drop",
        "axo_interaction"
      ],
      motifAssignments: [
        {
          id: "christmas-pine",
          assetId: "pine-cone-branch",
          region: "navigation_rail",
          enabled: true,
          size: "medium",
          density: "festive",
          motion: "gentle_wind",
          layer: 1,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "christmas-tree",
          assetId: "christmas-tree",
          region: "hero_foreground",
          enabled: true,
          size: "large",
          density: "clean",
          motion: "twinkling",
          layer: 2,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "christmas-santa",
          assetId: "christmas-santa-sleigh",
          region: "hero_foreground",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "reindeer_journey",
          layer: 3,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "christmas-reindeer",
          assetId: "christmas-reindeer",
          region: "hero_foreground",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "reindeer_journey",
          layer: 4,
          visibility: { desktop: true, tablet: false, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "christmas-gift",
          assetId: "christmas-gift-stack",
          region: "floating_edges",
          enabled: true,
          size: "small",
          density: "clean",
          motion: "gift_drop",
          layer: 5,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "christmas-snow",
          assetId: "christmas-snowflake",
          region: "page_ambience",
          enabled: true,
          size: "small",
          density: "festive",
          motion: "snowfall",
          layer: 6,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        },
        {
          id: "christmas-snowman",
          assetId: "christmas-snowman",
          region: "footer_decoration",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "static",
          layer: 7,
          visibility: { desktop: true, tablet: true, mobile: false },
          religiousArtworkApproved: false
        },
        {
          id: "christmas-axo",
          assetId: "axo-christmas-hat",
          region: "axo_area",
          enabled: true,
          size: "medium",
          density: "clean",
          motion: "axo_interaction",
          layer: 8,
          visibility: { desktop: true, tablet: true, mobile: true },
          religiousArtworkApproved: false
        }
      ],
      festivalControls: {
        axoInteractionEnabled: true,
        snowfallEnabled: true,
        reindeerJourneyEnabled: true,
        giftDropEnabled: true
      }
    },
    sound: { available: true, defaultState: "off", loop: true }
  }),
  "new-year": pack({
    headerPreset: "stars",
    heroPreset: "festive_ribbon",
    footerPreset: "motif_band",
    particlePreset: "confetti",
    animationPreset: "controlled_fireworks",
    animationEnabled: true,
    animationIntensity: "low",
    mobileSimplified: true,
    headerOrnaments: headerOrnaments(
      [
        ornament("new-year-ribbon", "animated_ribbon", "center", {
          hangingLength: 10,
          motion: "streamer",
          colour: "#3949AB",
          secondaryColour: "#C58A20"
        }),
        ornament("new-year-star-left", "festival_icon", "left_center", {
          hangingLength: 27,
          motion: "glow",
          icon: "star",
          colour: "#C58A20",
          secondaryColour: "#3949AB"
        }),
        ornament("new-year-medallion", "medallion", "right_center", {
          hangingLength: 31,
          motion: "rotate",
          colour: "#3949AB",
          secondaryColour: "#C58A20"
        })
      ],
      { garlandEnabled: false }
    ),
    interpretation: {
      motifs: {
        stars: true,
        confetti: true,
        fireworks: true
      }
    },
    sound: { available: true, defaultState: "off" }
  }),
  "new-years-eve": pack({
    headerPreset: "stars",
    heroPreset: "festive_ribbon",
    footerPreset: "motif_band",
    particlePreset: "confetti",
    animationPreset: "controlled_fireworks",
    animationEnabled: true,
    animationIntensity: "low",
    mobileSimplified: true,
    interpretation: {
      motifs: {
        stars: true,
        confetti: true,
        fireworks: true
      }
    },
    sound: { available: true, defaultState: "off" }
  }),
  "raksha-bandhan": floral,
  janmashtami: {
    ...calmReligious,
    headerPreset: "floral",
    headerOrnaments: headerOrnaments(
      [
        ornament("janmashtami-garland", "garland_band", "center", {
          hangingLength: 13,
          motion: "none",
          colour: "#2E7D5A",
          secondaryColour: "#E1A833"
        }),
        ornament("janmashtami-flute", "festival_icon", "left_center", {
          hangingLength: 30,
          icon: "flute",
          colour: "#2E7D5A",
          secondaryColour: "#E1A833",
          culturalAssetApproved: true
        }),
        ornament("janmashtami-feather", "festival_icon", "right_center", {
          hangingLength: 27,
          motion: "float",
          icon: "peacock_feather",
          colour: "#245B91",
          secondaryColour: "#2E7D5A",
          culturalAssetApproved: true
        })
      ],
      { approvedCulturalArtworkEnabled: true }
    )
  },
  "ganesh-chaturthi": {
    ...floral,
    culturallySensitiveArtwork: true,
    headerOrnaments: headerOrnaments(
      [
        ornament("ganesh-garland", "garland_band", "center", {
          hangingLength: 14,
          motion: "none",
          colour: "#B63B24",
          secondaryColour: "#F0A62A"
        }),
        ornament("ganesh-modak", "festival_icon", "left_center", {
          hangingLength: 29,
          icon: "modak",
          colour: "#B63B24",
          secondaryColour: "#F0A62A",
          culturalAssetApproved: true
        }),
        ornament("ganesh-medallion", "medallion", "right_center", {
          hangingLength: 31,
          motion: "rotate",
          colour: "#B63B24",
          secondaryColour: "#F0A62A"
        })
      ],
      { approvedCulturalArtworkEnabled: true }
    )
  },
  onam: {
    ...floral,
    headerOrnaments: headerOrnaments(
      [
        ornament("onam-garland", "garland_band", "center", {
          hangingLength: 14,
          motion: "none",
          colour: "#2E7D32",
          secondaryColour: "#E9A23B"
        }),
        ornament("onam-flower-left", "festival_icon", "left_center", {
          hangingLength: 29,
          icon: "flower",
          colour: "#E9A23B",
          secondaryColour: "#A33A2A"
        }),
        ornament("onam-flower-right", "festival_icon", "right_center", {
          hangingLength: 29,
          icon: "flower",
          colour: "#A33A2A",
          secondaryColour: "#E9A23B"
        })
      ]
    )
  },
  pongal: harvest,
  "makar-sankranti": harvest,
  baisakhi: harvest,
  lohri: harvest,
  bihu: harvest,
  "poila-boishakh": pack({
    headerPreset: "alpana",
    particlePreset: "petals",
    animationPreset: "floating_decorations",
    animationEnabled: true,
    animationIntensity: "low",
    culturallySensitiveArtwork: true,
    interpretation: {
      motifs: {
        alpana: true,
        garlands: true,
        floralCorners: true
      }
    }
  }),
  "bengali-new-year": pack({
    headerPreset: "alpana",
    particlePreset: "petals",
    animationPreset: "floating_decorations",
    animationEnabled: true,
    animationIntensity: "low",
    culturallySensitiveArtwork: true,
    interpretation: {
      motifs: {
        alpana: true,
        garlands: true,
        floralCorners: true
      }
    }
  }),
  "kali-puja": calmReligious,
  "lakshmi-puja": floral,
  "dussehra": floral,
  "navratri": floral,
  "vishwakarma-puja": harvest,
  "basant-panchami": floral,
  "saraswati-puja": floral,
  "maha-shivratri": calmReligious,
  "ram-navami": calmReligious,
  "hanuman-jayanti": calmReligious,
  "akshaya-tritiya": floral,
  "govardhan-puja": floral,
  "bhai-dooj": floral,
  "chhath-puja": calmReligious,
  ramadan: calmReligious,
  "eid-al-fitr": calmReligious,
  "eid-al-adha": calmReligious,
  "islamic-new-year": calmReligious,
  "milad-un-nabi": calmReligious,
  "shab-e-barat": calmReligious,
  muharram: { ...calmReligious, animationEnabled: false, animationPreset: "none" },
  gurpurab: { ...calmReligious, headerPreset: "floral" },
  "buddha-purnima": pack({
    headerPreset: "floral",
    particlePreset: "none",
    animationPreset: "subtle_glow",
    animationEnabled: true,
    animationIntensity: "low",
    culturallySensitiveArtwork: true
  }),
  "mahavir-jayanti": { ...calmReligious, animationEnabled: false, animationPreset: "none" },
  paryushan: { ...calmReligious, animationEnabled: false, animationPreset: "none" },
  "good-friday": { ...calmReligious, animationEnabled: false, animationPreset: "none" },
  easter: floral,
  "gudi-padwa": floral,
  ugadi: floral,
  "kerala-piravi": floral,
  "tamil-new-year": harvest,
  "valentines-day": floral,
  halloween: pack({
    headerPreset: "lanterns",
    heroPreset: "corner_cluster",
    footerPreset: "light_trim",
    particlePreset: "soft_sparkles",
    animationPreset: "floating_decorations",
    animationEnabled: true,
    animationIntensity: "low",
    mobileSimplified: true,
    headerOrnaments: headerOrnaments(
      [
        ornament("halloween-lantern-left", "lantern", "left_center", {
          hangingLength: 30,
          colour: "#5B2A86",
          secondaryColour: "#F28A22"
        }),
        ornament("halloween-medallion", "medallion", "center", {
          hangingLength: 28,
          motion: "rotate",
          colour: "#5B2A86",
          secondaryColour: "#F28A22"
        }),
        ornament("halloween-lantern-right", "lantern", "right_center", {
          hangingLength: 31,
          colour: "#5B2A86",
          secondaryColour: "#F28A22"
        })
      ],
      { density: "minimal", garlandEnabled: false }
    ),
    interpretation: {
      motifs: {
        lanterns: true,
        stars: true,
        warmParticles: true
      }
    }
  }),
  "womens-day": business,
  "world-environment-day": pack({
    headerPreset: "floral",
    particlePreset: "leaves",
    animationPreset: "floating_decorations",
    animationEnabled: true,
    animationIntensity: "low"
  }),
  "international-yoga-day": { ...DEFAULT_EXPERIENCE_PACK },
  "teachers-day": business,
  "childrens-day": pack({
    headerPreset: "spectrum_line",
    particlePreset: "soft_sparkles",
    animationPreset: "sparkles",
    animationEnabled: true,
    animationIntensity: "low"
  }),
  "labour-day": campaign,
  "earth-day": pack({
    headerPreset: "floral",
    particlePreset: "leaves",
    animationPreset: "floating_decorations",
    animationEnabled: true,
    animationIntensity: "low"
  }),
  "world-health-day": campaign,
  "company-anniversary": business,
  "founders-day": business,
  "recruitment-drive": campaign,
  "annual-report-season": campaign,
  "financial-year-end": campaign,
  "admission-season": campaign,
  "results-season": campaign,
  "customer-appreciation-week": business,
  "trust-safety-campaign": campaign,
  "corporate-reporting-campaign": campaign,
  "custom-event": pack({
    headerOrnaments: headerOrnaments(
      [
        ornament("custom-ribbon", "animated_ribbon", "center", {
          hangingLength: 10,
          motion: "streamer"
        }),
        ornament("custom-medallion", "medallion", "right_center", {
          hangingLength: 28,
          mobileVisible: false
        })
      ],
      {
        mode: "mixed",
        density: "minimal",
        garlandEnabled: false,
        ornamentCount: 2
      }
    )
  }),
  default: DEFAULT_EXPERIENCE_PACK
};

export function resolveExperiencePack(
  slug: string,
  stored: Partial<HolidayExperiencePackConfig> | null | undefined
): HolidayExperiencePackConfig {
  const starter = STARTER_EXPERIENCE_PACKS[slug] || DEFAULT_EXPERIENCE_PACK;
  const storedInterpretation = stored?.interpretation;
  const storedHeaderOrnaments = stored?.headerOrnaments;
  const storedStudio = stored?.studio;
  const resolvedStudioRegions = Object.fromEntries(
    HOLIDAY_STUDIO_REGIONS.map((region) => [
      region,
      {
        ...starter.studio.regions[region],
        ...(storedStudio?.regions?.[region] || {}),
        visibility: {
          ...starter.studio.regions[region].visibility,
          ...(storedStudio?.regions?.[region]?.visibility || {})
        }
      }
    ])
  ) as HolidayExperiencePackConfig["studio"]["regions"];
  return {
    ...starter,
    ...(stored || {}),
    version: 1,
    headerOrnaments: {
      ...starter.headerOrnaments,
      ...(storedHeaderOrnaments || {}),
      items:
        storedHeaderOrnaments?.items || starter.headerOrnaments.items
    },
    interpretation: {
      ...starter.interpretation,
      ...(storedInterpretation || {}),
      regions: {
        ...starter.interpretation.regions,
        ...(storedInterpretation?.regions || {})
      },
      motifs: {
        ...starter.interpretation.motifs,
        ...(storedInterpretation?.motifs || {})
      }
    },
    studio: {
      ...starter.studio,
      ...(storedStudio || {}),
      regions: resolvedStudioRegions,
      motifAssignments:
        storedStudio?.motifAssignments || starter.studio.motifAssignments,
      festivalControls: {
        ...starter.studio.festivalControls,
        ...(storedStudio?.festivalControls || {})
      },
      qualityGate: {
        ...starter.studio.qualityGate,
        ...(storedStudio?.qualityGate || {})
      }
    },
    sound: { ...starter.sound, ...(stored?.sound || {}) },
    accessibility: {
      ...starter.accessibility,
      ...(stored?.accessibility || {})
    },
    protectedLoginBrand: {
      ...starter.protectedLoginBrand,
      ...(stored?.protectedLoginBrand || {})
    }
  };
}

export function assetAvailabilityForPack({
  assets,
  level,
  soundAvailable
}: {
  assets: HolidayThemeAsset[];
  level: HolidayExperienceLevel;
  soundAvailable: boolean;
}): HolidayAssetAvailabilityState[] {
  const candidates = assets.filter((asset) =>
    ["active", "staged"].includes(asset.status) &&
    (asset.libraryApprovalState || "approved") === "approved"
  );
  const approved = candidates.filter(
    (asset) =>
      asset.status === "active" &&
      asset.reviewStatus === "approved" &&
      ["approved", "approved_with_size_restrictions"].includes(
        asset.qualityStatus
      )
  );
  const roles = new Set(approved.map((asset) => asset.role));
  const states = new Set<HolidayAssetAvailabilityState>();

  if (
    candidates.some(
      (asset) =>
        asset.reviewStatus === "pending_review" ||
        !["approved", "approved_with_size_restrictions"].includes(
          asset.qualityStatus
        )
    )
  ) {
    states.add("awaiting_approval");
  }
  if (!roles.has("login_desktop") && !roles.has("login_background")) {
    states.add("login_assets_missing");
  }
  if (
    level === "enhanced" &&
    !roles.has("reference_image") &&
    !roles.has("hero_art") &&
    !roles.has("supporting") &&
    !roles.has("decorative_overlay")
  ) {
    states.add("website_assets_missing");
  }
  if (!roles.has("axo") && !roles.has("axo_animation")) {
    states.add("axo_assets_missing");
  }
  if (soundAvailable && !roles.has("audio")) states.add("audio_missing");
  if (
    approved.length === 0 ||
    (level === "enhanced" && states.has("website_assets_missing"))
  ) {
    states.add("fallback_only");
  }

  if (states.size === 0) {
    states.add("complete");
    states.add("ready_to_activate");
  } else if (
    !states.has("awaiting_approval") &&
    level !== "enhanced"
  ) {
    states.add("partial");
    states.add("ready_to_activate");
  } else {
    states.add("partial");
  }
  return [...states];
}
