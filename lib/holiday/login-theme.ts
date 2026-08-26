import type {
  HolidayLoginCompositionConfig,
  HolidayLoginFormSkinVariant,
  HolidayLoginHeroCrop,
  HolidayTheme
} from "./types";
import { findDesignerLoginPack } from "./designer-login-packs";

const lightSkin: HolidayLoginFormSkinVariant = {
  cardBackground: "#ffffff",
  headingColor: "#111d62",
  bodyColor: "#4d5b89",
  inputBackground: "#ffffff",
  inputBorder: "#d8d7ef",
  focusRing: "#6d28d9",
  ctaStart: "#6d28d9",
  ctaEnd: "#e83874"
};

const darkSkin: HolidayLoginFormSkinVariant = {
  cardBackground: "#111632",
  headingColor: "#f7f8ff",
  bodyColor: "#c4cae5",
  inputBackground: "#080b20",
  inputBorder: "#353b68",
  focusRing: "#a78bfa",
  ctaStart: "#7c3aed",
  ctaEnd: "#f43f7d"
};

const defaultCrop = (
  focalX: number,
  focalY: number,
  zoom: number
): HolidayLoginHeroCrop => ({
  focalX,
  focalY,
  zoom,
  cropRect: { x: 0, y: 0, width: 100, height: 100 },
  subjectSafeArea: { x: 4, y: 5, width: 56, height: 90 },
  protectedContentArea: { x: 3, y: 3, width: 42, height: 28 },
  excludedEmbeddedFormArea: { x: 62, y: 0, width: 38, height: 100 }
});

export function defaultHolidayLoginComposition(): HolidayLoginCompositionConfig {
  return {
    version: 1,
    applyMode: "hero_themed_form",
    appearanceMode: "system",
    source: {
      mode: "standard_festival_theme",
      packId: null,
      mobileMode: "background_form",
      usePackageLogo: true
    },
    layout: {
      desktopColumns: "58_42",
      transition: "soft_blend",
      formMaxWidthPx: 512,
      formAnchor: "center",
      canvasExtensionDirection: "right",
      compositionBalance: 58
    },
    hero: {
      embeddedUiState: "needs_review",
      safeCropApproved: true,
      fitMode: "smart_crop",
      derivativeVersion: 1,
      focalX: 25,
      focalY: 50,
      zoom: 1.08,
      crops: {
        desktopWide: defaultCrop(30, 50, 1.04),
        desktopSplit: defaultCrop(25, 50, 1.08),
        tablet: defaultCrop(30, 48, 1.04),
        mobileBanner: defaultCrop(30, 44, 1.02),
        mobilePortrait: defaultCrop(25, 48, 1.08)
      },
      mobileMode: "form_first",
      lightOverlayOpacity: 0.04,
      darkOverlayOpacity: 0.34
    },
    formSkin: {
      mode: "extracted_theme",
      cardOpacity: 0.9,
      blurPx: 24,
      borderWidthPx: 1,
      radiusPx: 28,
      glowStrength: 0.18,
      light: { ...lightSkin },
      dark: { ...darkSkin }
    },
    background: {
      enabled: true,
      intensity: 0.22,
      texture: "festival_ambience",
      strategy: "auto_best_fit",
      blendStrength: 0.68,
      seamSmoothing: 0.86,
      formSideAmbienceIntensity: 0.24,
      extendedBrightness: 1.04,
      extendedBlurPx: 28,
      highlightGlow: 0.14,
      overlayGrain: false,
      temperature: 0.08,
      contrastProtection: 0.72,
      edgeFadeWidthPercent: 16,
      mode: "theme_palette_gradient",
      pattern: "subtle_festival",
      light: {
        start: "#f7f3ff",
        end: "#fff7fb",
        patternColor: "#6d28d9"
      },
      dark: {
        start: "#0d1230",
        end: "#211447",
        patternColor: "#a78bfa"
      }
    },
    quality: {
      noEmptyBands: true,
      subjectScaleApproved: true,
      importantArtworkSafe: true,
      embeddedFormExcluded: true,
      formBackgroundComplete: true,
      noVisibleRepeat: true,
      uniformCanvasApproved: true,
      noHardSeam: true,
      contrastApproved: true,
      mobileCompositionApproved: true
    }
  };
}

