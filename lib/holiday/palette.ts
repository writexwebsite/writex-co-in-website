import sharp from "sharp";
import type {
  HolidayExtractedPalette,
  HolidayPalette,
  HolidayPaletteMatchMode
} from "./types";

type Rgb = { r: number; g: number; b: number };

const WRITEX_VIOLET = "#5B21B6";
const WRITEX_PINK = "#E83B73";
const WRITEX_ORANGE = "#F05A28";
const WRITEX_SURFACE = "#F7F8FF";
const DARK_TEXT = "#111827";
const LIGHT_TEXT = "#FFFFFF";

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((value) => clamp(value).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function hexToRgb(value: string): Rgb {
  const safe = value.replace("#", "");
  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16)
  };
}

function mix(first: string, second: string, firstWeight: number) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const weight = Math.max(0, Math.min(1, firstWeight));
  return rgbToHex({
    r: a.r * weight + b.r * (1 - weight),
    g: a.g * weight + b.g * (1 - weight),
    b: a.b * weight + b.b * (1 - weight)
  });
}

function linearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * linearChannel(r) +
    0.7152 * linearChannel(g) +
    0.0722 * linearChannel(b)
  );
}

export function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function safeTextColour(background: string) {
  return contrastRatio(background, DARK_TEXT) >=
    contrastRatio(background, LIGHT_TEXT)
    ? DARK_TEXT
    : LIGHT_TEXT;
}

function saturation({ r, g, b }: Rgb) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const lightness = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * lightness - 1));
}

function colourDistance(first: string, second: string) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
      Math.pow(a.g - b.g, 2) +
      Math.pow(a.b - b.b, 2)
  );
}

function isLikelySkinTone({ r, g, b }: Rgb) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    max - min > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b
  );
}

function completeExtractedPalette({
  primary,
  secondary,
  accent
}: {
  primary: string;
  secondary: string;
  accent: string;
}): HolidayExtractedPalette {
  const backgroundTint = mix(primary, LIGHT_TEXT, 0.09);
  const surfaceTint = mix(secondary, LIGHT_TEXT, 0.055);
  const borderHighlight = mix(primary, LIGHT_TEXT, 0.42);
  const cta = contrastRatio(accent, LIGHT_TEXT) >= 4.5 ? accent : primary;
  const textOnPrimary = safeTextColour(primary);
  const textOnSurface = safeTextColour(surfaceTint);
  const primaryTextRatio = contrastRatio(primary, textOnPrimary);
  const ctaTextRatio = contrastRatio(cta, safeTextColour(cta));
  const surfaceTextRatio = contrastRatio(surfaceTint, textOnSurface);
  return {
    primary,
    secondary,
    accent,
    backgroundTint,
    surfaceTint,
    borderHighlight,
    cta,
    decorativeHighlights: [secondary, accent],
    textOnPrimary,
    textOnSurface,
    contrast: {
      primaryTextRatio,
      ctaTextRatio,
      surfaceTextRatio,
      passes:
        primaryTextRatio >= 4.5 &&
        ctaTextRatio >= 4.5 &&
        surfaceTextRatio >= 4.5
    },
    detectedAt: new Date().toISOString()
  };
}

export function safeNeutralExtractedPalette() {
  return completeExtractedPalette({
    primary: WRITEX_VIOLET,
    secondary: WRITEX_PINK,
    accent: WRITEX_ORANGE
  });
}

