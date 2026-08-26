"use client";

import type {
  HolidayHeaderOrnamentConfig,
  HolidayStudioMotion,
  HolidayStudioVisibility
} from "@/lib/holiday/types";
import { FestivalHeaderScene } from "./FestivalAssetRenderer";
import { FestivalHeaderOrnamentLayer } from "./FestivalHeaderOrnaments";

const ASHOKA_CHAKRA_SPOKE_COUNT = 24;
const TRICOLOUR_RIBBON_PATTERN = /\/tricolour-ribbon\.svg(?:\?.*)?$/;
const TRICOLOUR_RIBBON_CLEAN_PATH =
  "/festival-assets/library/national_cultural/tricolour-ribbon-clean-v3.svg";

export const FESTIVAL_HEADER_TIERS = [
  "baseline",
  "enhanced",
  "festival_full"
] as const;

export type FestivalHeaderTier = (typeof FESTIVAL_HEADER_TIERS)[number];

export function festivalHeaderTier(
  festivalSlug: string,
  density: HolidayHeaderOrnamentConfig["density"]
): FestivalHeaderTier {
  if (festivalSlug !== "independence-day") return "baseline";
  if (density === "rich") return "festival_full";
  if (density === "balanced") return "enhanced";
  return "baseline";
}

function AshokaChakra() {
  return (
    <span className="wx-festival-ashoka-chakra absolute" data-spokes={ASHOKA_CHAKRA_SPOKE_COUNT}>
      <svg viewBox="0 0 64 64" preserveAspectRatio="xMidYMid meet" focusable="false">
        <circle cx="32" cy="32" r="27" fill="#f7f5ed" stroke="#000080" strokeWidth="3" />
        {Array.from({ length: ASHOKA_CHAKRA_SPOKE_COUNT }, (_, index) => (
          <line
            key={index}
            x1="32"
            y1="32"
            x2="32"
            y2="7"
            stroke="#000080"
            strokeWidth="1.35"
            transform={`rotate(${index * 15} 32 32)`}
          />
        ))}
        <circle cx="32" cy="32" r="3.25" fill="#000080" />
      </svg>
    </span>
  );
}

function connectedSegmentFrame(index: number, count: number) {
  const safeCount = Math.max(1, count);
  return {
    x: (index / safeCount) * 100,
    width: 100 / safeCount
  };
}

export function FestivalHeaderRail({
  festivalSlug,
  config,
  assets = {},
  studioAssets = [],
  compact = false,
  previewDevice,
  tierOverride = null
}: {
  festivalSlug: string;
  config: HolidayHeaderOrnamentConfig;
  assets?: Record<string, string>;
  studioAssets?: Array<{
    id: string;
    path: string;
    size: "small" | "medium" | "large";
    motion: HolidayStudioMotion;
    visibility: HolidayStudioVisibility;
    decorationPackId: string | null;
    decorationType: string | null;
    componentSlot: string | null;
  }>;
  compact?: boolean;
  previewDevice?: "desktop" | "tablet" | "mobile";
  tierOverride?: FestivalHeaderTier | null;
}) {
  const hasStudioAssets = studioAssets.length > 0;
  const hasTricolourRibbon = studioAssets.some((asset) =>
    TRICOLOUR_RIBBON_PATTERN.test(asset.path)
  );
  const showAshokaChakra =
    hasTricolourRibbon &&
    (festivalSlug === "independence-day" || festivalSlug === "republic-day");
  const connectedMotion = studioAssets.find((asset) => asset.motion !== "static")?.motion || "static";
  const responsiveCompositions = [
    {
      viewport: "desktop",
      assets: studioAssets.filter((asset) => asset.visibility.desktop)
    },
    {
      viewport: "tablet",
      assets: studioAssets.filter((asset) => asset.visibility.tablet)
    },
    {
      viewport: "mobile",
      assets: studioAssets.filter((asset) => asset.visibility.mobile)
    }
  ] as const;
  const legacyRailEnabled =
    config.enabled && config.railEnabled && config.mode !== "none";
  const headerTier = tierOverride || festivalHeaderTier(festivalSlug, config.density);
  if (!legacyRailEnabled && !hasStudioAssets) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="wx-festival-decoration-rail pointer-events-none relative"
      data-festival={festivalSlug}
      data-header-tier={headerTier}
      data-header-tier-source={tierOverride ? "private_preview" : "density"}
      data-compact={compact ? "true" : "false"}
      data-density={config.density}
      data-horizontal-placement={config.horizontalPlacement}
      data-vertical-placement={config.verticalPlacement}
      data-length-preset={config.hangingLengthPreset}
      data-preview-device={previewDevice}
    >
      <div className="wx-festival-decoration-rail-stage absolute inset-x-0">
        {hasStudioAssets ? (
          <div className="wx-festival-studio-header-assets absolute inset-0">
            <span
              className="wx-festival-studio-header-asset relative block"
              data-size="large"
              data-motion={connectedMotion}
              data-desktop="true"
              data-tablet="true"
              data-mobile="true"
              data-decoration-pack={studioAssets[0]?.decorationPackId || undefined}
              data-decoration-type={studioAssets[0]?.decorationType || undefined}
              data-pack-slot="full_width"
              data-connected-canvas="true"
            >
              <svg
                className="wx-festival-header-pack-connected absolute inset-0"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                focusable="false"
              >
                {responsiveCompositions.map((composition) => (
                  <g
                    key={composition.viewport}
                    data-festival-header-viewport={composition.viewport}
                  >
                    {composition.assets.map((asset, index) => {
                      const frame = connectedSegmentFrame(
                        index,
                        composition.assets.length
                      );
                      return (
                        <image
                          key={`${composition.viewport}-${asset.id}`}
                          href={
                            showAshokaChakra && TRICOLOUR_RIBBON_PATTERN.test(asset.path)
                              ? TRICOLOUR_RIBBON_CLEAN_PATH
                              : asset.path
                          }
                          x={frame.x}
                          y="0"
                          width={frame.width}
                          height="100"
                          preserveAspectRatio="none"
                        />
                      );
                    })}
                  </g>
                ))}
              </svg>
              {showAshokaChakra ? <AshokaChakra /> : null}
            </span>
          </div>
        ) : config.mode !== "uploaded_custom" ? (
          <FestivalHeaderScene
            festivalSlug={festivalSlug}
            density={config.density}
            motion={config.motionLevel}
            animationEnabled={config.animationEnabled}
          />
        ) : null}
        {hasStudioAssets ? null : (
          <FestivalHeaderOrnamentLayer config={config} assets={assets} />
        )}
      </div>
    </div>
  );
}
