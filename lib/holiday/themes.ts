import { resolveExperiencePack } from "./packs";
import type {
  HolidayAnimationLevel,
  HolidayExperienceLevel,
  HolidayExperiencePackConfig,
  HolidayPalette,
  HolidayThemeCategory,
  HolidayThemeScope
} from "./types";

export type BuiltInHolidayTheme = {
  slug: string;
  name: string;
  festivalType: HolidayThemeCategory;
  description: string;
  palette: HolidayPalette;
  motif: string;
  axoAccessory: string;
  experienceLevel: HolidayExperienceLevel;
  animationLevel: HolidayAnimationLevel;
  experienceConfig: HolidayExperiencePackConfig;
  scope: HolidayThemeScope;
  announcement: string | null;
};

const palettes = {
  writex: {
    accent: "#5516F2",
    accentSoft: "#EEE7FF",
    accentWarm: "#E83874",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#F8F6FF"
  },
  national: {
    accent: "#0A6A3A",
    accentSoft: "#E8F6EE",
    accentWarm: "#E87516",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#FFFDF8"
  },
  warm: {
    accent: "#7C2DCC",
    accentSoft: "#F2D9FF",
    accentWarm: "#D97706",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#FFF8E8"
  },
  colour: {
    accent: "#7C3AED",
    accentSoft: "#EDE9FE",
    accentWarm: "#EC4899",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#F7F5FF"
  },
  redGold: {
    accent: "#B42334",
    accentSoft: "#FCE7EA",
    accentWarm: "#C58A20",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#FFF8F5"
  },
  greenGold: {
    accent: "#087A55",
    accentSoft: "#DDF7ED",
    accentWarm: "#B48B2A",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#F4FBF8"
  },
  blueGold: {
    accent: "#1947A3",
    accentSoft: "#E8F0FF",
    accentWarm: "#B48B2A",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#F6F9FF"
  },
  rose: {
    accent: "#BE185D",
    accentSoft: "#FCE7F3",
    accentWarm: "#F97316",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#FFF7FB"
  },
  winter: {
    accent: "#B91C1C",
    accentSoft: "#FEE2E2",
    accentWarm: "#B68A2C",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#F4FAF6"
  },
  calm: {
    accent: "#3949AB",
    accentSoft: "#E8EAFB",
    accentWarm: "#7C3AED",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#F7F8FF"
  }
} satisfies Record<string, HolidayPalette>;

type PaletteName = keyof typeof palettes;
type StarterSpec = {
  slug: string;
  name: string;
  festivalType: Exclude<HolidayThemeCategory, "system_default">;
  palette?: PaletteName;
  motif?: string;
  axoAccessory?: string;
  announcement?: string | null;
  description?: string;
  experienceLevel?: HolidayExperienceLevel;
  scope?: HolidayThemeScope;
};

function starter(spec: StarterSpec): BuiltInHolidayTheme {
  const experienceConfig = resolveExperiencePack(spec.slug, null);
  const animationLevel: HolidayAnimationLevel = experienceConfig.animationEnabled
    ? experienceConfig.animationIntensity === "low"
      ? "subtle"
      : "standard"
    : "none";
  return {
    slug: spec.slug,
    name: spec.name,
    festivalType: spec.festivalType,
    description:
      spec.description ||
      `A reviewed ${spec.name} experience pack using reusable WriteX visual, motion and fallback presets.`,
    palette: palettes[spec.palette || "writex"],
    motif: spec.motif || experienceConfig.headerPreset,
    axoAccessory: spec.axoAccessory || "festive",
    experienceLevel: spec.experienceLevel || "standard",
    animationLevel,
    experienceConfig,
    scope: spec.scope || "entire_public",
    announcement:
      spec.announcement === undefined
        ? `WriteX marks ${spec.name} with a respectful, accessible experience.`
        : spec.announcement
  };
}

const national: StarterSpec[] = [
  ["republic-day", "Republic Day"],
  ["independence-day", "Independence Day"],
  ["gandhi-jayanti", "Gandhi Jayanti"],
  ["netaji-jayanti", "Netaji Jayanti"],
  ["constitution-day", "Constitution Day"],
  ["armed-forces-flag-day", "Armed Forces Flag Day"]
].map(([slug, name]) => ({
  slug,
  name,
  festivalType: "national_holiday",
  palette: "national",
  motif: "tricolour-ribbon",
  axoAccessory: "tricolour",
  announcement: `Honouring ${name} with dignity and respect.`
}));