export async function extractHolidayPalette(
  buffer: Buffer
): Promise<HolidayExtractedPalette> {
  const { data, info } = await sharp(buffer, { failOn: "error" })
    .rotate()
    .resize(144, 144, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3"
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<
    string,
    { count: number; saturationTotal: number }
  >();
  let acceptedPixels = 0;

  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = data[index + 3];
    if (alpha < 190) continue;
    const rgb = {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2]
    };
    const luminance = relativeLuminance(rgbToHex(rgb));
    if (
      luminance > 0.94 ||
      luminance < 0.045 ||
      isLikelySkinTone(rgb)
    ) {
      continue;
    }

    const quantized = {
      r: Math.round(rgb.r / 24) * 24,
      g: Math.round(rgb.g / 24) * 24,
      b: Math.round(rgb.b / 24) * 24
    };
    const key = rgbToHex(quantized);
    const current = buckets.get(key) || { count: 0, saturationTotal: 0 };
    current.count += 1;
    current.saturationTotal += saturation(rgb);
    buckets.set(key, current);
    acceptedPixels += 1;
  }

  const minimumCount = Math.max(4, Math.floor(acceptedPixels * 0.0025));
  const ranked = [...buckets.entries()]
    .filter(([, value]) => value.count >= minimumCount)
    .map(([hex, value]) => ({
      hex,
      count: value.count,
      saturation: value.saturationTotal / value.count,
      score:
        value.count * (0.45 + value.saturationTotal / value.count)
    }))
    .sort((first, second) => second.score - first.score);

  if (ranked.length < 2) {
    throw new Error("The image does not contain enough usable colour data.");
  }

  const primary = ranked[0].hex;
  const secondary =
    ranked.find((candidate) => colourDistance(candidate.hex, primary) >= 78)
      ?.hex || ranked[1].hex;
  const accent =
    [...ranked]
      .filter(
        (candidate) =>
          colourDistance(candidate.hex, primary) >= 55 &&
          colourDistance(candidate.hex, secondary) >= 38
      )
      .sort(
        (first, second) =>
          second.saturation * Math.log2(second.count + 2) -
          first.saturation * Math.log2(first.count + 2)
      )[0]?.hex || secondary;

  return completeExtractedPalette({ primary, secondary, accent });
}

export function toApprovedHolidayPalette(
  detected: HolidayExtractedPalette,
  mode: HolidayPaletteMatchMode
): HolidayPalette {
  if (mode === "minimal_accent") {
    const accent = mix(detected.primary, WRITEX_VIOLET, 0.56);
    return {
      accent,
      accentSoft: "#F4F1FF",
      accentWarm: mix(detected.accent, WRITEX_ORANGE, 0.42),
      textOnAccent: safeTextColour(accent),
      surfaceTint: WRITEX_SURFACE,
      secondary: detected.secondary,
      backgroundTint: WRITEX_SURFACE,
      borderHighlight: detected.borderHighlight,
      ctaAccent: accent,
      decorativeHighlights: detected.decorativeHighlights
    };
  }

  if (mode === "balanced_writex") {
    const accent = mix(detected.primary, WRITEX_VIOLET, 0.62);
    const accentWarm = mix(detected.accent, WRITEX_PINK, 0.56);
    return {
      accent,
      accentSoft: mix(detected.backgroundTint, "#F4F1FF", 0.58),
      accentWarm,
      textOnAccent: safeTextColour(accent),
      surfaceTint: mix(detected.surfaceTint, WRITEX_SURFACE, 0.52),
      secondary: mix(detected.secondary, WRITEX_PINK, 0.58),
      backgroundTint: mix(detected.backgroundTint, WRITEX_SURFACE, 0.52),
      borderHighlight: mix(detected.borderHighlight, WRITEX_VIOLET, 0.72),
      ctaAccent: mix(detected.cta, WRITEX_PINK, 0.64),
      decorativeHighlights: detected.decorativeHighlights
    };
  }

  return {
    accent: detected.primary,
    accentSoft: detected.backgroundTint,
    accentWarm: detected.accent,
    textOnAccent: detected.textOnPrimary,
    surfaceTint: detected.surfaceTint,
    secondary: detected.secondary,
    backgroundTint: detected.backgroundTint,
    borderHighlight: detected.borderHighlight,
    ctaAccent: detected.cta,
    decorativeHighlights: detected.decorativeHighlights
  };
}
