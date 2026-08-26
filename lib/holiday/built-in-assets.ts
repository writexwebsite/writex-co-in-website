export type BuiltInFestivalEffect =
  | "sway"
  | "diwali_lights"
  | "holi_spray"
  | "christmas_reindeer"
  | "eid_lanterns"
  | "national_ribbon"
  | "confetti";

export type BuiltInFestivalAssetPack = {
  slug: string;
  headerScene: string;
  heroAccent: string;
  axoOutfit: string;
  loginOverlay: string;
  icon: string;
  effect: BuiltInFestivalEffect;
  qualityStatus: "approved";
  fixedVersion: number;
};

export const BUILT_IN_FESTIVAL_ASSET_VERSION = 2;

const availablePacks = new Set([
  "durga-puja",
  "diwali",
  "holi",
  "christmas",
  "new-year",
  "independence-day",
  "republic-day",
  "janmashtami",
  "ganesh-chaturthi",
  "eid-al-fitr",
  "eid-al-adha",
  "onam",
  "raksha-bandhan",
  "navratri",
  "poila-boishakh",
  "valentines-day",
  "halloween",
  "teachers-day",
  "womens-day",
  "company-anniversary",
  "custom-event"
]);

const aliases: Record<string, string> = {
  "new-years-eve": "new-year",
  "bengali-new-year": "poila-boishakh",
  "kali-puja": "diwali",
  "lakshmi-puja": "diwali",
  dussehra: "durga-puja",
  ramadan: "eid-al-fitr",
  muharram: "eid-al-fitr",
  "islamic-new-year": "eid-al-fitr",
  "milad-un-nabi": "eid-al-fitr",
  "shab-e-barat": "eid-al-fitr",
  easter: "christmas",
  "childrens-day": "new-year",
  "founders-day": "company-anniversary",
  "recruitment-drive": "company-anniversary",
  "annual-report-season": "company-anniversary",
  "financial-year-end": "company-anniversary",
  "admission-season": "company-anniversary",
  "results-season": "company-anniversary"
};

function effectFor(slug: string): BuiltInFestivalEffect {
  if (slug === "diwali") return "diwali_lights";
  if (slug === "holi") return "holi_spray";
  if (slug === "christmas") return "christmas_reindeer";
  if (slug === "eid-al-fitr" || slug === "eid-al-adha") {
    return "eid_lanterns";
  }
  if (slug === "independence-day" || slug === "republic-day") {
    return "national_ribbon";
  }
  if (slug === "new-year" || slug === "company-anniversary") {
    return "confetti";
  }
  return "sway";
}

export function resolveBuiltInFestivalSlug(slug: string) {
  const normalized = aliases[slug] || slug;
  return availablePacks.has(normalized) ? normalized : "custom-event";
}

export function getBuiltInFestivalAssetPack(
  slug: string
): BuiltInFestivalAssetPack {
  const resolvedSlug = resolveBuiltInFestivalSlug(slug);
  const base = `/festival-assets/${resolvedSlug}`;
  const version = `?v=${BUILT_IN_FESTIVAL_ASSET_VERSION}`;
  const axoOutfit = resolvedSlug === "independence-day"
    ? "/festival-assets/library/axo_accessories/axo-independence-flag.svg?v=3"
    : `${base}/axo/outfit-overlay.svg${version}`;
  return {
    slug: resolvedSlug,
    headerScene: `${base}/header/scene.svg${version}`,
    heroAccent: `${base}/hero/corner-accent.svg${version}`,
    axoOutfit,
    loginOverlay: `${base}/overlays/login-corners.svg${version}`,
    icon: `${base}/icons/motif.svg${version}`,
    effect: effectFor(resolvedSlug),
    qualityStatus: "approved",
    fixedVersion: resolvedSlug === "independence-day"
      ? 3
      : BUILT_IN_FESTIVAL_ASSET_VERSION
  };
}

export function isBuiltInFestivalAssetPath(value: string) {
  return /^\/festival-assets\/(?:(?:[a-z0-9-]+\/(?:header|hero|axo|overlays|icons))|(?:library\/[a-z0-9_-]+))\/[a-z0-9-]+\.svg(?:\?v=\d+)?$/.test(
    value
  );
}