const hinduAndCultural: StarterSpec[] = [
  ["makar-sankranti", "Makar Sankranti", "greenGold", "harvest"],
  ["pongal", "Pongal", "greenGold", "harvest"],
  ["basant-panchami", "Basant Panchami", "warm", "floral"],
  ["saraswati-puja", "Saraswati Puja", "warm", "floral"],
  ["maha-shivratri", "Maha Shivratri", "calm", "stars"],
  ["holi", "Holi", "colour", "colour-powder"],
  ["ram-navami", "Ram Navami", "warm", "floral"],
  ["hanuman-jayanti", "Hanuman Jayanti", "warm", "floral"],
  ["akshaya-tritiya", "Akshaya Tritiya", "warm", "floral"],
  ["janmashtami", "Janmashtami", "blueGold", "peacock-feather"],
  ["raksha-bandhan", "Raksha Bandhan", "rose", "thread"],
  ["ganesh-chaturthi", "Ganesh Chaturthi", "redGold", "floral"],
  ["onam", "Onam", "greenGold", "pookalam"],
  ["vishwakarma-puja", "Vishwakarma Puja", "warm", "harvest"],
  ["navratri", "Navratri", "redGold", "floral"],
  ["dussehra", "Dussehra", "warm", "diya-lights"],
  ["durga-puja", "Durga Puja", "redGold", "alpana"],
  ["lakshmi-puja", "Lakshmi Puja", "warm", "floral"],
  ["kali-puja", "Kali Puja", "redGold", "diya-lights"],
  ["diwali", "Diwali", "warm", "diya-lights"],
  ["govardhan-puja", "Govardhan Puja", "greenGold", "floral"],
  ["bhai-dooj", "Bhai Dooj", "rose", "thread"],
  ["chhath-puja", "Chhath Puja", "warm", "sun-lines"]
].map(([slug, name, palette, motif]) => ({
  slug,
  name,
  festivalType: "religious_festival",
  palette: palette as PaletteName,
  motif,
  axoAccessory:
    slug === "holi" ? "colour" : slug === "diwali" ? "diya" : "festive"
}));

const islamic: StarterSpec[] = [
  ["ramadan", "Ramadan"],
  ["eid-al-fitr", "Eid al-Fitr"],
  ["eid-al-adha", "Eid al-Adha"],
  ["islamic-new-year", "Islamic New Year"],
  ["milad-un-nabi", "Milad-un-Nabi"],
  ["shab-e-barat", "Shab-e-Barat"],
  ["muharram", "Muharram"]
].map(([slug, name]) => ({
  slug,
  name,
  festivalType: "religious_festival",
  palette: "greenGold",
  motif: "lantern-stars",
  axoAccessory: "crescent"
}));

const christian: StarterSpec[] = [
  ["good-friday", "Good Friday"],
  ["easter", "Easter"],
  ["christmas", "Christmas"],
  ["new-years-eve", "New Year's Eve"]
].map(([slug, name]) => ({
  slug,
  name,
  festivalType: "religious_festival",
  palette: slug === "christmas" ? "winter" : "colour",
  motif: slug === "christmas" ? "festive-lights" : "soft-stars",
  axoAccessory: slug === "christmas" ? "winter" : "festive"
}));

const sikh: StarterSpec[] = [
  ["gurpurab", "Gurpurab"],
  ["baisakhi", "Baisakhi"]
].map(([slug, name]) => ({
  slug,
  name,
  festivalType: "religious_festival",
  palette: "blueGold",
  motif: slug === "baisakhi" ? "harvest" : "floral",
  axoAccessory: "festive"
}));

const buddhistAndJain: StarterSpec[] = [
  ["buddha-purnima", "Buddha Purnima"],
  ["mahavir-jayanti", "Mahavir Jayanti"],
  ["paryushan", "Paryushan"]
].map(([slug, name]) => ({
  slug,
  name,
  festivalType: "religious_festival",
  palette: "warm",
  motif: "lotus",
  axoAccessory: "festive"
}));

