import type {
  HolidayStudioMotion,
  HolidayThemeAsset
} from "./types";

export const FESTIVAL_MOTIF_CATEGORIES = [
  "flowers_botanicals",
  "ceremonial_objects",
  "patterns",
  "light_fire",
  "holi",
  "christmas",
  "national_cultural",
  "axo_accessories"
] as const;

export type FestivalMotifCategory =
  (typeof FESTIVAL_MOTIF_CATEGORIES)[number];

export type FestivalMotifQualityStatus =
  HolidayThemeAsset["qualityStatus"];

export type FestivalMotifDefinition = {
  id: string;
  name: string;
  category: FestivalMotifCategory;
  intendedObject: string;
  intendedFestivals: string[];
  path: string;
  presentation:
    | "single"
    | "cluster"
    | "garland"
    | "toran"
    | "border"
    | "corner"
    | "scene"
    | "overlay"
    | "axo";
  visualStyle: "premium_flat" | "soft_dimensional" | "rich_festive";
  supportedMotions: HolidayStudioMotion[];
  qualityStatus: FestivalMotifQualityStatus;
  sizeRestrictions: string | null;
  culturalReviewRequired: boolean;
  religiousApprovalRequired: boolean;
  auditClassification: "keep" | "improve" | "replace" | "remove";
  reviewNote: string;
  source?: "built_in" | "governed";
  libraryAssetId?: string;
  assetVersionId?: string;
  assetVersionNumber?: number;
  checksumSha256?: string | null;
  sourceCategory?: string | null;
  supportedRegions?: string[];
  completeComposition?: boolean;
};

const asset = (
  definition: Omit<FestivalMotifDefinition, "path">
): FestivalMotifDefinition => ({
  ...definition,
  path: `/festival-assets/library/${definition.category}/${definition.id}.svg`
});