export function festivalPackFullCanvasComposition(
  packId: string
): HolidayLoginCompositionConfig {
  const base = defaultHolidayLoginComposition();
  return {
    ...base,
    applyMode: "full_canvas_floating_form",
    source: {
      ...base.source,
      mode: "designer_complete_pack",
      packId: `festival-pack:${packId}`,
      mobileMode: "background_form",
      usePackageLogo: false
    },
    hero: {
      ...base.hero,
      embeddedUiState: "no_embedded_ui",
      safeCropApproved: true,
      lightOverlayOpacity: 0,
      darkOverlayOpacity: 0
    },
    background: {
      ...base.background,
      strategy: "clean_ambient_surface",
      mode: "uploaded_form_background",
      extendedBlurPx: 0,
      blendStrength: 0,
      seamSmoothing: 1,
      formSideAmbienceIntensity: 0,
      contrastProtection: 0.92
    },
    quality: Object.fromEntries(
      Object.keys(base.quality).map((key) => [key, true])
    ) as HolidayLoginCompositionConfig["quality"]
  };
}

export function resolveHolidayLoginComposition(
  value: Partial<HolidayLoginCompositionConfig> | null | undefined
): HolidayLoginCompositionConfig {
  const fallback = defaultHolidayLoginComposition();
  const storedHero = value?.hero;
  const storedCrops = storedHero?.crops;
  const source = { ...fallback.source, ...(value?.source || {}) };
  const upgradeDesignerCanvas =
    source.mode === "designer_complete_pack" &&
    (
      [
        "full_composition",
        "full_canvas_uniform",
        "full_canvas_floating_form"
      ] as const
    ).includes(
      value?.applyMode as
        | "full_composition"
        | "full_canvas_uniform"
        | "full_canvas_floating_form"
    );
  const applyMode = upgradeDesignerCanvas
      ? "full_natural_background"
      : value?.applyMode || fallback.applyMode;
  const layout = {
    ...fallback.layout,
    ...(value?.layout || {}),
    ...(upgradeDesignerCanvas
      ? {
          desktopColumns: "58_42" as const,
          formMaxWidthPx: 600,
          formAnchor: "center" as const,
          compositionBalance: 58
        }
      : {})
  };
  const background = {
    ...fallback.background,
    ...(value?.background || {}),
    light: {
      ...fallback.background.light,
      ...(value?.background?.light || {})
    },
    dark: {
      ...fallback.background.dark,
      ...(value?.background?.dark || {})
    },
    ...(upgradeDesignerCanvas
      ? {
          strategy: "clean_ambient_surface" as const,
          blendStrength: 0.62,
          seamSmoothing: 0.92,
          formSideAmbienceIntensity: 0.32,
          extendedBrightness: 1,
          extendedBlurPx: 0,
          highlightGlow: 0.08,
          overlayGrain: false,
          contrastProtection: 0.9,
          edgeFadeWidthPercent: 14
        }
      : {})
  };
  return {
    ...fallback,
    ...value,
    applyMode,
    version: 1,
    source,
    layout,
    hero: {
      ...fallback.hero,
      ...(storedHero || {}),
      crops: {
        desktopWide: {
          ...fallback.hero.crops.desktopWide,
          ...(storedCrops?.desktopWide || {})
        },
        desktopSplit: {
          ...fallback.hero.crops.desktopSplit,
          ...(storedCrops?.desktopSplit || {}),
          focalX:
            storedCrops?.desktopSplit?.focalX ??
            storedHero?.focalX ??
            fallback.hero.crops.desktopSplit.focalX,
          focalY:
            storedCrops?.desktopSplit?.focalY ??
            storedHero?.focalY ??
            fallback.hero.crops.desktopSplit.focalY,
          zoom:
            storedCrops?.desktopSplit?.zoom ??
            storedHero?.zoom ??
            fallback.hero.crops.desktopSplit.zoom
        },
        tablet: {
          ...fallback.hero.crops.tablet,
          ...(storedCrops?.tablet || {})
        },
        mobileBanner: {
          ...fallback.hero.crops.mobileBanner,
          ...(storedCrops?.mobileBanner || {})
        },
        mobilePortrait: {
          ...fallback.hero.crops.mobilePortrait,
          ...(storedCrops?.mobilePortrait || {})
        }
      }
    },
    formSkin: {
      ...fallback.formSkin,
      ...(value?.formSkin || {}),
      light: {
        ...fallback.formSkin.light,
        ...(value?.formSkin?.light || {})
      },
      dark: {
        ...fallback.formSkin.dark,
        ...(value?.formSkin?.dark || {})
      }
    },
    background,
    quality: { ...fallback.quality, ...(value?.quality || {}) }
  };
}