const regional: StarterSpec[] = [
  ["poila-boishakh", "Poila Boishakh", "redGold", "alpana"],
  ["gudi-padwa", "Gudi Padwa", "warm", "floral"],
  ["ugadi", "Ugadi", "greenGold", "floral"],
  ["bihu", "Bihu", "greenGold", "harvest"],
  ["lohri", "Lohri", "warm", "harvest"],
  ["kerala-piravi", "Kerala Piravi", "greenGold", "floral"],
  ["tamil-new-year", "Tamil New Year", "warm", "harvest"],
  ["bengali-new-year", "Bengali New Year", "redGold", "alpana"]
].map(([slug, name, palette, motif]) => ({
  slug,
  name,
  festivalType: "cultural_festival",
  palette: palette as PaletteName,
  motif,
  axoAccessory: "festive"
}));

const global: StarterSpec[] = [
  ["new-year", "New Year", "calm", "soft-stars"],
  ["valentines-day", "Valentine's Day", "rose", "floral"],
  ["halloween", "Halloween", "redGold", "lantern-stars"],
  ["womens-day", "International Women's Day", "rose", "spectrum-lines"],
  ["world-environment-day", "World Environment Day", "greenGold", "leaves"],
  ["international-yoga-day", "International Yoga Day", "calm", "spectrum-lines"],
  ["teachers-day", "Teachers' Day", "calm", "academic-lines"],
  ["childrens-day", "Children's Day", "colour", "colour-dots"],
  ["labour-day", "Labour Day", "blueGold", "campaign-bars"],
  ["earth-day", "Earth Day", "greenGold", "leaves"],
  ["world-health-day", "World Health Day", "blueGold", "spectrum-lines"]
].map(([slug, name, palette, motif]) => ({
  slug,
  name,
  festivalType:
    slug === "childrens-day" ? "national_holiday" : "global_observance",
  palette: palette as PaletteName,
  motif,
  axoAccessory: slug === "teachers-day" ? "academic" : "celebration",
  experienceLevel: slug === "international-yoga-day" ? "accent_only" : "standard"
}));

const businessEvents: StarterSpec[] = [
  ["company-anniversary", "Company Anniversary", "company_event"],
  ["founders-day", "Founder's Day", "internal_milestone"],
  ["recruitment-drive", "Recruitment Drive", "recruitment_campaign"],
  ["annual-report-season", "Annual Report Season", "business_season"],
  ["financial-year-end", "Financial Year End", "business_season"],
  ["admission-season", "Admission Season", "business_season"],
  ["results-season", "Results Season", "business_season"],
  ["customer-appreciation-week", "Customer Appreciation Week", "company_event"],
  ["trust-safety-campaign", "Trust and Safety Campaign", "company_event"],
  ["corporate-reporting-campaign", "Corporate Reporting Campaign", "business_season"],
  ["custom-event", "Custom Event", "custom_one_time_event"]
].map(([slug, name, festivalType]) => ({
  slug,
  name,
  festivalType: festivalType as Exclude<
    HolidayThemeCategory,
    "system_default"
  >,
  palette: "writex",
  motif: slug === "recruitment-drive" ? "campaign-bars" : "spectrum-lines",
  axoAccessory: slug === "recruitment-drive" ? "career" : "celebration",
  announcement:
    slug === "recruitment-drive"
      ? "Explore current opportunities with WriteX."
      : `WriteX marks ${name}.`
}));

const defaultTheme: BuiltInHolidayTheme = {
  slug: "default",
  name: "Default WriteX",
  festivalType: "system_default",
  description: "The approved standard WriteX visual experience.",
  palette: palettes.writex,
  motif: "none",
  axoAccessory: "default",
  experienceLevel: "accent_only",
  animationLevel: "none",
  experienceConfig: resolveExperiencePack("default", null),
  scope: "entire_public",
  announcement: null
};

export const BUILT_IN_HOLIDAY_THEMES: BuiltInHolidayTheme[] = [
  ...national,
  ...hinduAndCultural,
  ...islamic,
  ...christian,
  ...sikh,
  ...buddhistAndJain,
  ...regional,
  ...global,
  ...businessEvents,
  defaultTheme
].map(starterFromDefinition);

function starterFromDefinition(
  value: BuiltInHolidayTheme | StarterSpec
): BuiltInHolidayTheme {
  return "experienceConfig" in value ? value : starter(value);
}

export const DEFAULT_HOLIDAY_THEME_SLUG = "default";
