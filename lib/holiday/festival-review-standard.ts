export const FESTIVAL_REVIEW_CHECK_STATES = ["pass", "issue"] as const;

export type FestivalReviewCheckState =
  (typeof FESTIVAL_REVIEW_CHECK_STATES)[number];

export const FESTIVAL_REVIEW_UNIVERSAL_CHECKS = [
  ["source_thumbnail_load", "Source and thumbnail load"],
  ["exact_version_checksum", "Exact version and checksum available"],
  ["provenance_licensing", "Known provenance and licensing"],
  ["no_watermark", "No watermark"],
  ["professional_visual_quality", "Professional visual quality"],
  ["festival_relevance", "Correct festival or event relevance"],
  ["cultural_national_safety", "Cultural and national-symbol safety"],
  ["real_placement", "Real website placement verified"],
  ["responsive_desktop_tablet_mobile", "Desktop, tablet and mobile verified"],
  ["light_dark", "Light and Dark verified"],
  ["brand_safety", "Brand safety verified"],
  ["no_obstruction", "No click or content obstruction"],
  ["compatible_regions", "Compatible website regions confirmed"],
  ["distinctiveness", "Distinct from existing assets"]
] as const;

export type FestivalReviewUniversalCheck =
  (typeof FESTIVAL_REVIEW_UNIVERSAL_CHECKS)[number][0];

export const FESTIVAL_REVIEW_AXO_CHECKS = [
  ["correct_anchor", "Correct anchor"],
  ["correct_scale", "Correct scale"],
  ["correct_rotation", "Correct rotation"],
  ["grip_contact_aligned", "Grip or contact point aligned"],
  ["no_floating_gap", "No floating gap"],
  ["natural_character_interaction", "Natural character interaction"],
  ["correct_layer", "Correct foreground or background layer"],
  ["face_unobstructed", "Face unobstructed"],
  ["chest_branding_unobstructed", "Chest branding unobstructed"],
  ["belt_branding_unobstructed", "Belt branding unobstructed"],
  ["body_intersection_acceptable", "Body intersection acceptable"],
  ["desktop_safe", "Desktop placement safe"],
  ["tablet_safe", "Tablet placement safe"],
  ["mobile_safe", "Mobile placement safe"],
  ["light_mode_correct", "Light mode visually correct"],
  ["dark_mode_correct", "Dark mode visually correct"]
] as const;

export type FestivalReviewAxoCheck =
  (typeof FESTIVAL_REVIEW_AXO_CHECKS)[number][0];

export const FESTIVAL_REVIEW_CATEGORY_CHECKS = {
  header: [
    ["left_center_right_composition", "Left, centre and right composition"],
    ["full_header_width", "Full usable Header width"],
    ["navigation_safe", "Navigation-safe placement"],
    ["responsive_mobile_pack", "Responsive and mobile pack"],
    ["not_single_motif", "Not a single motif presented as a Header pack"]
  ],
  ground: [
    ["balanced_multi_element", "Balanced multi-element composition"],
    ["correct_lower_region", "Correct lower-page region"],
    ["no_overflow_obstruction", "No obstruction or overflow"]
  ],
  ambient: [
    ["subtle", "Subtle intensity"],
    ["pointer_events_none", "Pointer events disabled"],
    ["performance_safe", "Performance-safe"],
    ["mobile_reduction", "Mobile reduction available"],
    ["reduced_motion_fallback", "Reduced-motion fallback"]
  ],
  feature: [
    ["occasional_not_continuous", "Occasional, not continuously obstructive"],
    ["maximum_one", "Maximum one feature effect"],
    ["non_obstructive", "Non-obstructive placement"],
    ["mobile_reduced_motion_fallback", "Mobile and reduced-motion fallback"]
  ],
  login: [
    ["exact_selected_artwork", "Exact selected artwork"],
    ["no_baked_ui", "No baked logo, form or fake UI"],
    ["single_real_form", "One real functional form"],
    ["responsive_light_dark_safe", "Responsive and Light/Dark safe"]
  ]
} as const;

export const FESTIVAL_REVIEW_FOOTER_CHECKS = [
  ["full_footer_top", "Full Footer-top composition"],
  ["footer_links_chatbot_usable", "Footer links and chatbot remain usable"]
] as const;

export const FESTIVAL_REVIEW_SCORE_DIMENSIONS = [
  ["visualQuality", "Visual Quality", 20],
  ["realPlacement", "Real Placement", 15],
  ["festivalCulturalRelevance", "Festival/Cultural Relevance", 15],
  ["responsiveQuality", "Responsive Quality", 10],
  ["lightDarkQuality", "Light/Dark Quality", 10],
  ["brandSafety", "Brand Safety", 10],
  ["functionalSafety", "Functional Safety", 10],
  ["distinctiveness", "Distinctiveness", 5],
  ["performanceMotionSafety", "Performance/Motion Safety", 5]
] as const;

export type FestivalReviewScoreDimension =
  (typeof FESTIVAL_REVIEW_SCORE_DIMENSIONS)[number][0];

export const FESTIVAL_REVIEW_INTERACTION_RESULTS = [
  "correctly_held",
  "correctly_worn",
  "correctly_grounded",
  "correctly_side_carried",
  "no_separate_prop",
  "floating_incorrect",
  "needs_improvement"
] as const;