export function withThemePalette(
  config: HolidayLoginCompositionConfig,
  theme: Pick<HolidayTheme, "palette">
): HolidayLoginCompositionConfig {
  const background = {
    ...config.background,
    light: {
      start: theme.palette.surfaceTint || config.background.light.start,
      end:
        theme.palette.backgroundTint ||
        theme.palette.accentSoft ||
        config.background.light.end,
      patternColor: theme.palette.accent
    },
    dark: {
      start: config.background.dark.start,
      end: config.background.dark.end,
      patternColor: theme.palette.accentSoft
    }
  };
  if (config.formSkin.mode !== "extracted_theme") {
    return { ...config, background };
  }
  return {
    ...config,
    formSkin: {
      ...config.formSkin,
      light: {
        ...config.formSkin.light,
        inputBorder:
          theme.palette.borderHighlight || config.formSkin.light.inputBorder,
        focusRing: theme.palette.accent,
        ctaStart: theme.palette.ctaAccent || theme.palette.accent,
        ctaEnd: theme.palette.accentWarm
      },
      dark: {
        ...config.formSkin.dark,
        focusRing: theme.palette.accentSoft,
        ctaStart: theme.palette.accent,
        ctaEnd: theme.palette.accentWarm
      }
    },
    background
  };
}

export function loginCompositionActivationErrors(
  config: HolidayLoginCompositionConfig
) {
  const errors: string[] = [];
  if (config.source.mode === "designer_complete_pack") {
    const pack = findDesignerLoginPack(config.source.packId);
    const importedPack = config.source.packId?.startsWith("festival-pack:");
    if (!pack && !importedPack) {
      errors.push("Choose a validated Designer Complete Theme Pack.");
    } else if (pack && !pack.activationReady) {
      errors.push("The selected Designer Complete Theme Pack is not activation-ready.");
    }
  }
  if (
    config.applyMode !== "default" &&
    config.hero.embeddedUiState === "contains_embedded_ui" &&
    !config.hero.safeCropApproved
  ) {
    errors.push(
      "Activation is blocked until the embedded login UI is excluded by an approved hero crop."
    );
  }
  for (const [breakpoint, crop] of Object.entries(config.hero.crops)) {
    if (crop.zoom < 1 || crop.zoom > 2.5) {
      errors.push(`${breakpoint} hero zoom must remain between 1x and 2.5x.`);
    }
    if (
      crop.focalX < 0 ||
      crop.focalX > 100 ||
      crop.focalY < 0 ||
      crop.focalY > 100
    ) {
      errors.push(`${breakpoint} focal point must remain inside the artwork.`);
    }
  }
  if (config.formSkin.cardOpacity < 0.72) {
    errors.push("Form-card opacity is too low for reliable readability.");
  }
  if (
    config.hero.fitMode === "fit_entire_artwork" &&
    config.hero.embeddedUiState === "contains_embedded_ui"
  ) {
    errors.push(
      "Fit Entire Artwork cannot be activated while the source contains embedded login UI."
    );
  }
  const qualityErrors: Array<
    [keyof HolidayLoginCompositionConfig["quality"], string]
  > = [
    ["noEmptyBands", "Hero contains unintended empty bands."],
    ["subjectScaleApproved", "Hero subject is too small for the selected crop."],
    ["importantArtworkSafe", "Important artwork is cropped incorrectly."],
    ["embeddedFormExcluded", "Embedded fake login UI remains visible."],
    [
      "formBackgroundComplete",
      "Form-side background does not cover the complete panel."
    ],
    ["noVisibleRepeat", "Form-side background repeats visibly."],
    ["uniformCanvasApproved", "The full-page canvas has not passed review."],
    ["noHardSeam", "A hard hero-to-form seam remains visible."],
    ["contrastApproved", "Text or input contrast has not passed review."],
    ["mobileCompositionApproved", "Mobile login composition is broken."]
  ];
  for (const [key, message] of qualityErrors) {
    if (!config.quality[key]) errors.push(message);
  }
  return errors;
}

export function loginCompositionUsesThemedForm(
  config: HolidayLoginCompositionConfig
) {
  return [
    "hero_themed_form",
    "full_composition",
    "full_natural_background",
    "full_canvas_uniform",
    "full_canvas_floating_form"
  ].includes(config.applyMode);
}

export const LOGIN_HERO_RESPONSIVE_WIDTHS = [
  480, 768, 960, 1280, 1536, 1920, 2560, 3840, 5120, 7680
] as const;