export const FESTIVAL_MOTIF_LIBRARY: FestivalMotifDefinition[] = [
  asset({
    id: "marigold-yellow",
    name: "Yellow marigold",
    category: "flowers_botanicals",
    intendedObject: "Dense yellow marigold flower head",
    intendedFestivals: ["durga-puja", "diwali", "dussehra", "onam"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind", "petal_fall"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 32px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Replaces the eye-like radial rosette with layered ruffled petals."
  }),
  asset({
    id: "marigold-orange",
    name: "Orange marigold",
    category: "flowers_botanicals",
    intendedObject: "Dense orange marigold flower head",
    intendedFestivals: ["durga-puja", "diwali", "dussehra", "onam"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind", "petal_fall"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 32px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Layered irregular petals avoid a pupil or iris-like centre."
  }),
  asset({
    id: "marigold-saffron",
    name: "Saffron marigold",
    category: "flowers_botanicals",
    intendedObject: "Dense saffron marigold flower head",
    intendedFestivals: ["durga-puja", "diwali", "dussehra"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind", "petal_fall"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 32px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Uses clustered petal variation and no dark circular centre."
  }),
  asset({
    id: "marigold-garland",
    name: "Marigold garland",
    category: "flowers_botanicals",
    intendedObject: "Alternating yellow and orange marigold garland",
    intendedFestivals: ["durga-puja", "diwali", "dussehra", "onam"],
    presentation: "garland",
    visualStyle: "rich_festive",
    supportedMotions: ["static", "garland_sway", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Use between 280px and 1440px wide.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Built from the corrected ruffled marigold heads."
  }),
  asset({
    id: "marigold-mango-toran",
    name: "Marigold and mango-leaf toran",
    category: "flowers_botanicals",
    intendedObject: "Mango-leaf toran with marigold clusters",
    intendedFestivals: ["durga-puja", "diwali", "ganesh-chaturthi"],
    presentation: "toran",
    visualStyle: "rich_festive",
    supportedMotions: ["static", "garland_sway", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Use as a horizontal rail at 48px or taller.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Distinct leaf silhouettes and layered flower clusters."
  }),
  asset({
    id: "lotus-pink",
    name: "Pink lotus",
    category: "flowers_botanicals",
    intendedObject: "Layered pink lotus in a natural bowl form",
    intendedFestivals: ["diwali", "lakshmi-puja", "durga-puja"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "floating"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 48px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Broad pointed petals keep it distinct from mandala artwork."
  }),
  asset({
    id: "rose-red",
    name: "Red rose",
    category: "flowers_botanicals",
    intendedObject: "Layered red rose with overlapping spiral folds",
    intendedFestivals: ["valentines-day", "womens-day", "custom-event"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "petal_fall"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 40px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Overlapping petal folds avoid a flat ribbon appearance."
  }),
  asset({
    id: "jasmine-cluster",
    name: "Jasmine cluster",
    category: "flowers_botanicals",
    intendedObject: "Small white jasmine flowers with buds and leaves",
    intendedFestivals: ["onam", "pongal", "custom-event"],
    presentation: "cluster",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind", "petal_fall"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 56px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Leaf-and-bud context keeps the narrow petals distinct from snowflakes."
  }),
  asset({
    id: "hibiscus-red",
    name: "Red hibiscus",
    category: "flowers_botanicals",
    intendedObject: "Five-petal hibiscus with a long projecting stamen",
    intendedFestivals: ["durga-puja", "kali-puja"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind", "petal_fall"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 52px so the stamen remains visible.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Anatomical stamen and broad petals make the species unambiguous."
  }),
  asset({
    id: "tuberose-stem",
    name: "Tuberose stem",
    category: "flowers_botanicals",
    intendedObject: "Vertical tuberose stem with tubular white blooms",
    intendedFestivals: ["durga-puja", "wedding-season", "custom-event"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Render at least 80px tall.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Vertical clustered blooms distinguish tuberose from jasmine."
  }),
  asset({
    id: "chrysanthemum-gold",
    name: "Golden chrysanthemum",
    category: "flowers_botanicals",
    intendedObject: "Dense chrysanthemum with numerous thin layered petals",
    intendedFestivals: ["durga-puja", "diwali", "custom-event"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "petal_fall"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Minimum rendered size 56px to retain thin-petal detail.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Long narrow petals distinguish it from ruffled marigold heads."
  }),
  asset({
    id: "palash-branch",
    name: "Palash branch",
    category: "flowers_botanicals",
    intendedObject: "Branch of curved orange-red palash flowers",
    intendedFestivals: ["holi", "basant-panchami"],
    presentation: "cluster",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 80px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Curved grouped petals read as flowers rather than fire icons."
  }),
  asset({
    id: "pine-cone-branch",
    name: "Pine branch and cone",
    category: "flowers_botanicals",
    intendedObject: "Evergreen pine branch with a layered pine cone",
    intendedFestivals: ["christmas", "new-year"],
    presentation: "corner",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 72px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Needles and cone scales remain distinct in both themes."
  }),
  asset({
    id: "holly-sprig",
    name: "Holly sprig",
    category: "flowers_botanicals",
    intendedObject: "Pointed holly leaves with red berries",
    intendedFestivals: ["christmas"],
    presentation: "cluster",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 56px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Pointed leaves and red berries distinguish it from mistletoe."
  }),
  asset({
    id: "mistletoe-sprig",
    name: "Mistletoe sprig",
    category: "flowers_botanicals",
    intendedObject: "Rounded mistletoe leaves with white berries",
    intendedFestivals: ["christmas"],
    presentation: "cluster",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 56px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Rounded leaves and white berries prevent confusion with holly."
  }),
  asset({
    id: "diya-brass",
    name: "Brass diya",
    category: "light_fire",
    intendedObject: "Traditional oil lamp with bowl, wick and flame",
    intendedFestivals: ["diwali", "durga-puja", "lakshmi-puja"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "glowing", "floating"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 40px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "The raised wick and asymmetric bowl avoid an eye-like oval."
  }),
  asset({
    id: "diya-row",
    name: "Oil-lamp row",
    category: "light_fire",
    intendedObject: "Row of traditional brass diyas",
    intendedFestivals: ["diwali", "lakshmi-puja"],
    presentation: "border",
    visualStyle: "rich_festive",
    supportedMotions: ["static", "glowing"],
    qualityStatus: "approved",
    sizeRestrictions: "Use at 48px or taller.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Each lamp retains a visible pedestal, bowl, wick and flame."
  }),
  asset({
    id: "temple-bell",
    name: "Temple bell",
    category: "ceremonial_objects",
    intendedObject: "Metal temple bell with crown, body and clapper",
    intendedFestivals: ["durga-puja", "diwali", "dussehra"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "bell_swing"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 44px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Crown and visible clapper preserve the bell silhouette in motion."
  }),
  asset({
    id: "conch-shell",
    name: "Conch shell",
    category: "ceremonial_objects",
    intendedObject: "Curved spiral conch with a natural opening",
    intendedFestivals: ["durga-puja", "janmashtami"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "floating", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 54px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Shell ridges, lip and opening prevent an abstract horn reading."
  }),
  asset({
    id: "dhaak-drum",
    name: "Dhaak drum",
    category: "ceremonial_objects",
    intendedObject: "Bengali dhaak with barrel body, lacing and sticks",
    intendedFestivals: ["durga-puja", "kali-puja"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "floating", "axo_interaction"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 72px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Barrel proportions and crossing laces are visually recognisable."
  }),
  asset({
    id: "dhunuchi",
    name: "Dhunuchi",
    category: "ceremonial_objects",
    intendedObject: "Handled incense burner with a controlled smoke plume",
    intendedFestivals: ["durga-puja"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "glowing", "floating"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Minimum rendered size 64px so the handle stays clear.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Cup, pedestal, handle and smoke are separated cleanly."
  }),
  asset({
    id: "kandil-lantern",
    name: "Festive kandil lantern",
    category: "light_fire",
    intendedObject: "Hanging framed lantern with tassels and warm light",
    intendedFestivals: ["diwali", "eid-al-fitr", "custom-event"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "lantern_float", "glowing"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 56px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Frame, suspension and light source remain visible."
  }),
  asset({
    id: "alpana-bengal",
    name: "Bengali alpana",
    category: "patterns",
    intendedObject: "White Bengali alpana floor pattern",
    intendedFestivals: ["durga-puja", "poila-boishakh"],
    presentation: "single",
    visualStyle: "premium_flat",
    supportedMotions: ["static", "paper_craft_rotation"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 64px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Clean symmetric rice-paste forms stay distinct from lotus artwork."
  }),
  asset({
    id: "rangoli-diya",
    name: "Diwali rangoli",
    category: "patterns",
    intendedObject: "Geometric rangoli with petal and diya forms",
    intendedFestivals: ["diwali"],
    presentation: "single",
    visualStyle: "rich_festive",
    supportedMotions: ["static", "glowing"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Minimum rendered size 96px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Even paths and separated colour fields survive dark mode."
  }),
  asset({
    id: "mandala-gold",
    name: "Gold mandala",
    category: "patterns",
    intendedObject: "Layered geometric circular medallion",
    intendedFestivals: ["diwali", "custom-event"],
    presentation: "single",
    visualStyle: "premium_flat",
    supportedMotions: ["static", "paper_craft_rotation"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Minimum rendered size 80px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Geometric line-work is intentionally distinct from botanical petals."
  }),
  asset({
    id: "holi-gulal-cloud",
    name: "Holi gulal cloud",
    category: "holi",
    intendedObject: "Layered cloud of coloured gulal powder",
    intendedFestivals: ["holi"],
    presentation: "overlay",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "powder_splash", "colour_burst"],
    qualityStatus: "approved",
    sizeRestrictions: "Keep opacity below 0.38 over page surfaces.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Irregular translucent particulate edges replace plain circles."
  }),
  asset({
    id: "holi-pichkari",
    name: "Holi pichkari",
    category: "holi",
    intendedObject: "Decorated pichkari with a controlled colour stream",
    intendedFestivals: ["holi"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "colour_burst", "axo_interaction"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 72px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Barrel, plunger, nozzle and stream are structurally clear."
  }),
  asset({
    id: "holi-edge-splash",
    name: "Holi edge splash",
    category: "holi",
    intendedObject: "Controlled coloured-powder edge splash",
    intendedFestivals: ["holi"],
    presentation: "corner",
    visualStyle: "rich_festive",
    supportedMotions: ["static", "powder_splash", "colour_burst"],
    qualityStatus: "approved",
    sizeRestrictions: "Edge-only placement; never over navigation or form controls.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Asymmetric powder texture avoids dot-field placeholder styling."
  }),
  asset({
    id: "holi-colour-ribbon",
    name: "Holi colour ribbon",
    category: "holi",
    intendedObject: "Layered flowing Holi colour ribbons",
    intendedFestivals: ["holi"],
    presentation: "border",
    visualStyle: "rich_festive",
    supportedMotions: ["static", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Horizontal header rail only; keep navigation text clear.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Continuous ribbons replace the generic coloured dot rail."
  }),
  asset({
    id: "safe-firework-gold",
    name: "Controlled gold firework",
    category: "light_fire",
    intendedObject: "Low-flash radial gold firework spark",
    intendedFestivals: ["diwali", "new-year"],
    presentation: "overlay",
    visualStyle: "premium_flat",
    supportedMotions: ["static", "firework_sky", "glowing"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions:
      "Background-only, low opacity, no rapid flashing and disabled for reduced motion.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Controlled separate spark trails; never placed over content."
  }),
  asset({
    id: "christmas-tree",
    name: "Christmas tree",
    category: "christmas",
    intendedObject: "Layered evergreen Christmas tree with ornaments and star",
    intendedFestivals: ["christmas"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "twinkling", "glowing"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 80px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Layered branches and trunk avoid a flat triangle icon."
  }),
  asset({
    id: "christmas-snowman",
    name: "Snowman",
    category: "christmas",
    intendedObject: "Proportioned snowman with hat, scarf and twig arms",
    intendedFestivals: ["christmas", "new-year"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "floating"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Minimum rendered size 88px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Fixed source-controlled character with clean silhouette."
  }),
  asset({
    id: "christmas-santa-sleigh",
    name: "Santa sleigh",
    category: "christmas",
    intendedObject: "Santa seated safely in a gift-filled sleigh",
    intendedFestivals: ["christmas"],
    presentation: "scene",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "reindeer_journey", "gift_drop"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Minimum rendered width 180px; header safe-path only.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Fixed reviewed proportions; no runtime-generated character anatomy."
  }),
  asset({
    id: "christmas-reindeer",
    name: "Reindeer",
    category: "christmas",
    intendedObject: "Side-profile reindeer with readable antlers and harness",
    intendedFestivals: ["christmas"],
    presentation: "single",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "reindeer_journey"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Minimum rendered width 120px; do not crop antlers.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Fixed source-controlled body and antler geometry."
  }),
  asset({
    id: "christmas-gift-stack",
    name: "Gift stack",
    category: "christmas",
    intendedObject: "Three wrapped gift boxes with bows",
    intendedFestivals: ["christmas", "new-year"],
    presentation: "cluster",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gift_drop", "floating"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 64px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Separate boxes and bows remain readable at mobile sizes."
  }),
  asset({
    id: "christmas-snowflake",
    name: "Snowflake",
    category: "christmas",
    intendedObject: "Six-branch ice crystal snowflake",
    intendedFestivals: ["christmas", "new-year"],
    presentation: "single",
    visualStyle: "premium_flat",
    supportedMotions: ["static", "snowfall", "twinkling"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 18px.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Six crystalline branches avoid a jasmine-flower silhouette."
  }),
  asset({
    id: "crescent-star-lantern",
    name: "Crescent and prayer lantern",
    category: "ceremonial_objects",
    intendedObject: "Crescent, star and framed hanging lantern",
    intendedFestivals: ["eid-al-fitr", "eid-al-adha", "ramadan"],
    presentation: "cluster",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "lantern_float", "glowing"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 72px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Decorative rather than devotional artwork; culturally reviewed."
  }),
  asset({
    id: "independence-ground-horizon",
    name: "Independence Day ground horizon",
    category: "national_cultural",
    intendedObject: "Restrained full-width tricolour horizon for page-bottom placement",
    intendedFestivals: ["independence-day"],
    presentation: "border",
    visualStyle: "premium_flat",
    supportedMotions: ["static"],
    qualityStatus: "approved",
    sizeRestrictions: "Full-width Ground or Page-bottom use only; do not crop the edge composition.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "keep",
    reviewNote: "Low-profile authored composition keeps content and controls unobstructed across breakpoints."
  }),
  asset({
    id: "independence-section-divider",
    name: "Independence Day section divider",
    category: "national_cultural",
    intendedObject: "Crisp full-width tricolour section and Footer-top divider",
    intendedFestivals: ["independence-day"],
    presentation: "border",
    visualStyle: "premium_flat",
    supportedMotions: ["static"],
    qualityStatus: "approved",
    sizeRestrictions: "Full-width divider use only; preserve the central navy geometry.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "keep",
    reviewNote: "Subtle authored line supports page hierarchy without imitating or distorting the national flag."
  }),
  asset({
    id: "tricolour-kite",
    name: "Tricolour kite",
    category: "national_cultural",
    intendedObject: "Indian tricolour kite with tail",
    intendedFestivals: ["independence-day", "republic-day", "makar-sankranti"],
    presentation: "single",
    visualStyle: "premium_flat",
    supportedMotions: ["static", "kite_flight"],
    qualityStatus: "approved",
    sizeRestrictions: "Minimum rendered size 42px.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Controlled flag palette without altering national symbols."
  }),
  asset({
    id: "tricolour-ribbon",
    name: "Tricolour ribbon",
    category: "national_cultural",
    intendedObject: "Flowing saffron, white and green ribbon",
    intendedFestivals: ["independence-day", "republic-day"],
    presentation: "border",
    visualStyle: "premium_flat",
    supportedMotions: ["static", "gentle_wind"],
    qualityStatus: "approved",
    sizeRestrictions: "Horizontal use only; preserve all three bands.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Simple national accent without simulating the flag incorrectly."
  }),
  asset({
    id: "axo-holi-pichkari",
    name: "Axo Holi pichkari overlay",
    category: "axo_accessories",
    intendedObject: "Axo-safe pichkari prop and powder scarf",
    intendedFestivals: ["holi"],
    presentation: "axo",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "axo_interaction", "colour_burst"],
    qualityStatus: "approved",
    sizeRestrictions: "Use only in the Axo accessory anchor.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "replace",
    reviewNote: "Local anchor prevents prop drift or chatbot obstruction."
  }),
  asset({
    id: "axo-independence-flag",
    name: "AXO Independence Day hand-held flag",
    category: "axo_accessories",
    intendedObject: "Correctly proportioned Indian flag fixed to AXO's raised hand",
    intendedFestivals: ["independence-day", "republic-day"],
    presentation: "axo",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "gentle_wind", "axo_interaction"],
    qualityStatus: "approved_with_size_restrictions",
    sizeRestrictions: "Use only as the full-bounds AXO overlay; keep face, chest logo and belt branding visible.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Versioned full-bounds placement keeps the flag pole attached to the raised hand on desktop, tablet and mobile."
  }),
  asset({
    id: "axo-diwali-scarf",
    name: "Axo Diwali scarf overlay",
    category: "axo_accessories",
    intendedObject: "Axo-safe festive scarf and miniature diya glow",
    intendedFestivals: ["diwali"],
    presentation: "axo",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "glowing", "axo_interaction"],
    qualityStatus: "approved",
    sizeRestrictions: "Use only in the Axo accessory anchor.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Decorative prop stays clear of Axo face and controls."
  }),
  asset({
    id: "axo-durga-puja",
    name: "Axo Bengali festive overlay",
    category: "axo_accessories",
    intendedObject: "Axo-safe Bengali festive scarf and dhaak accent",
    intendedFestivals: ["durga-puja"],
    presentation: "axo",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "axo_interaction"],
    qualityStatus: "approved",
    sizeRestrictions: "Use only in the Axo accessory anchor.",
    culturalReviewRequired: true,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Regional accent without deity artwork."
  }),
  asset({
    id: "axo-christmas-hat",
    name: "Axo Christmas hat overlay",
    category: "axo_accessories",
    intendedObject: "Axo-safe Santa hat and winter scarf",
    intendedFestivals: ["christmas"],
    presentation: "axo",
    visualStyle: "soft_dimensional",
    supportedMotions: ["static", "floating", "axo_interaction"],
    qualityStatus: "approved",
    sizeRestrictions: "Use only in the Axo accessory anchor.",
    culturalReviewRequired: false,
    religiousApprovalRequired: false,
    auditClassification: "improve",
    reviewNote: "Local overlay preserves Axo proportions."
  })
];

export const APPROVED_FESTIVAL_MOTIFS = FESTIVAL_MOTIF_LIBRARY.filter(
  (item) =>
    item.qualityStatus === "approved" ||
    item.qualityStatus === "approved_with_size_restrictions"
);

export function getFestivalMotif(assetId: string) {
  return FESTIVAL_MOTIF_LIBRARY.find((item) => item.id === assetId) || null;
}

export function isFestivalMotifPublishable(assetId: string) {
  const item = getFestivalMotif(assetId);
  return Boolean(
    item &&
      (item.qualityStatus === "approved" ||
        item.qualityStatus === "approved_with_size_restrictions")
  );
}

export function festivalMotifAuditSummary() {
  return FESTIVAL_MOTIF_LIBRARY.reduce(
    (summary, item) => {
      summary.total += 1;
      summary[item.auditClassification] += 1;
      return summary;
    },
    { total: 0, keep: 0, improve: 0, replace: 0, remove: 0 }
  );
}
