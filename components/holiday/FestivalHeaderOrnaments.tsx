"use client";

import Image from "next/image";
import type { ComponentType, CSSProperties } from "react";
import type {
  HolidayHeaderOrnamentConfig,
  HolidayHeaderOrnamentItem
} from "@/lib/holiday/types";

type OrnamentVisualProps = {
  item: HolidayHeaderOrnamentItem;
  assetUrl?: string;
};

type OrnamentStyle = CSSProperties & {
  "--wx-ornament-length": string;
  "--wx-ornament-scale": number;
  "--wx-ornament-colour": string;
  "--wx-ornament-secondary": string;
  "--wx-ornament-order": number;
  "--wx-ornament-left-cluster": string;
  "--wx-ornament-centre-cluster": string;
  "--wx-ornament-right-cluster": string;
};

function CustomOrnamentAsset({
  assetUrl
}: OrnamentVisualProps) {
  if (!assetUrl) return null;
  return (
    <span className="wx-header-ornament-custom">
      <Image
        src={assetUrl}
        alt=""
        width={128}
        height={128}
        unoptimized
        sizes="96px"
      />
    </span>
  );
}

export function HangingStreamer({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-streamer">
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
    </span>
  );
}

export function HangingMedallion({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-medallion">
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
      {!assetUrl ? <span className="wx-header-ornament-medallion-core" /> : null}
    </span>
  );
}

export function HangingBell({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-bell">
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
      {!assetUrl ? <span className="wx-header-ornament-bell-clapper" /> : null}
    </span>
  );
}

export function HangingLantern({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-lantern">
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
      {!assetUrl ? <span className="wx-header-ornament-lantern-light" /> : null}
    </span>
  );
}

export function HangingFestivalIcon({
  item,
  assetUrl
}: OrnamentVisualProps) {
  return (
    <span
      className="wx-header-ornament-festival-icon"
      data-icon={item.icon || "flower"}
    >
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
      {!assetUrl ? <span className="wx-header-ornament-icon-core" /> : null}
    </span>
  );
}

export function HangingTextBadge({ item, assetUrl }: OrnamentVisualProps) {
  const languageTag =
    item.language && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(item.language)
      ? item.language
      : undefined;

  return (
    <span
      className="wx-header-ornament-text-badge"
      data-language={item.language || undefined}
      lang={languageTag}
    >
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
      {!assetUrl ? item.text : null}
    </span>
  );
}

export function GarlandBand({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-garland">
      {assetUrl ? (
        <CustomOrnamentAsset item={item} assetUrl={assetUrl} />
      ) : (
        Array.from({ length: 11 }, (_, index) => (
          <span key={index} style={{ "--wx-garland-index": index } as CSSProperties} />
        ))
      )}
    </span>
  );
}

export function CornerCluster({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-corner-cluster">
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
      {!assetUrl ? (
        <>
          <span />
          <span />
          <span />
        </>
      ) : null}
    </span>
  );
}

export function AnimatedRibbon({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-ribbon">
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
    </span>
  );
}

export function HeaderAmbientGlow({ item, assetUrl }: OrnamentVisualProps) {
  return (
    <span className="wx-header-ornament-glow">
      {assetUrl ? <CustomOrnamentAsset item={item} assetUrl={assetUrl} /> : null}
    </span>
  );
}

function OrnamentVisual(props: OrnamentVisualProps) {
  const components: Record<
    HolidayHeaderOrnamentItem["type"],
    ComponentType<OrnamentVisualProps>
  > = {
    streamer: HangingStreamer,
    medallion: HangingMedallion,
    bell: HangingBell,
    lantern: HangingLantern,
    festival_icon: HangingFestivalIcon,
    text_badge: HangingTextBadge,
    garland_band: GarlandBand,
    corner_cluster: CornerCluster,
    animated_ribbon: AnimatedRibbon,
    ambient_glow: HeaderAmbientGlow
  };
  const Component = components[props.item.type];
  return <Component {...props} />;
}

function canRenderItem({
  config,
  item,
  hasCustomAsset
}: {
  config: HolidayHeaderOrnamentConfig;
  item: HolidayHeaderOrnamentItem;
  hasCustomAsset: boolean;
}) {
  if (!item.enabled) return false;
  if (item.type === "garland_band" && !config.garlandEnabled) return false;
  if (item.type === "bell" && !config.bellsEnabled) return false;
  if (item.type === "lantern" && !config.lanternsEnabled) return false;
  if (
    ["streamer", "animated_ribbon"].includes(item.type) &&
    !config.streamersEnabled
  ) {
    return false;
  }
  if (item.type === "text_badge" && !config.textBadgeEnabled) return false;
  if (
    item.culturalAssetApproved &&
    !config.approvedCulturalArtworkEnabled
  ) {
    return false;
  }
  if (config.mode === "uploaded_custom") return hasCustomAsset;
  return true;
}

export function FestivalHeaderOrnamentLayer({
  config,
  assets = {}
}: {
  config: HolidayHeaderOrnamentConfig;
  assets?: Record<string, string>;
}) {
  if (!config.enabled || config.mode === "none") return null;

  const items = config.items
    .filter((item) =>
      canRenderItem({
        config,
        item,
        hasCustomAsset: Boolean(item.assetVariant && assets[item.assetVariant])
      })
    )
    .slice(0, config.ornamentCount);

  if (items.length === 0) return null;

  return (
    <div
      aria-hidden
      className="wx-festival-header-ornament-layer pointer-events-none absolute inset-0"
      data-density={config.density}
      data-animation={config.animationEnabled ? "on" : "off"}
      data-motion={config.motionLevel}
      data-mobile-simplified={config.mobileSimplified ? "true" : "false"}
      data-horizontal-placement={config.horizontalPlacement}
      data-length-preset={config.hangingLengthPreset}
    >
      {items.map((item, index) => {
        const customAssetUrl =
          config.mode === "festival_default" || !item.assetVariant
            ? undefined
            : assets[item.assetVariant];
        const style: OrnamentStyle = {
          "--wx-ornament-length": `${item.hangingLength}px`,
          "--wx-ornament-scale": item.scale,
          "--wx-ornament-colour": item.colour,
          "--wx-ornament-secondary": item.secondaryColour,
          "--wx-ornament-order": index,
          "--wx-ornament-left-cluster": `${7 + index * 7}%`,
          "--wx-ornament-centre-cluster": `${28 + index * 7}%`,
          "--wx-ornament-right-cluster": `${52 + index * 7}%`
        };
        return (
          <span
            key={item.id}
            className="wx-header-ornament"
            data-ornament-id={item.id}
            data-type={item.type}
            data-position={item.position}
            data-motion={item.motion}
            data-mobile-visible={item.mobileVisible ? "true" : "false"}
            style={style}
          >
            {item.type !== "garland_band" &&
            item.type !== "animated_ribbon" &&
            item.type !== "ambient_glow" ? (
              <span className="wx-header-ornament-cord" />
            ) : null}
            <span className="wx-header-ornament-visual">
              <OrnamentVisual item={item} assetUrl={customAssetUrl} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
