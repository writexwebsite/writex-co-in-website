import type {
  HolidayLoginCompositionConfig,
  HolidayLoginCropArea,
  HolidayLoginHeroBreakpoint,
  HolidayLoginHeroCrop
} from "./types";

export const LOGIN_HERO_VARIANTS: Record<
  HolidayLoginHeroBreakpoint,
  { ratio: number; label: string; defaultWidth: number }
> = {
  desktopWide: {
    ratio: 16 / 10,
    label: "Desktop wide 16:10",
    defaultWidth: 1920
  },
  desktopSplit: {
    ratio: 4 / 5,
    label: "Desktop split 4:5",
    defaultWidth: 1280
  },
  tablet: {
    ratio: 4 / 3,
    label: "Tablet 4:3",
    defaultWidth: 960
  },
  mobileBanner: {
    ratio: 16 / 9,
    label: "Mobile banner 16:9",
    defaultWidth: 768
  },
  mobilePortrait: {
    ratio: 4 / 5,
    label: "Mobile portrait 4:5",
    defaultWidth: 768
  }
};

export const LOGIN_HERO_ASPECT_RATIO_FAMILIES = [
  "16:10",
  "3:2",
  "4:5",
  "3:4",
  "4:3",
  "1:1",
  "16:9"
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedArea(
  area: HolidayLoginCropArea,
  sourceWidth: number,
  sourceHeight: number
) {
  const x = clamp(area.x, 0, 100);
  const y = clamp(area.y, 0, 100);
  const width = clamp(area.width, 1, 100 - x);
  const height = clamp(area.height, 1, 100 - y);
  return {
    left: (x / 100) * sourceWidth,
    top: (y / 100) * sourceHeight,
    width: (width / 100) * sourceWidth,
    height: (height / 100) * sourceHeight
  };
}

function approvedSourceArea({
  crop,
  sourceWidth,
  sourceHeight,
  excludeEmbeddedForm
}: {
  crop: HolidayLoginHeroCrop;
  sourceWidth: number;
  sourceHeight: number;
  excludeEmbeddedForm: boolean;
}) {
  const requested = normalizedArea(crop.cropRect, sourceWidth, sourceHeight);
  if (!excludeEmbeddedForm) return requested;

  const excluded = normalizedArea(
    crop.excludedEmbeddedFormArea,
    sourceWidth,
    sourceHeight
  );
  const excludedOnRight =
    excluded.left >= requested.left + requested.width / 2;
  if (!excludedOnRight) return requested;

  const safeRight = Math.min(
    requested.left + requested.width,
    excluded.left
  );
  return {
    ...requested,
    width: Math.max(1, safeRight - requested.left)
  };
}

export function resolveLoginHeroCrop({
  config,
  breakpoint,
  sourceWidth,
  sourceHeight
}: {
  config: HolidayLoginCompositionConfig;
  breakpoint: HolidayLoginHeroBreakpoint;
  sourceWidth: number;
  sourceHeight: number;
}) {
  const crop = config.hero.crops[breakpoint];
  const targetRatio = LOGIN_HERO_VARIANTS[breakpoint].ratio;
  const source = approvedSourceArea({
    crop,
    sourceWidth,
    sourceHeight,
    excludeEmbeddedForm:
      config.hero.embeddedUiState === "contains_embedded_ui" &&
      config.hero.safeCropApproved
  });

  if (config.hero.fitMode === "fit_entire_artwork") {
    return {
      fit: "contain" as const,
      source,
      targetRatio
    };
  }

  if (config.hero.fitMode === "custom_crop") {
    return {
      fit: "cover" as const,
      source,
      targetRatio
    };
  }

  const sourceRatio = source.width / source.height;
  let width = source.width;
  let height = source.height;
  if (sourceRatio > targetRatio) {
    width = height * targetRatio;
  } else {
    height = width / targetRatio;
  }

  const zoom =
    config.hero.fitMode === "fill_panel"
      ? 1
      : clamp(crop.zoom, 1, 2.5);
  width = Math.max(1, width / zoom);
  height = Math.max(1, height / zoom);

  const focalX = (clamp(crop.focalX, 0, 100) / 100) * sourceWidth;
  const focalY = (clamp(crop.focalY, 0, 100) / 100) * sourceHeight;
  const left = clamp(
    focalX - width / 2,
    source.left,
    source.left + source.width - width
  );
  const top = clamp(
    focalY - height / 2,
    source.top,
    source.top + source.height - height
  );

  return {
    fit: "cover" as const,
    source: { left, top, width, height },
    targetRatio
  };
}

export function loginHeroVariantFromRequest(value: string | null) {
  if (!value) return null;
  return Object.prototype.hasOwnProperty.call(LOGIN_HERO_VARIANTS, value)
    ? (value as HolidayLoginHeroBreakpoint)
    : null;
}

export function safeLoginHeroOutputWidth(
  value: string | null,
  breakpoint: HolidayLoginHeroBreakpoint
) {
  const requested = Number(value);
  if (!Number.isFinite(requested)) {
    return LOGIN_HERO_VARIANTS[breakpoint].defaultWidth;
  }
  return Math.round(clamp(requested, 480, 3840));
}
