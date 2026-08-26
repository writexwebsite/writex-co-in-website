"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import {
  getBuiltInFestivalAssetPack,
  type BuiltInFestivalAssetPack
} from "@/lib/holiday/built-in-assets";
import type {
  HolidayAnimationIntensity,
  HolidayHeaderOrnamentDensity,
  HolidayMotionLevel
} from "@/lib/holiday/types";

type SceneProps = {
  festivalSlug: string;
  motion: HolidayMotionLevel;
  density: HolidayHeaderOrnamentDensity;
  animationEnabled: boolean;
};

type AssetRole = "headerScene" | "heroAccent" | "axoOutfit" | "loginOverlay" | "icon";

export function FestivalAssetRenderer({
  pack,
  role,
  className,
  sizes = "100vw",
  fill = true,
  width,
  height
}: {
  pack: BuiltInFestivalAssetPack;
  role: AssetRole;
  className: string;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}) {
  const source = pack[role];
  if (fill) {
    return (
      <Image
        aria-hidden
        src={source}
        alt=""
        fill
        unoptimized
        sizes={sizes}
        className={className}
      />
    );
  }
  return (
    <Image
      aria-hidden
      src={source}
      alt=""
      width={width || 160}
      height={height || 160}
      unoptimized
      sizes={sizes}
      className={className}
    />
  );
}

export function GarlandStrip({ pack }: { pack: BuiltInFestivalAssetPack }) {
  return (
    <FestivalAssetRenderer
      pack={pack}
      role="headerScene"
      className="wx-built-in-festival-header-art object-cover object-top"
    />
  );
}

export function StreamerRibbon() {
  return <span aria-hidden className="wx-built-in-streamer-ribbon" />;
}

function ParticleLayer({
  kind,
  count
}: {
  kind: "confetti" | "colour" | "sparkle";
  count: number;
}) {
  return (
    <span
      aria-hidden
      className="wx-built-in-particle-layer"
      data-kind={kind}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          style={
            {
              "--wx-built-in-index": index,
              left: `${4 + ((index * 19) % 92)}%`,
              top: `${8 + ((index * 23) % 68)}%`
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function FloatingConfettiLayer({ count = 8 }: { count?: number }) {
  return <ParticleLayer kind="confetti" count={count} />;
}

export function FloatingColourBurstLayer({ count = 7 }: { count?: number }) {
  return (
    <span aria-hidden className="wx-built-in-holi-effect">
      <ParticleLayer kind="colour" count={count} />
      <span className="wx-built-in-holi-spray" />
    </span>
  );
}

export function LightString() {
  return (
    <span aria-hidden className="wx-built-in-light-string">
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          style={{ "--wx-built-in-index": index } as CSSProperties}
        />
      ))}
    </span>
  );
}

export function ReindeerRunAnimation() {
  return (
    <span aria-hidden className="wx-built-in-reindeer-run">
      <Image
        src="/festival-assets/christmas/header/reindeer.svg"
        alt=""
        width={240}
        height={140}
        unoptimized
        className="wx-built-in-reindeer"
      />
      <Image
        src="/festival-assets/christmas/header/gift.svg"
        alt=""
        width={120}
        height={120}
        unoptimized
        className="wx-built-in-reindeer-gift"
      />
    </span>
  );
}

export function FestivalHeaderScene({
  festivalSlug,
  motion,
  density,
  animationEnabled
}: SceneProps) {
  const pack = getBuiltInFestivalAssetPack(festivalSlug);
  const effectCount = density === "rich" ? 11 : density === "balanced" ? 8 : 5;
  return (
    <div
      aria-hidden
      className="wx-built-in-festival-header-scene pointer-events-none absolute inset-0"
      data-festival={pack.slug}
      data-effect={pack.effect}
      data-motion={motion}
      data-animation={animationEnabled ? "on" : "off"}
      data-density={density}
    >
      <GarlandStrip pack={pack} />
      {pack.effect === "christmas_reindeer" ? (
        <>
          <LightString />
          <ReindeerRunAnimation />
        </>
      ) : null}
      {pack.effect === "holi_spray" ? (
        <FloatingColourBurstLayer count={effectCount} />
      ) : null}
      {pack.effect === "diwali_lights" ? (
        <>
          <LightString />
          <ParticleLayer kind="sparkle" count={effectCount} />
        </>
      ) : null}
      {pack.effect === "eid_lanterns" ? <LightString /> : null}
      {pack.effect === "national_ribbon" ? <StreamerRibbon /> : null}
      {pack.effect === "confetti" ? (
        <FloatingConfettiLayer count={effectCount} />
      ) : null}
    </div>
  );
}

export function FestivalHeroAccentLayer({
  festivalSlug,
  intensity
}: {
  festivalSlug: string;
  intensity: HolidayAnimationIntensity;
}) {
  const pack = getBuiltInFestivalAssetPack(festivalSlug);
  return (
    <div
      aria-hidden
      className="wx-built-in-festival-hero pointer-events-none absolute inset-x-0 top-[var(--wx-header-height)] z-[1] overflow-hidden"
      data-intensity={intensity}
      data-festival={pack.slug}
    >
      <FestivalAssetRenderer
        pack={pack}
        role="heroAccent"
        fill={false}
        width={640}
        height={640}
        sizes="(max-width: 767px) 240px, 640px"
        className="wx-built-in-festival-hero-art"
      />
    </div>
  );
}

export function AxoFestivalOutfit({
  festivalSlug
}: {
  festivalSlug: string;
}) {
  const pack = getBuiltInFestivalAssetPack(festivalSlug);
  return (
    <FestivalAssetRenderer
      pack={pack}
      role="axoOutfit"
      className="pointer-events-none z-20 object-contain"
      sizes="96px"
    />
  );
}

export function FestivalLoginAssetLayer({
  festivalSlug
}: {
  festivalSlug: string;
}) {
  const pack = getBuiltInFestivalAssetPack(festivalSlug);
  return (
    <div
      aria-hidden
      className="wx-built-in-festival-login pointer-events-none absolute inset-0 z-[3] overflow-hidden"
      data-festival={pack.slug}
    >
      <FestivalAssetRenderer
        pack={pack}
        role="loginOverlay"
        className="object-cover"
      />
    </div>
  );
}