export type FestivalReviewInteractionResult =
  (typeof FESTIVAL_REVIEW_INTERACTION_RESULTS)[number];

export const FESTIVAL_REVIEW_CONTEXTS = [
  "desktop:light",
  "desktop:dark",
  "tablet:light",
  "tablet:dark",
  "mobile:light",
  "mobile:dark"
] as const;

export type FestivalReviewContext =
  (typeof FESTIVAL_REVIEW_CONTEXTS)[number];

export type FestivalReviewChecklist = Partial<
  Record<string, FestivalReviewCheckState>
>;

export type FestivalReviewScores = Partial<
  Record<FestivalReviewScoreDimension, number>
>;

export type FestivalAxoPlacementTransform = {
  offsetXPercent: number;
  offsetYPercent: number;
  scale: number;
  rotationDeg: number;
  zIndex: number;
};

export type FestivalAxoPlacement = {
  coordinateSpace: "axo_bounds" | "anchor_box";
  anchorType:
    | "right_hand"
    | "left_hand"
    | "two_hand"
    | "head"
    | "neck"
    | "chest_safe"
    | "side_carry"
    | "ground"
    | "back"
    | "background_behind_axo";
  anchorPoint: { x: number; y: number };
  gripPoint: { x: number; y: number };
  transforms: Record<"desktop" | "tablet" | "mobile", FestivalAxoPlacementTransform>;
  interactionResult?: FestivalReviewInteractionResult;
};

export function festivalReviewSpecificChecks(
  category: string,
  supportedRegions: string[] = []
): ReadonlyArray<readonly [string, string]> {
  if (category === "axo") return FESTIVAL_REVIEW_AXO_CHECKS;
  const base = category in FESTIVAL_REVIEW_CATEGORY_CHECKS
    ? FESTIVAL_REVIEW_CATEGORY_CHECKS[
        category as keyof typeof FESTIVAL_REVIEW_CATEGORY_CHECKS
      ]
    : [];
  if (
    category === "ground" &&
    supportedRegions.some((region) => /footer/i.test(region))
  ) {
    return [...base, ...FESTIVAL_REVIEW_FOOTER_CHECKS];
  }
  return base;
}

export function festivalReviewScore(scores: FestivalReviewScores = {}) {
  return FESTIVAL_REVIEW_SCORE_DIMENSIONS.reduce((total, [key, , maximum]) => {
    const value = Number(scores[key]);
    return total + (Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : 0);
  }, 0);
}

export function festivalReviewScoreComplete(scores: FestivalReviewScores = {}) {
  return FESTIVAL_REVIEW_SCORE_DIMENSIONS.every(([key, , maximum]) => {
    const value = Number(scores[key]);
    return Number.isFinite(value) && value >= 0 && value <= maximum;
  });
}

export function festivalReviewContextKey(
  viewport: "desktop" | "tablet" | "mobile",
  appearance: "light" | "dark"
): FestivalReviewContext {
  return `${viewport}:${appearance}` as FestivalReviewContext;
}

export function festivalReviewMissingContexts(contexts: string[] = []) {
  const completed = new Set(contexts);
  return FESTIVAL_REVIEW_CONTEXTS.filter((context) => !completed.has(context));
}

export function festivalReviewChecklistFailures(
  checks: ReadonlyArray<readonly [string, string]>,
  values: FestivalReviewChecklist = {}
) {
  return {
    incomplete: checks.filter(([key]) => values[key] !== "pass" && values[key] !== "issue"),
    issues: checks.filter(([key]) => values[key] === "issue")
  };
}

export const FESTIVAL_AXO_DEFAULT_PLACEMENT: FestivalAxoPlacement = {
  coordinateSpace: "anchor_box",
  anchorType: "right_hand",
  anchorPoint: { x: 0.865, y: 0.705 },
  gripPoint: { x: 0.5, y: 0.28 },
  transforms: {
    desktop: {
      offsetXPercent: 0,
      offsetYPercent: 0,
      scale: 1,
      rotationDeg: 0,
      zIndex: 3
    },
    tablet: {
      offsetXPercent: 0,
      offsetYPercent: 0,
      scale: 0.92,
      rotationDeg: 0,
      zIndex: 3
    },
    mobile: {
      offsetXPercent: 0,
      offsetYPercent: 0,
      scale: 0.82,
      rotationDeg: 0,
      zIndex: 3
    }
  }
};

export function festivalAxoPlacement(
  value: FestivalAxoPlacement | null | undefined,
  anchor: string | null | undefined
): FestivalAxoPlacement {
  if (value) return value;
  return {
    ...FESTIVAL_AXO_DEFAULT_PLACEMENT,
    anchorType: anchor === "left_hand"
      ? "left_hand"
      : anchor === "head"
        ? "head"
        : anchor === "ground"
          ? "ground"
          : "right_hand",
    anchorPoint: anchor === "left_hand"
      ? { x: 0.13, y: 0.4 }
      : anchor === "head"
        ? { x: 0.5, y: 0.16 }
        : anchor === "ground"
          ? { x: 0.78, y: 0.96 }
          : FESTIVAL_AXO_DEFAULT_PLACEMENT.anchorPoint
  };
}
